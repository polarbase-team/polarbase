import { Elysia, t } from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';

import pg from '../plugins/pg';
import { apiKeyAuth } from '../api-keys/auth';
import { TableService } from './services/table.service';
import { TableRecordService } from './services/table-record.service';

const REST_RATE_LIMIT = parseInt(process.env.REST_RATE_LIMIT!, 10);
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
 * Simple in-memory rate limiter (per IP).
 * Allows max 300 requests per minute.
 */
const rateLimit = new Map<string, { count: number; reset: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const rec = rateLimit.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > rec.reset) rec.count = 0;
  if (rec.count >= REST_RATE_LIMIT) return false;
  rec.count++;
  rateLimit.set(ip, rec);
  return true;
};

/**
 * Standard success response format.
 */
const json = (data: any, meta?: any) => ({
  success: true,
  data,
  meta,
  timestamp: new Date().toISOString(),
});

/**
 * Standard error response format.
 */
const err = (message: string, status = 400) => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
});

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export const restRoutes = new Elysia({ prefix: REST_PREFIX })
  .use(
    openapi({
      references: fromTypes(),
    })
  )

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      set.status = 429;
      return err('Too many requests', 429);
    }
  })

  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error();
      return await apiKeyAuth(apiKey);
    } catch {
      set.status = 401;
      return { error: 'Invalid or missing x-api-key' };
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
      const status = (error as any).cause ?? 500;
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
    return await tableService.getAll();
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

      return await tableService.getSchema({ tableName: table });
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
    async ({ body }) => {
      return await tableService.createTable(body);
    },
    {
      body: t.Object({
        tableName: t.String(),
        tableComment: t.Optional(t.String()),
        columns: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              type: t.String(),
              nullable: t.Optional(t.Boolean()),
              unique: t.Optional(t.Boolean()),
              primary: t.Optional(t.Boolean()),
              enumValues: t.Optional(t.Array(t.String(), { minItems: 1 })),
              default: t.Optional(t.Any()),
              comment: t.Optional(t.String()),
            }),
            { minItems: 1 }
          )
        ),
        autoAddingPrimaryKey: t.Optional(t.Boolean()),
        timestamps: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * POST /rest/tables/:table → partial update of table (rename, update comment)
   */
  .patch(
    '/tables/:table',
    async ({ params: { table }, body }) => {
      return await tableService.updateTable({ tableName: table, data: body });
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
    async ({ params: { table }, query: { cascade } }) => {
      return await tableService.deleteTable({ tableName: table, cascade });
    },
    {
      params: t.Object({ table: t.String() }),
      query: t.Object({ cascade: t.Optional(t.Boolean()) }),
    }
  )

  /**
   * GET /rest/:table → paginated list with optional filters
   */
  .get(
    '/:table',
    async ({ params: { table }, query }) => {
      const result = await tableRecordService.getAll(table, query);
      return result;
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })),
        search: t.Optional(t.String()),
        order: t.Optional(t.String({ pattern: '^[^:]+:(asc|desc)$' })),
        where: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /rest/:table/:id → single record
   */
  .get(
    '/:table/:id',
    async ({ params: { table, id } }) => {
      return await tableRecordService.getOne(table, id);
    },
    { params: t.Object({ table: t.String(), id: t.Numeric() }) }
  )

  /**
   * POST /rest/:table → create new record
   */
  .post(
    '/:table',
    async ({ params: { table }, body }) => {
      return await tableRecordService.create(table, body);
    },
    { body: t.Record(t.String(), t.Any(), { minProperties: 1 }) }
  )

  /**
   * PATCH /rest/:table/:id → partial update single record
   */
  .patch(
    '/:table/:id',
    async ({ params: { table, id }, body }) => {
      return await tableRecordService.update(table, id, body);
    },
    {
      params: t.Object({ table: t.String(), id: t.Numeric() }),
      body: t.Record(t.String(), t.Any(), { minProperties: 1 }),
    }
  )

  /**
   * DELETE /rest/:table/:id → delete single record
   */
  .delete(
    '/:table/:id',
    async ({ params: { table, id } }) => {
      await tableRecordService.delete(table, id);
      return null;
    },
    { params: t.Object({ table: t.String(), id: t.Numeric() }) }
  )

  /**
   * POST /rest/:table/bulk-create → insert many records (max 10,000)
   */
  .post(
    '/:table/bulk-create',
    async ({ params: { table }, body }) => {
      return await tableRecordService.bulkCreate(table, body);
    },
    {
      body: t.Array(t.Record(t.String(), t.Any(), { minProperties: 1 }), {
        minItems: 1,
        maxItems: 10000,
      }),
    }
  )

  /**
   * PATCH /rest/:table/bulk-update → update many records by where clause
   */
  .patch(
    '/:table/bulk-update',
    async ({ params: { table }, body }) => {
      return await tableRecordService.bulkUpdate(table, body);
    },
    {
      body: t.Array(
        t.Object({
          where: t.Record(t.String(), t.Any(), { minProperties: 1 }),
          data: t.Record(t.String(), t.Any(), { minProperties: 1 }),
        })
      ),
    }
  )

  /**
   * POST /rest/:table/bulk-delete → delete many records (by ids or where)
   */
  .post(
    '/:table/bulk-delete',
    async ({ params: { table }, body }) => {
      return await tableRecordService.bulkDelete(table, body);
    },
    {
      body: t.Union([
        t.Object({
          ids: t.Array(t.Number(), { minItems: 1, maxItems: 10000 }),
        }),
        t.Object({
          where: t.Record(t.String(), t.Any(), { minProperties: 1 }),
        }),
      ]),
    }
  );
