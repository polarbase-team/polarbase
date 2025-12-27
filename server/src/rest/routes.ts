import { Elysia, t } from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';

import pg from '../plugins/pg';
import { checkRateLimit } from '../utils/rate-limit';
import { err, json } from '../utils/api-response';
import { apiKeyAuth } from '../api-keys/auth';
import { TableService } from './services/table.service';
import { TableRecordService } from './services/table-record.service';
import { DataType } from './utils/column';
import { WhereFilter } from './utils/record';

const REST_RATE_LIMIT = Number(process.env.REST_RATE_LIMIT) || 100;
const REST_PREFIX = process.env.REST_PREFIX || '/rest';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable REST_BLACKLISTED_TABLES (comma-separated).
 */
const REST_BLACKLISTED_TABLES = (
  process.env.REST_BLACKLISTED_TABLES || ''
).split(',');

const tableService = new TableService();
const tableRecordService = new TableRecordService();

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export const restRoutes = new Elysia({ prefix: REST_PREFIX })
  .use(
    openapi({
      documentation: {
        info: {
          title: `${process.env.NAME || 'PolarBase'} Documentation`,
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              name: 'x-api-key',
              in: 'header',
              description: 'API key to authorize (ex: ak_xxx)',
            },
          },
        },
      },
      references: fromTypes(),
    })
  )

  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error();

      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.rest) {
        set.status = 403;
        throw new Error(
          'Access denied: you do not have permission to access this resource.'
        );
      }
      return authData;
    } catch (e) {
      set.status ??= 401;
      throw e ?? new Error('Invalid or missing x-api-key');
    }
  })

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, REST_RATE_LIMIT, REST_PREFIX)) {
      set.status = 429;
      return err('Too many requests', 429);
    }
  })

  /**
   * Auto-wrap successful responses with json()
   */
  .onAfterHandle(({ response, set }) => {
    if (
      response !== null &&
      typeof response === 'object' &&
      !('success' in response)
    ) {
      return json(response);
    }
    return response;
  })

  /**
   * Global error handler
   */
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;

      const firstError = error.all[0];
      if (firstError) {
        const { summary, message, path } = firstError as any;
        const msg = summary || message || `Invalid value for ${path}`;
        return err(msg);
      }

      return err('Invalid request data');
    }

    if (error instanceof Error) {
      const status = (error as any).cause ?? set.status ?? 500;
      set.status = status;

      const message =
        process.env.NODE_ENV === 'production' && status >= 500
          ? 'Internal server error'
          : error.message;

      return err(message, status);
    }

    set.status = 500;
    return err('Unknown error');
  })

  /**
   * Block access to blacklisted tables
   */
  .derive(({ params, set }) => {
    if (params?.table && REST_BLACKLISTED_TABLES.includes(params.table)) {
      set.status = 403;
      throw new Error(`Table "${params.table}" is not allowed`);
    }
  })

  /**
   * GET /rest/tables → list of allowed tables + comments
   */
  .get('/tables', async () => {
    const tables = await tableService.getAll();
    return tables.filter((t) => !REST_BLACKLISTED_TABLES.includes(t.tableName));
  })

  /**
   * GET /rest/tables/:table/schema → detailed column schema
   */
  .get(
    '/tables/:table/schema',
    async ({ params: { table }, set }) => {
      const exists = await pg.schema.hasTable(table);
      if (!exists) {
        set.status = 404;
        return err('Table not found');
      }

      return tableService.getSchema({ tableName: table });
    },
    {
      params: t.Object({ table: t.String() }),
    }
  )

  /**
   * POST /rest/tables → create new table
   */
  .post(
    '/tables',
    ({ body }) => {
      return tableService.createTable(body);
    },
    {
      body: t.Object({
        tableName: t.String(),
        tableComment: t.Optional(t.String()),
        idType: t.Optional(
          t.Union([
            t.Literal('biginteger'),
            t.Literal('integer'),
            t.Literal('uuid'),
            t.Literal('shortid'),
          ])
        ),
        timestamps: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * PATCH /rest/tables/:table → partial update of table (rename, update comment)
   */
  .patch(
    '/tables/:table',
    ({ params: { table }, body }) => {
      return tableService.updateTable({ tableName: table, data: body });
    },
    {
      body: t.Object(
        {
          tableName: t.Optional(t.String()),
          tableComment: t.Optional(t.Nullable(t.String())),
        },
        { minProperties: 1 }
      ),
    }
  )

  /**
   * DELETE /rest/tables/:table → delete table
   */
  .delete(
    '/tables/:table',
    ({ params: { table }, query: { cascade } }) => {
      return tableService.deleteTable({ tableName: table, cascade });
    },
    {
      params: t.Object({ table: t.String() }),
      query: t.Object({ cascade: t.Optional(t.Boolean()) }),
    }
  )

  /**
   * POST /rest/tables/:table → create new column
   */
  .post(
    '/tables/:table/columns',
    ({ params: { table }, body }) => {
      return tableService.createColumn({
        tableName: table,
        column: {
          name: body.name,
          dataType: body.dataType as DataType,
          nullable: body.nullable,
          unique: body.unique,
          defaultValue: body.defaultValue,
          comment: body.comment,
          options: body.options,
          validation: body.validation,
        },
      });
    },
    {
      params: t.Object({ table: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        dataType: t.String({
          enum: Object.values(DataType) as [string, ...string[]],
        }),
        nullable: t.Optional(t.Nullable(t.Boolean())),
        unique: t.Optional(t.Nullable(t.Boolean())),
        defaultValue: t.Optional(t.Nullable(t.Any())),
        comment: t.Optional(t.Nullable(t.String())),
        options: t.Optional(t.Nullable(t.Array(t.String()))),
        validation: t.Optional(
          t.Nullable(
            t.Object({
              minLength: t.Optional(t.Nullable(t.Numeric({ minimum: 0 }))),
              maxLength: t.Optional(t.Nullable(t.Numeric({ minimum: 1 }))),
              minValue: t.Optional(t.Nullable(t.Numeric())),
              maxValue: t.Optional(t.Nullable(t.Numeric())),
              minDate: t.Optional(t.Nullable(t.String())),
              maxDate: t.Optional(t.Nullable(t.String())),
              maxSize: t.Optional(t.Nullable(t.Numeric({ minimum: 0 }))),
            })
          )
        ),
      }),
    }
  )

  /**
   * PUT /rest/tables/:table/columns/:column → update column
   */
  .put(
    '/tables/:table/columns/:column',
    ({ params: { table, column }, body }) => {
      return tableService.updateColumn({
        tableName: table,
        columnName: column,
        column: {
          name: body.name,
          dataType: body.dataType as DataType,
          nullable: body.nullable,
          unique: body.unique,
          defaultValue: body.defaultValue,
          comment: body.comment,
          options: body.options,
          validation: body.validation,
        },
      });
    },
    {
      params: t.Object({ table: t.String(), column: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        dataType: t.String({
          enum: Object.values(DataType) as [string, ...string[]],
        }),
        nullable: t.Nullable(t.Boolean()),
        unique: t.Nullable(t.Boolean()),
        defaultValue: t.Nullable(t.Any()),
        comment: t.Nullable(t.String()),
        options: t.Nullable(t.Array(t.String())),
        validation: t.Nullable(
          t.Object({
            minLength: t.Optional(t.Nullable(t.Numeric({ minimum: 0 }))),
            maxLength: t.Optional(t.Nullable(t.Numeric({ minimum: 1 }))),
            minValue: t.Optional(t.Nullable(t.Numeric())),
            maxValue: t.Optional(t.Nullable(t.Numeric())),
            minDate: t.Optional(t.Nullable(t.String())),
            maxDate: t.Optional(t.Nullable(t.String())),
            maxSize: t.Optional(t.Nullable(t.Numeric({ minimum: 0 }))),
          })
        ),
      }),
    }
  )

  /**
   * DELETE /rest/tables/:table/columns/:column → delete column
   */
  .delete(
    '/tables/:table/columns/:column',
    ({ params: { table, column } }) => {
      return tableService.deleteColumn({
        tableName: table,
        columnName: column,
      });
    },
    {
      params: t.Object({ table: t.String(), column: t.String() }),
    }
  )

  /**
   * GET /rest/:table → paginated list with optional filters
   */
  .get(
    '/:table',
    ({ params: { table }, query }) => {
      const { filter, sort, ...remain } = query;
      let whereClause: WhereFilter;
      if (typeof filter === 'string') {
        try {
          whereClause = JSON.parse(filter);
        } catch (e) {
          throw new Error('Invalid JSON in filter parameter');
        }
      }

      return tableRecordService.select({
        tableName: table,
        query: { ...remain, where: whereClause!, order: sort },
      });
    },
    {
      query: t.Object({
        fields: t.Optional(t.String()),
        search: t.Optional(t.String()),
        filter: t.Optional(t.String()),
        sort: t.Optional(t.String({ pattern: '^[^:]+:(asc|desc)$' })),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })),
      }),
    }
  )

  /**
   * GET /rest/:table/:id → single record
   */
  .get(
    '/:table/:id',
    async ({ params: { table, id }, set }) => {
      const result = await tableRecordService.select({
        tableName: table,
        query: { where: { id }, limit: 1 },
      });

      if (result.rows.length === 0) {
        set.status = 404;
        return err('Record not found');
      }

      return result.rows[0];
    },
    {
      params: t.Object({
        table: t.String(),
        id: t.Union([t.String(), t.Numeric()]),
      }),
    }
  )

  /**
   * POST /rest/:table → create new record
   */
  .post(
    '/:table',
    ({ params: { table }, body }) => {
      return tableRecordService.insert({ tableName: table, records: [body] });
    },
    { body: t.Record(t.String(), t.Any()) }
  )

  /**
   * PATCH /rest/:table/:id → partial update single record
   */
  .patch(
    '/:table/:id',
    ({ params: { table, id }, body }) => {
      return tableRecordService.update({
        tableName: table,
        updates: [{ where: { id }, data: body }],
      });
    },
    {
      params: t.Object({
        table: t.String(),
        id: t.Union([t.String(), t.Numeric()]),
      }),
      body: t.Record(t.String(), t.Any(), { minProperties: 1 }),
    }
  )

  /**
   * DELETE /rest/:table/:id → delete single record
   */
  .delete(
    '/:table/:id',
    ({ params: { table, id } }) => {
      return tableRecordService.delete({
        tableName: table,
        condition: { where: { id } },
      });
    },
    {
      params: t.Object({
        table: t.String(),
        id: t.Union([t.String(), t.Numeric()]),
      }),
    }
  )

  /**
   * POST /rest/:table/bulk-create → insert many records (max 10,000)
   */
  .post(
    '/:table/bulk-create',
    ({ params: { table }, body }) => {
      return tableRecordService.insert({ tableName: table, records: body });
    },
    {
      body: t.Array(t.Record(t.String(), t.Any()), {
        minItems: 1,
        maxItems: 10000,
      }),
    }
  )

  /**
   * PATCH /rest/:table/bulk-update → update many records by ids (max 10,000)
   */
  .patch(
    '/:table/bulk-update',
    ({ params: { table }, body }) => {
      const updates: {
        where: WhereFilter;
        data: Record<string, any>;
      }[] = [];
      for (const { id, data } of body) {
        updates.push({
          where: { id },
          data,
        });
      }
      return tableRecordService.update({ tableName: table, updates });
    },
    {
      body: t.Array(
        t.Object({
          id: t.Union([t.String(), t.Numeric()]),
          data: t.Record(t.String(), t.Any(), { minProperties: 1 }),
        }),
        {
          minItems: 1,
          maxItems: 10000,
        }
      ),
    }
  )

  /**
   * POST /rest/:table/bulk-delete → delete many records by ids (max 10,000)
   */
  .post(
    '/:table/bulk-delete',
    ({ params: { table }, body }) => {
      return tableRecordService.delete({
        tableName: table,
        condition: { where: { id: { in: body.ids } } },
      });
    },
    {
      body: t.Object({
        ids: t.Array(t.Union([t.String(), t.Numeric()]), {
          minItems: 1,
          maxItems: 10000,
        }),
      }),
    }
  );
