import { Elysia, t } from 'elysia';

import pg from '../../db/pg';
import { TableService } from '../../db/services/table.service';
import { IndexService } from '../../db/services/index.service';
import {
  Column,
  DataType,
  FormulaResultType,
  FormulaStrategy,
  ReferentialAction,
} from '../../db/utils/column';
import { err } from '../../shared/utils/api-response';

const tableService = new TableService();
const indexService = new IndexService();

/**
 * REST routes for table/column/index schema management.
 */
export const dbRoutes = new Elysia()

  /**
   * GET /rest/db/tables → list of allowed tables + comments
   */
  .get(
    '/tables',
    async ({ query: { includeSchema } }) => {
      const blacklist = (process.env.REST_BLACKLISTED_TABLES || '').split(',');
      const tables = await tableService.getAll({ includeSchema });
      return tables.filter((t) => !blacklist.includes(t.name));
    },
    {
      query: t.Object({
        includeSchema: t.Optional(
          t.Boolean({
            error: 'includeSchema must be a boolean',
          })
        ),
      }),
    }
  )

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
          t.Nullable(
            t.String({
              maxLength: 500,
              error: 'Comment too long (max 500 chars)',
            })
          )
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
          t.Nullable(
            t.Object(
              {
                uiName: t.Optional(t.Nullable(t.String())),
              },
              { minProperties: 1 }
            )
          )
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
            t.Nullable(
              t.Object(
                {
                  uiName: t.Optional(t.Nullable(t.String())),
                },
                { minProperties: 1 }
              )
            )
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
   * GET /rest/db/indexes → list indexes
   */
  .get(
    '/indexes',
    ({ query: { table } }) => {
      return indexService.getAll({ tableName: table });
    },
    {
      query: t.Object({ table: t.Optional(t.String()) }),
    }
  )

  /**
   * POST /rest/db/indexes → create index
   */
  .post(
    '/indexes',
    ({ body }) => {
      return indexService.createIndex({ index: body as any });
    },
    {
      body: t.Object({
        name: t.String(),
        tableName: t.String(),
        columnNames: t.Array(t.String()),
        unique: t.Optional(t.Boolean()),
        type: t.Optional(
          t.Union([
            t.Literal('btree'),
            t.Literal('hash'),
            t.Literal('gist'),
            t.Literal('gin'),
            t.Literal('brin'),
            t.Literal('spgist'),
          ])
        ),
      }),
    }
  )

  /**
   * DELETE /rest/db/indexes/:name → delete index
   */
  .delete(
    '/indexes/:name',
    ({ params: { name } }) => {
      return indexService.deleteIndex({ indexName: name });
    },
    {
      params: t.Object({ name: t.String() }),
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
              t.Object(
                {
                  uiName: t.Optional(t.Nullable(t.String())),
                  format: t.Optional(t.Nullable(t.Any())),
                },
                { minProperties: 1 }
              )
            )
          ),
          validation: t.Optional(
            t.Nullable(
              t.Object({
                minLength: t.Optional(t.Nullable(t.Number())),
                maxLength: t.Optional(t.Nullable(t.Number())),
                minValue: t.Optional(t.Nullable(t.Number())),
                maxValue: t.Optional(t.Nullable(t.Number())),
                minDate: t.Optional(t.Nullable(t.String())),
                maxDate: t.Optional(t.Nullable(t.String())),
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
          formula: t.Optional(
            t.Nullable(
              t.Object({
                resultType: t.Union([
                  t.Literal(FormulaResultType.Text),
                  t.Literal(FormulaResultType.Integer),
                  t.Literal(FormulaResultType.Number),
                  t.Literal(FormulaResultType.Date),
                  t.Literal(FormulaResultType.Boolean),
                  t.Literal(FormulaResultType.Jsonb),
                ]),
                expression: t.String(),
                strategy: t.Optional(
                  t.Union([
                    t.Literal(FormulaStrategy.Stored),
                    t.Literal(FormulaStrategy.Virtual),
                  ])
                ),
              })
            )
          ),
        },
        {
          error: (value) => {
            const { dataType, options, foreignKey, formula } =
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
            if (dataType !== DataType.Formula && formula) {
              return 'formula_only_for_formula: Formula can only be set for formula type';
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
    ({
      params: { table, column },
      body,
      query: { allowPresentationSaveOnFailure },
    }) => {
      return tableService.updateColumn({
        tableName: table,
        columnName: column,
        column: body as any,
        allowPresentationSaveOnFailure,
      });
    },
    {
      params: t.Object({ table: t.String(), column: t.String() }),
      query: t.Object({
        allowPresentationSaveOnFailure: t.Optional(t.Boolean()),
      }),
      body: t.Object(
        {
          name: t.String({
            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
            minLength: 1,
            maxLength: 63,
            error: 'Invalid format. Use letters, numbers, or _ (max 63 chars).',
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
            t.Object(
              {
                uiName: t.Optional(t.Nullable(t.String())),
                format: t.Optional(t.Nullable(t.Any())),
              },
              { minProperties: 1 }
            )
          ),
          validation: t.Nullable(
            t.Object({
              minLength: t.Optional(t.Nullable(t.Number())),
              maxLength: t.Optional(t.Nullable(t.Number())),
              minValue: t.Optional(t.Nullable(t.Number())),
              maxValue: t.Optional(t.Nullable(t.Number())),
              minDate: t.Optional(t.Nullable(t.String())),
              maxDate: t.Optional(t.Nullable(t.String())),
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
          formula: t.Optional(
            t.Nullable(
              t.Object({
                resultType: t.Union([
                  t.Literal(FormulaResultType.Text),
                  t.Literal(FormulaResultType.Integer),
                  t.Literal(FormulaResultType.Number),
                  t.Literal(FormulaResultType.Date),
                  t.Literal(FormulaResultType.Boolean),
                  t.Literal(FormulaResultType.Jsonb),
                ]),
                expression: t.String(),
                strategy: t.Optional(
                  t.Union([
                    t.Literal(FormulaStrategy.Stored),
                    t.Literal(FormulaStrategy.Virtual),
                  ])
                ),
              })
            )
          ),
        },
        {
          error: (value) => {
            const { dataType, options, foreignKey, formula } =
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
            if (dataType !== DataType.Formula && formula) {
              return 'formula_only_for_formula: Formula can only be set for formula type';
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
  );
