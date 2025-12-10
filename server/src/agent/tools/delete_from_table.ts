import { z } from 'zod';

import db from '../../plugins/db';
import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';
import { Result } from 'pg';

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to delete from. Call 'findTables' to get valid table names."
    ),
  where: z
    .record(z.any(), z.any())
    .refine((obj) => Object.keys(obj).length >= 1, {
      message: 'At least one WHERE condition is required',
    })
    .describe(
      "Key-value pairs for WHERE conditions, e.g., { id: 1 }. Keys must be valid column names; call 'findColumns' to validate."
    ),
});

export const deleteFromTableTool = {
  name: 'deleteFromTable',
  description: `
    Deletes records from a database table based on a WHERE condition.
    Steps for AI:
    - Call 'findTables' to validate the table name for the 'table' parameter.
    - Call 'findColumns' with the table name to validate column names in the 'where' condition.
    - Ensure WHERE condition matches the table's column types and constraints.
  `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, where } = args;

      const tablesResource = await loadTables();
      const tables = JSON.parse(tablesResource.text || '[]') as string[];
      if (!tables.includes(table)) {
        throw new Error(`Table '${table}' does not exist.'}`);
      }

      // Validate column names in WHERE condition
      const columnsResource = await loadColumns(table);
      const columns = JSON.parse(columnsResource.text || '[]') as {
        name: string;
        type: string;
      }[];
      const validColumns = columns.map((col) => col.name);
      for (const key of Object.keys(where)) {
        if (!validColumns.includes(key)) {
          throw new Error(
            `Invalid column '${key}' in WHERE condition. Valid columns for '${table}': ${JSON.stringify(
              validColumns
            )}`
          );
        }
      }

      // Build Knex query
      const query = db(table).where(where).delete<any, Result>('*');

      // Execute query
      const result = await query;

      // Log delete completion
      log.info('Delete completed', { table, rowCount: result.rowCount });

      // Return success response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                table,
                rowCount: result.rowCount,
                message: `Deleted ${result.rowCount} record(s) from '${table}'.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Delete error', { error: err.message });
      throw new Error(err.message || 'Failed to delete data');
    }
  },
};
