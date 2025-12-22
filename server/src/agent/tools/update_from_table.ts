import { Result } from 'pg';
import { z } from 'zod';

import pg from '../../plugins/pg';
import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to update. Call 'findTables' to get valid table names."
    ),
  data: z
    .record(z.any(), z.any())
    .refine((obj) => Object.keys(obj).length >= 1, {
      message: 'At least one column to update is required',
    })
    .describe(
      "Key-value object with columns and values to update. Keys must be valid column names; call 'findColumns' to validate."
    ),
  where: z
    .record(z.any(), z.any())
    .refine((obj) => Object.keys(obj).length >= 1, {
      message: 'At least one column to update is required',
    })
    .describe(
      "Key-value pairs for WHERE conditions, e.g., { id: 1 }. Keys must be valid column names; call 'findColumns' to validate."
    ),
});

export const updateFromTableTool = {
  name: 'updateFromTable',
  description: `
      Updates records in a database table based on a WHERE condition.
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in 'data' and 'where'.
      - Ensure data and WHERE condition match the table's column types and constraints.
    `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, data, where } = args;

      // Validate table name
      const tables = await loadTables();
      if (!tables.includes(table)) {
        throw new Error(`Table '${table}' does not exist.`);
      }

      // Validate column names
      const columns = await loadColumns(table);
      const validColumns = columns.map((col) => col.name);
      for (const key of Object.keys(data)) {
        if (!validColumns.includes(key)) {
          throw new Error(
            `Invalid column '${key}' in data. Valid columns for '${table}': ${JSON.stringify(
              validColumns
            )}`
          );
        }
      }
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
      const query = pg(table).update<any, Result>(data, '*').where(where);

      // Execute query
      const result = await query;

      // Log update completion
      log.info('Update completed', { table, rowCount: result.rowCount });

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
                message: `Updated ${result.rowCount} record(s) in '${table}'.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Update error', { error: err.message });
      throw new Error(err.message || 'Failed to update data');
    }
  },
};
