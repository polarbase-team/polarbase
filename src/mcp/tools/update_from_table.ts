import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'updateFromTable',
    description: `
    Updates records in a database table based on a WHERE condition.
    Set 'preview' to true to return the SQL query without executing.
    Set 'confirm' to true to execute when 'preview' is false; otherwise, an error is thrown.
    Steps for AI:
    - Fetch 'db://tables' to validate the table name.
    - Fetch 'db://table/{tableName}/columns' to validate column names in the data and WHERE condition.
    - Ensure data and WHERE condition match the table's column types and constraints.
  `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to update. Must be a valid table name from 'db://tables'. DO NOT use resource URIs like 'db://tables'."
        ),
      data: z
        .record(z.any())
        .refine((obj) => Object.keys(obj).length >= 1, {
          message: 'At least one column to update is required',
        })
        .describe('Key-value object with column names and values to update.'),
      where: z
        .record(z.any())
        .refine((obj) => Object.keys(obj).length >= 1, {
          message: 'At least one WHERE condition is required',
        })
        .describe(
          "Key-value pairs for WHERE conditions, e.g., { id: 1 }. Keys must match columns from 'db://table/{tableName}/columns'."
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
      title: 'Update Data in Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { table, data, where, preview, confirm } = args;

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
        for (const key of Object.keys(data)) {
          if (!validColumns.includes(key)) {
            throw new UserError(
              `Invalid column '${key}' in data. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
            );
          }
        }
        for (const key of Object.keys(where)) {
          if (!validColumns.includes(key)) {
            throw new UserError(
              `Invalid column '${key}' in WHERE condition. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
            );
          }
        }

        // Build Knex query
        let query = db(table).update(data).where(where);

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

        // Log update completion
        log.info('Update completed', { table, rowCount: result });

        // Return success response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  table,
                  rowCount: result,
                  message: `Updated ${result} record(s) in '${table}'.`,
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
        throw new UserError(err.message || 'Failed to update data');
      }
    },
  });
}
