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
      "Name of the table to insert into. Call 'findTables' to get valid table names."
    ),
  data: z
    .array(z.record(z.any(), z.any()))
    .min(1, 'At least one record is required')
    .describe(
      "Array of records to insert, each as a key-value object. Keys must be valid column names; call 'findColumns' to validate."
    ),
});

export const insertIntoTableTool = {
  name: 'insertIntoTable',
  description: `
      Inserts one or more records into a database table.
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in the 'data' parameter.
      - Ensure data matches the table's column types and constraints.
    `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, data } = args;

      // Validate table name
      const tables = await loadTables();
      if (tables.find((t) => t.tableName === table)) {
        throw new Error(`Table '${table}' does not exist.`);
      }

      // Validate column names
      const columns = await loadColumns(table);
      const validColumns = columns.map((col) => col.name);
      for (const record of data) {
        for (const key of Object.keys(record)) {
          if (!validColumns.includes(key)) {
            throw new Error(
              `Invalid column '${key}' in data. Valid columns for '${table}': ${JSON.stringify(
                validColumns
              )}`
            );
          }
        }
      }

      // Build Knex query
      const query = pg(table).insert<any, Result>(data, '*');

      // Execute query
      const result = await query;

      // Log insert completion
      log.info('Insert completed', {
        table,
        rowCount: result.rowCount,
      });

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
                message: `Inserted ${result.rowCount} record(s) into '${table}'.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Insert error', { error: err.message });
      throw new Error(err.message || 'Failed to insert data');
    }
  },
};
