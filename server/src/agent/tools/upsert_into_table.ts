import { z } from 'zod';
import { Result } from 'pg';

import pg from '../../plugins/pg';
import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to upsert into. Call 'findTables' to get valid table names."
    ),
  data: z
    .array(z.record(z.any(), z.any()))
    .min(1, 'At least one record is required')
    .describe(
      "Array of records to upsert, each as a key-value object. Keys must be valid column names; call 'findColumns' to validate."
    ),
  conflictTarget: z
    .string()
    .describe(
      "Column name(s) to check for conflicts (e.g., 'id'). Must be a valid column; call 'findColumns' to validate."
    ),
  updateColumns: z
    .array(z.string())
    .min(1, 'At least one column to update is required')
    .describe(
      "Columns to update on conflict. Must be valid columns; call 'findColumns' to validate."
    ),
});

export const upsertIntoTableTool = {
  name: 'upsertIntoTable',
  description: `
      Inserts or updates records in a database table based on a conflict condition (e.g., primary key).
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in 'data', 'conflictTarget', and 'updateColumns'.
      - Specify the conflict target (e.g., primary key column) and update columns.
    `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, data, conflictTarget, updateColumns } = args;

      const tablesResource = await loadTables();
      const tables = JSON.parse(tablesResource.text || '[]') as string[];
      if (!tables.includes(table)) {
        throw new Error(`Table '${table}' does not exist.`);
      }

      // Validate column names
      const columnsResource = await loadColumns(table);
      const columns = JSON.parse(columnsResource.text || '[]') as {
        name: string;
        type: string;
      }[];
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
      if (!validColumns.includes(conflictTarget)) {
        throw new Error(
          `Invalid conflict target '${conflictTarget}'. Valid columns for '${table}': ${JSON.stringify(
            validColumns
          )}`
        );
      }
      for (const col of updateColumns) {
        if (!validColumns.includes(col)) {
          throw new Error(
            `Invalid update column '${col}'. Valid columns for '${table}': ${JSON.stringify(
              validColumns
            )}`
          );
        }
      }

      // Build Knex query
      const query = pg(table)
        .insert<any, Result>(data, '*')
        .onConflict(conflictTarget)
        .merge(updateColumns);

      // Execute query
      const result = await query;

      // Log upsert completion
      log.info('Upsert completed', {
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
                message: `Upserted ${result.rowCount} record(s) into '${table}'.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Upsert error', { error: err.message });
      throw new Error(err.message || 'Failed to upsert data');
    }
  },
};
