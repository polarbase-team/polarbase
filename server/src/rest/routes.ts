import { Elysia, t } from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';

import pg from '../plugins/pg';
import { LocalStorageProvider } from '../plugins/storage/local-storage';
import { checkRateLimit } from '../utils/rate-limit';
import { err, json } from '../utils/api-response';
import { apiKeyAuth } from '../api-keys/auth';
import { TableService } from './services/table.service';
import { TableRecordService } from './services/table-record.service';
import { Column, DataType, ReferentialAction } from './utils/column';
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
const storage = new LocalStorageProvider();

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
      if (!apiKey) throw new Error('Invalid or missing x-api-key');

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
      throw e;
    }
  })

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, REST_RATE_LIMIT, REST_PREFIX)) {
      set.status = 429;
      return err('Too many requests. Please try again later.', 429);
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

      const allErrors = (error as any).all;
      const firstError = allErrors?.[0];
      if (firstError) {
        const rawPath = firstError.path;
        const path =
          rawPath && rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
        const msg = firstError.summary || firstError.message;
        return err(path ? `${path}: ${msg}` : msg);
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
      throw new Error(`Table "${params.table}" is forbidden`);
    }
  })

  .group('/db', (app) =>
    app

      /**
       * GET /rest/db/tables → list of allowed tables + comments
       */
      .get('/tables', async () => {
        const tables = await tableService.getAll();
        return tables.filter((t) => !REST_BLACKLISTED_TABLES.includes(t.name));
      })

      /**
       * GET /rest/db/tables/:table/schema → detailed column schema
       */
      .get(
        '/tables/:table/schema',
        async ({ params: { table }, set }) => {
          const exists = await pg.schema.hasTable(table);
          if (!exists) {
            set.status = 404;
            return err(`Table "${table}" not found`);
          }
          return tableService.getSchema({ tableName: table });
        },
        {
          params: t.Object({ table: t.String() }),
        }
      )

      /**
       * POST /rest/db/tables → create new table
       */
      .post(
        '/tables',
        ({ body }) => {
          return tableService.createTable({ table: body });
        },
        {
          body: t.Object({
            name: t.String({
              pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
              minLength: 1,
              maxLength: 63,
              error:
                'Table name must start with a letter/_ and contain only alphanumeric characters (max 63).',
            }),
            comment: t.Optional(
              t.String({
                maxLength: 500,
                error: 'Comment too long (max 500 chars)',
              })
            ),
            idType: t.Optional(
              t.Union(
                [
                  t.Literal('biginteger'),
                  t.Literal('integer'),
                  t.Literal('uuid'),
                  t.Literal('shortid'),
                ],
                {
                  error:
                    'Invalid idType. Expected: biginteger, integer, uuid, or shortid.',
                }
              )
            ),
            timestamps: t.Optional(t.Boolean()),
            presentation: t.Optional(
              t.Object({
                uiName: t.Optional(t.String()),
              })
            ),
          }),
        }
      )

      /**
       * PATCH /rest/db/tables/:table → partial update of table (rename, update comment)
       */
      .patch(
        '/tables/:table',
        ({ params: { table }, body }) => {
          return tableService.updateTable({ tableName: table, table: body });
        },
        {
          body: t.Object(
            {
              name: t.Optional(
                t.String({
                  pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
                  minLength: 1,
                  maxLength: 63,
                  error:
                    'Invalid format. Use letters, numbers, or _ (max 63 chars).',
                })
              ),
              comment: t.Optional(
                t.Nullable(
                  t.String({
                    maxLength: 500,
                    error: 'Comment too long (max 500 chars)',
                  })
                )
              ),
              presentation: t.Optional(
                t.Object({
                  uiName: t.Optional(t.String()),
                })
              ),
            },
            {
              minProperties: 1,
              error: 'At least one field must be provided for update.',
            }
          ),
        }
      )

      /**
       * DELETE /rest/db/tables/:table → delete table
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
       * POST /rest/db/tables/:table/columns → create new column
       */
      .post(
        '/tables/:table/columns',
        ({ params: { table }, body }) => {
          return tableService.createColumn({
            tableName: table,
            column: body as any,
          });
        },
        {
          params: t.Object({ table: t.String() }),
          body: t.Object(
            {
              name: t.String({
                pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
                minLength: 1,
                maxLength: 63,
                error:
                  'Column name must be alphanumeric and start with a letter or underscore.',
              }),
              dataType: t.Enum(DataType, {
                error: 'Unsupported dataType provided.',
              }),
              nullable: t.Optional(t.Boolean()),
              unique: t.Optional(t.Boolean()),
              defaultValue: t.Optional(t.Nullable(t.Any())),
              comment: t.Optional(
                t.Nullable(
                  t.String({
                    maxLength: 500,
                    error: 'Comment too long (max 500 chars)',
                  })
                )
              ),
              presentation: t.Optional(
                t.Nullable(
                  t.Object({
                    uiName: t.Optional(t.Nullable(t.String())),
                    format: t.Optional(t.Nullable(t.Any())),
                  })
                )
              ),
              validation: t.Optional(
                t.Nullable(
                  t.Object({
                    minLength: t.Optional(t.Nullable(t.Number())),
                    maxLength: t.Optional(t.Nullable(t.Number())),
                    minValue: t.Optional(t.Nullable(t.Number())),
                    maxValue: t.Optional(t.Nullable(t.Number())),
                    minDate: t.Optional(
                      t.Nullable(t.String({ format: 'date-time' }))
                    ),
                    maxDate: t.Optional(
                      t.Nullable(t.String({ format: 'date-time' }))
                    ),
                    maxSize: t.Optional(t.Nullable(t.Number())),
                    maxFiles: t.Optional(t.Nullable(t.Number())),
                    allowedDomains: t.Optional(t.Nullable(t.String())),
                  })
                )
              ),
              options: t.Optional(t.Nullable(t.Array(t.String()))),
              foreignKey: t.Optional(
                t.Nullable(
                  t.Object({
                    table: t.String(),
                    column: t.Object({ name: t.String(), type: t.String() }),
                    onUpdate: t.Enum(ReferentialAction),
                    onDelete: t.Enum(ReferentialAction),
                  })
                )
              ),
            },
            {
              error: (value) => {
                const { dataType, options, foreignKey } =
                  value as unknown as Column;
                if (
                  (dataType === DataType.Select ||
                    dataType === DataType.MultiSelect) &&
                  (!options || options.length === 0)
                ) {
                  return 'options_required: Select types must have at least one option';
                }
                if (dataType === DataType.Reference && !foreignKey) {
                  return 'foreignKey_required: Reference type must specify a target table and column';
                }
              },
            }
          ),
        }
      )

      /**
       * PUT /rest/db/tables/:table/columns/:column → update column
       */
      .put(
        '/tables/:table/columns/:column',
        ({ params: { table, column }, body }) => {
          return tableService.updateColumn({
            tableName: table,
            columnName: column,
            column: body as any,
          });
        },
        {
          params: t.Object({ table: t.String(), column: t.String() }),
          body: t.Object(
            {
              name: t.String({
                pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
                minLength: 1,
                maxLength: 63,
                error:
                  'Invalid format. Use letters, numbers, or _ (max 63 chars).',
              }),
              dataType: t.Enum(DataType, { error: 'Invalid dataType.' }),
              nullable: t.Boolean(),
              unique: t.Boolean(),
              defaultValue: t.Nullable(t.Any()),
              comment: t.Nullable(
                t.String({
                  maxLength: 500,
                  error: 'Comment too long (max 500 chars)',
                })
              ),
              presentation: t.Nullable(
                t.Object({
                  uiName: t.Optional(t.Nullable(t.String())),
                  format: t.Optional(t.Nullable(t.Any())),
                })
              ),
              validation: t.Nullable(
                t.Object({
                  minLength: t.Optional(t.Nullable(t.Number())),
                  maxLength: t.Optional(t.Nullable(t.Number())),
                  minValue: t.Optional(t.Nullable(t.Number())),
                  maxValue: t.Optional(t.Nullable(t.Number())),
                  minDate: t.Optional(
                    t.Nullable(t.String({ format: 'date-time' }))
                  ),
                  maxDate: t.Optional(
                    t.Nullable(t.String({ format: 'date-time' }))
                  ),
                  maxSize: t.Optional(t.Nullable(t.Number())),
                  maxFiles: t.Optional(t.Nullable(t.Number())),
                  allowedDomains: t.Optional(t.Nullable(t.String())),
                })
              ),
              options: t.Optional(t.Nullable(t.Array(t.String()))),
              foreignKey: t.Optional(
                t.Nullable(
                  t.Object({
                    table: t.String(),
                    column: t.Object({ name: t.String(), type: t.String() }),
                    onUpdate: t.Enum(ReferentialAction),
                    onDelete: t.Enum(ReferentialAction),
                  })
                )
              ),
            },
            {
              error: (value) => {
                const { dataType, options, foreignKey } =
                  value as unknown as Column;
                if (
                  (dataType === DataType.Select ||
                    dataType === DataType.MultiSelect) &&
                  (!options || options.length === 0)
                ) {
                  return 'options_required: Select types must have at least one option';
                }
                if (dataType === DataType.Reference && !foreignKey) {
                  return 'foreignKey_required: Reference type must specify a target table and column';
                }
              },
            }
          ),
        }
      )

      /**
       * DELETE /rest/db/tables/:table/columns/:column → delete column
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
       * GET /rest/db/:table → paginated list
       */
      .get(
        '/:table',
        async ({ params: { table }, query }) => {
          const { filter, sort, expand, ...remain } = query;
          let whereClause: WhereFilter;
          if (typeof filter === 'string') {
            try {
              whereClause = JSON.parse(filter);
            } catch (e) {
              throw new Error(
                'Query parameter "filter" must be a valid JSON string'
              );
            }
          }

          const expandFields: Record<string, string> = {};
          if (expand) {
            const expands = Array.isArray(expand) ? expand : [expand];
            expands.forEach((item) => {
              const [field, alias] = item.split(':');
              if (field) {
                expandFields[field.trim()] = alias?.trim() || '';
              }
            });
          }

          return tableRecordService.select({
            tableName: table,
            query: {
              ...remain,
              where: whereClause!,
              order: sort,
              expandFields,
            },
          });
        },
        {
          query: t.Object({
            fields: t.Optional(t.String()),
            search: t.Optional(t.String()),
            filter: t.Optional(t.String()),
            sort: t.Optional(
              t.String({
                pattern: '^[^:]+:(asc|desc)$',
                error: 'Sort format must be "field:asc" or "field:desc".',
              })
            ),
            expand: t.Optional(t.Union([t.String(), t.Array(t.String())])),
            page: t.Optional(
              t.Numeric({
                minimum: 1,
                error: 'Page must be a positive integer.',
              })
            ),
            limit: t.Optional(
              t.Numeric({
                minimum: 1,
                maximum: 10000,
                error: 'Limit must be between 1 and 10,000.',
              })
            ),
          }),
        }
      )

      /**
       * GET /rest/db/:table/:id → single record
       */
      .get(
        '/:table/:id',
        async ({ params: { table, id }, query, set }) => {
          const { expand } = query;
          const expandFields: Record<string, string> = {};
          if (expand) {
            const expands = Array.isArray(expand) ? expand : [expand];
            expands.forEach((item) => {
              const [field, alias] = item.split(':');
              if (field) {
                expandFields[field.trim()] = alias?.trim() || '';
              }
            });
          }

          const result = await tableRecordService.select({
            tableName: table,
            query: { where: { id }, limit: 1, expandFields },
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
          query: t.Object({
            expand: t.Optional(t.Union([t.String(), t.Array(t.String())])),
          }),
        }
      )

      /**
       * POST /rest/db/:table → create new record
       */
      .post(
        '/:table',
        ({ params: { table }, body }) => {
          return tableRecordService.insert({
            tableName: table,
            records: [body],
          });
        },
        {
          body: t.Record(t.String(), t.Any(), {
            error: 'Payload must be a valid JSON object.',
          }),
        }
      )

      /**
       * PATCH /rest/db/:table/:id → partial update single record
       */
      .patch(
        '/:table/:id',
        ({ params: { table, id }, body }) => {
          const { id: _, ...updateData } = body;
          return tableRecordService.update({
            tableName: table,
            updates: [{ where: { id }, data: updateData }],
          });
        },
        {
          params: t.Object({
            table: t.String(),
            id: t.Union([t.String(), t.Numeric()]),
          }),
          body: t.Record(t.String(), t.Any(), {
            minProperties: 1,
            error: 'Update body cannot be empty.',
          }),
        }
      )

      /**
       * DELETE /rest/db/:table/:id → delete single record
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
       * POST /rest/db/:table/bulk-create → insert many records (max 10,000)
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
            error: 'Bulk create requires an array of 1 to 10,000 records.',
          }),
        }
      )

      /**
       * PATCH /rest/db/:table/bulk-update → update many records by ids (max 10,000)
       */
      .patch(
        '/:table/bulk-update',
        ({ params: { table }, body }) => {
          const updates = body.map(({ id, data }) => ({
            where: { id },
            data,
          }));
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
              error:
                'Bulk update requires 1-10,000 items with valid ID and data.',
            }
          ),
        }
      )

      /**
       * POST /rest/db/:table/bulk-delete → delete many records by ids (max 10,000)
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
              error:
                'The "ids" array must contain between 1 and 10,000 identifiers.',
            }),
          }),
        }
      )
  )

  .group('/files', (app) =>
    app

      /**
       * POST /rest/files/upload → upload file to storage
       */
      .post(
        '/upload',
        async ({ body: { files } }) => {
          const uploadedMetadata = [];
          for (const file of files) {
            const meta = await storage.upload(file, 'user-uploads');
            uploadedMetadata.push(meta);
          }
          return uploadedMetadata;
        },
        {
          body: t.Object({
            files: t.Files({
              maxItems: 10,
              maxSize: '5m',
            }),
          }),
        }
      )
  );
