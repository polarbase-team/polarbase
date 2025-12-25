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
      'Name of the table to retrieve data from. Call findTables to get the list of valid tables.'
    ),

  fields: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of columns to retrieve. Example: "id, name, email, created_at". Defaults to all columns (*).'
    ),

  where: ConditionSchema.optional().describe(
    `Advanced WHERE filter conditions following WhereFilter structure.
    Examples:
    - Simple: { status: "active" }
    - With operator: { age: { gt: 18 } }
    - Multiple columns: { status: "active", role: { in: ["admin", "moderator"] } }
    - Logic AND: { and: [{ status: "active" }, { age: { gte: 18 } }] }
    - Logic OR: { or: [{ category: "electronics" }, { category: "fashion" }] }
    - Nested: { and: [{ status: "active" }, { or: [{ age: { lt: 30 } }, { vip: true }] }] }`
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
    .describe('Maximum number of rows per page.'),

  page: z.number().int().positive().optional().describe('Current page number.'),
});

export const listFromTableTool = {
  name: 'listFromTable',
  description: `
    Retrieves a detailed list of records from a database table, with support for filtering, global search, column selection, sorting, and pagination.
    Now supports advanced WHERE conditions including operators (gt, in, ilike, etc.) and logical grouping (and/or) via WhereFilter structure.
    
    Best suited for questions like:
    - "List the 20 most recent orders"
    - "Show customers older than 18 and located in Hanoi"
    - "Find products with 'iPhone' in the name or description"
    - "View orders that are either pending or shipped in the last 7 days"

    Advantages: Powerful global search + full SQL-like filtering capability.
    Usage steps:
    1. Call findTables to select the appropriate table.
    2. (Optional) Call findColumns to get accurate column names.
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
        limit,
        page,
      } = args;

      // Validate table
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === tableName)) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      // Call the select method from the service
      const result = await tableRecordService.select({
        tableName,
        schemaName: 'public',
        query: {
          fields,
          where,
          search,
          order,
          page,
          limit,
        },
      });

      // Limit displayed rows for the AI
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
