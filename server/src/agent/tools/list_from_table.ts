import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const inputSchema = z.object({
  from: z
    .string()
    .describe(
      'Name of the table to retrieve data from. Call findTables to get the list of valid tables.'
    ),

  fields: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of columns to retrieve. Example: "id, name, email, created_at". Defaults to all columns (*).'
    ),

  where: z
    .record(z.any(), z.any())
    .optional()
    .describe(
      'WHERE filter conditions as a key-value object. Example: { status: "active", age: { operator: ">", value: 18 } }.'
    ),

  search: z
    .string()
    .optional()
    .describe(
      'Global text search (case-insensitive) across text columns. Very useful for vague or broad queries.'
    ),

  order: z
    .string()
    .optional()
    .describe(
      'Sort results. Examples: "created_at:desc" or "name:asc". Default: first column ascending.'
    ),

  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .default(20)
    .describe('Maximum number of rows per page.'),

  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
    .describe('Current page number.'),
});

export const listFromTableTool = {
  name: 'listFromTable',
  description: `
    Retrieves a detailed list of records from a database table, with support for filtering, global search, column selection, sorting, and pagination.
    Best suited for questions like:
    - "List the 20 most recent orders"
    - "Show customers located in Hanoi"
    - "Find products with 'iPhone' in the name"
    - "View details of orders with pending status"

    Advantages: Powerful search feature, no need for exact filter conditions.
    Usage steps:
    1. Call findTables to select the appropriate table.
    2. (Optional) Call findColumns to get accurate column names for fields, order, or where clauses.
  `,
  inputSchema,

  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const {
        from: tableName,
        fields,
        where,
        search,
        order,
        limit = 20,
        page = 1,
      } = args;

      // Validate table
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === tableName)) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      // Call the getAll method from the service
      const result = await tableRecordService.getAll({
        tableName,
        schemaName: 'public',
        query: {
          fields,
          where,
          search,
          order,
          page: page.toString(),
          limit: limit.toString(),
        },
      });

      // Limit displayed rows for the AI (to avoid overly long responses)
      const MAX_DISPLAY_ROWS = 15;
      const displayedRows = result.rows.slice(0, MAX_DISPLAY_ROWS);

      log.info('List query completed', {
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
                message: `List result from table "${tableName}"`,
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
      log.error('List query error', { error: err.message });
      throw new Error(err.message || 'Failed to execute list query');
    }
  },
};
