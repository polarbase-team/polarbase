import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const inputSchema = z.object({
  from: z
    .string()
    .describe(
      'Name of the table to aggregate from. Call findTables to get the list of valid tables.'
    ),

  select: z
    .array(z.string())
    .min(1)
    .describe(
      'List of columns or aggregation functions. Examples: ["status", "COUNT(*) as total_count", "SUM(amount) as total_amount", "AVG(score) as avg_score"]'
    ),

  where: z
    .record(z.any(), z.any())
    .optional()
    .describe('WHERE conditions as a key-value object.'),

  group: z
    .array(z.string())
    .optional()
    .describe(
      'Columns to GROUP BY. Required when using aggregation functions.'
    ),

  having: z
    .record(z.any(), z.any())
    .optional()
    .describe(
      'HAVING conditions after GROUP BY. Examples: { "total_count": { operator: ">", value: 10 } } or { "total_amount": 1000 }'
    ),

  order: z
    .string()
    .optional()
    .describe(
      'Sort the results. Examples: "total_amount:desc" or "status:asc"'
    ),

  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .default(20)
    .describe('Maximum number of rows to return.'),

  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
    .describe('Current page.'),
});

export const aggregateFromTableTool = {
  name: 'aggregateFromTable',
  description: `
    Perform aggregation queries (COUNT, SUM, AVG, MAX, MIN, GROUP BY, HAVING) on a table.
    Very useful for statistical questions and reports:
    - "How many orders by status?"
    - "Total revenue by month?"
    - "Top 10 customers with the highest spending?"
   
    Usage steps:
    1. Call findTables to get the appropriate table name.
    2. Call findColumns to know which columns can be used for grouping or in HAVING.
    3. Build the select array containing aggregation functions + grouping columns.
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
        limit = 20,
        page = 1,
      } = args;

      // Validate table
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === tableName)) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      // Call the aggregate method from the service
      const result = await tableRecordService.aggregate({
        tableName,
        schemaName: 'public',
        query: {
          select,
          where,
          group,
          having,
          order,
          limit: limit.toString(),
          page: page.toString(),
        },
      });

      // Limit displayed rows for the AI (to avoid overly long responses)
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
