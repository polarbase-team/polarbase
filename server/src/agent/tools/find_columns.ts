import { z } from 'zod';
import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to get columns for. Must be a valid table name returned by 'findTables'."
    ),
});

export const findColumnsTool = {
  name: 'findColumns',
  description: `
    Retrieves detailed column schema for a specific table.
    
    Returns rich, structured information including:
    - Mapped dataType (text, long-text, integer, number, date, checkbox, select, json)
    - Primary key, nullable, unique flags
    - Default value and column comment
    - Select options (for 'select' type)
    - Foreign key reference (if any)
    - Validation rules (length, range, date range, file size)
    
    This tool should always be called before inserting, updating, or querying data
    to ensure compliance with column types and constraints.
    
    Use 'findTables' first to get valid table names.
  `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table } = args;

      // Validate table name
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === table)) {
        throw new Error(
          `Table '${table}' is not accessible or does not exist.`
        );
      }

      // Fetch columns
      const columns = await loadColumns(table);
      if (columns.length === 0) {
        throw new Error(`Table ${table} has no columns`);
      }

      log.info('Fetched columns for tables', {
        table,
        columnCount: columns.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                message: `Column schema retrieved successfully for table '${table}'.`,
                table,
                columns,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Failed to fetch columns', {
        table: args.table,
        error: err.message,
      });
      throw new Error(
        `Failed to fetch columns for table '${args.table}': ${err.message}`
      );
    }
  },
};
