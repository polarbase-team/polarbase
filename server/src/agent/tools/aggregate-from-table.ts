import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { ConditionSchema } from '../schema/condition.schema';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const inputSchema = z.object({
  from: z
    .string()
    .describe(
      'Name of the table to aggregate from. Use findTables to get the list of valid tables.'
    ),

  select: z
    .array(z.string())
    .min(1)
    .describe(
      'List of columns or aggregation expressions. Examples:\n' +
        '- Simple column: "status"\n' +
        '- Aggregations: "COUNT(*) as total", "SUM(amount) as revenue", "AVG(score) as avg_score", "MAX(created_at) as latest"\n' +
        'Use "as alias" to name the result column.'
    ),

  where: ConditionSchema.optional().describe(
    `Advanced WHERE filter conditions (same as listFromTable).\n` +
      `Examples:\n` +
      `- { status: "completed" }\n` +
      `- { amount: { gt: 1000 } }\n` +
      `- { and: [{ status: "completed" }, { created_at: { gte: "2024-01-01" } }] }\n` +
      `- { or: [{ category: "electronics" }, { category: "fashion" }] }`
  ),

  group: z
    .array(z.string())
    .optional()
    .describe(
      'Columns to GROUP BY. Required if using aggregation functions like COUNT, SUM, AVG, etc.\n' +
        'Example: ["status", "DATE(created_at)"]'
    ),

  having: ConditionSchema.optional().describe(
    `Advanced HAVING filter (applied after GROUP BY).\n` +
      `Uses the same structure as WHERE, but on aggregated/grouped columns.\n` +
      `Examples:\n` +
      `- { total: { gt: 100 } }\n` +
      `- { revenue: { gte: 5000 } }\n` +
      `- { and: [{ count: { gt: 10 } }, { avg_score: { lt: 4.0 } }] }\n` +
      `- { or: [{ status: "premium" }, { total_orders: { gt: 50 } }] }`
  ),

  order: z
    .string()
    .optional()
    .describe(
      'Sort results. Examples: "revenue:desc", "status:asc", "total:desc"'
    ),

  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of rows per page.'),

  page: z.number().int().positive().optional().describe('Current page number.'),
});

export const aggregateFromTableTool = {
  name: 'aggregateFromTable',
  description: `
    Performs powerful aggregation queries with COUNT, SUM, AVG, MAX, MIN, GROUP BY, and HAVING clauses.
    Ideal for reports, statistics, dashboards, and analytical questions.

    Examples of use:
    - "Total revenue and number of orders by month"
    - "Top 10 products by sales volume"
    - "Number of active users per country (only countries with more than 100 users)"
    - "Average order value by customer segment, excluding refunded orders"

    Now supports advanced WHERE and HAVING conditions with operators (gt, in, etc.) and logical AND/OR grouping.

    Usage steps:
    1. Use findTables to choose the correct table.
    2. Use findColumns to understand available columns and their types.
    3. Build meaningful SELECT expressions and GROUP BY columns.
  `,
  inputSchema,

  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const {
        from: tableName,
        select,
        where,
        group,
        having,
        order,
        limit,
        page,
      } = args;

      // Validate table exists
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === tableName)) {
        throw new Error(
          `Table '${tableName}' does not exist. Use findTables to see available tables.`
        );
      }

      // Call aggregate method (service already supports full WhereFilter for where/having)
      const result = await tableRecordService.aggregate({
        tableName,
        schemaName: 'public',
        query: {
          select,
          where,
          group,
          having,
          order,
          page,
          limit,
        },
      });

      // Limit displayed rows
      const MAX_DISPLAY_ROWS = 15;
      const displayedRows = result.rows.slice(0, MAX_DISPLAY_ROWS);

      log.info('Aggregation query completed', {
        table: tableName,
        totalRows: result.pagination.total,
        returnedRows: displayedRows.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                message: `Aggregation result from table "${tableName}"`,
                total_rows: result.pagination.total,
                returned_rows: displayedRows.length,
                pagination: result.pagination,
                data: displayedRows,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Aggregation query error', { error: err.message });
      throw new Error(err.message || 'Failed to execute aggregation query');
    }
  },
};
