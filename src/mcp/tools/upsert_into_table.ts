import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'upsertIntoTable',
    description: `
    Inserts or updates records in a database table based on a conflict condition (e.g., primary key).
    Set 'preview' to true to return the SQL query without executing.
    Set 'confirm' to true to execute when 'preview' is false; otherwise, an error is thrown.
    Steps for AI:
    - Fetch 'db://tables' to validate the table name.
    - Fetch 'db://table/{tableName}/columns' to validate column names in the data and update fields.
    - Specify the conflict target (e.g., primary key column) and update fields.
  `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to upsert into. Must be a valid table name from 'db://tables'. DO NOT use resource URIs like 'db://tables'."
        ),
      data: z
        .array(z.record(z.any()))
        .min(1, 'At least one record is required')
        .describe(
          'Array of records to upsert, each as a key-value object with column names and values.'
        ),
      conflictTarget: z
        .string()
        .describe(
          "Column name(s) to check for conflicts (e.g., 'id' for primary key). Must be a valid column from 'db://table/{tableName}/columns'."
        ),
      updateColumns: z
        .array(z.string())
        .min(1, 'At least one column to update is required')
        .describe(
          "Columns to update on conflict. Must be valid columns from 'db://table/{tableName}/columns'."
        ),
      preview: z
        .boolean()
        .default(false)
        .describe(
          "If true, return the SQL query without executing. If false, execute only if 'confirm' is true."
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          "Required when 'preview' is false. Set to true to execute the query; otherwise, an error is thrown."
        ),
    }),
    annotations: {
      title: 'Upsert Data into Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { table, data, conflictTarget, updateColumns, preview, confirm } =
          args;

        // Validate table name
        if (table.startsWith('db://')) {
          throw new UserError(
            "Invalid table name: 'table' parameter cannot be a resource URI like 'db://tables'. Fetch valid table names from 'db://tables'."
          );
        }
        const tablesResource = await server.embedded('db://tables');
        const tables = JSON.parse(tablesResource.text || '[]') as string[];
        if (!tables.includes(table)) {
          throw new UserError(
            `Table '${table}' does not exist. Fetch valid table names from 'db://tables': ${JSON.stringify(tables)}`
          );
        }

        // Validate column names
        const columnsResource = await server.embedded(
          `db://table/${table}/columns`
        );
        const columns = JSON.parse(columnsResource.text || '[]') as {
          name: string;
          type: string;
        }[];
        const validColumns = columns.map((col) => col.name);
        for (const record of data) {
          for (const key of Object.keys(record)) {
            if (!validColumns.includes(key)) {
              throw new UserError(
                `Invalid column '${key}' in data. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
              );
            }
          }
        }
        if (!validColumns.includes(conflictTarget)) {
          throw new UserError(
            `Invalid conflict target '${conflictTarget}'. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
          );
        }
        for (const col of updateColumns) {
          if (!validColumns.includes(col)) {
            throw new UserError(
              `Invalid update column '${col}'. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
            );
          }
        }

        // Build Knex query
        let query = db(table).insert(data);
        if (db.client.config.client === 'pg') {
          query = query.onConflict(conflictTarget).merge(updateColumns);
        } else if (db.client.config.client === 'mysql') {
          const updateClause = updateColumns
            .map((col) => `${col} = VALUES(${col})`)
            .join(', ');
          // @ts-ignore
          query = db.raw(
            `${query.toSQL().sql} ON DUPLICATE KEY UPDATE ${updateClause}`
          );
        } else if (db.client.config.client === 'sqlite3') {
          query = query.onConflict(conflictTarget).merge(updateColumns);
        }

        // Preview mode
        if (preview) {
          const sql = query.toSQL().sql;
          log.info('Returning SQL preview', { sql });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ status: 'preview', sql }, null, 2),
              },
            ],
          };
        }

        // Check confirmation
        if (!confirm) {
          throw new UserError(
            "Confirmation required: set 'confirm' to true to execute the query."
          );
        }

        // Execute query
        const result = await query;

        // Log upsert completion
        log.info('Upsert completed', {
          table,
          rowCount: result.length || result,
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
                  rowCount: result.length || result,
                  message: `Upserted ${result.length || result} record(s) into '${table}'.`,
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
        throw new UserError(err.message || 'Failed to upsert data');
      }
    },
  });
}
