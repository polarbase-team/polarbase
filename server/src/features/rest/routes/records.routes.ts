import { Elysia, t } from 'elysia';

import { TableRecordService } from '../../../db/services/table-record.service';
import { WhereFilter } from '../../../db/utils/record';
import { err } from '../../../shared/utils/api-response';

const tableRecordService = new TableRecordService();

/**
 * REST routes for record CRUD and bulk operations.
 */
export const recordsRoutes = new Elysia()

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
          error: 'Bulk update requires 1-10,000 items with valid ID and data.',
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
  );
