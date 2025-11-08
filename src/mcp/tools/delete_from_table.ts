import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'deleteFromTable',
    description: `
      Deletes records from a database table based on a WHERE condition.
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in the 'where' condition.
      - Ensure WHERE condition matches the table's column types and constraints.
      - Set 'preview' to true to return the SQL query without executing.
      - Set 'confirm' to true to execute when 'preview' is false.
    `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to delete from. Call 'findTables' to get valid table names."
        ),
      where: z
        .record(z.any())
        .refine((obj) => Object.keys(obj).length >= 1, {
          message: 'At least one WHERE condition is required',
        })
        .describe(
          "Key-value pairs for WHERE conditions, e.g., { id: 1 }. Keys must be valid column names; call 'findColumns' to validate."
        ),
      preview: z
        .boolean()
        .default(false)
        .describe(
          'If true, returns the SQL query without executing. If false, executes the query.'
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          "Required when 'preview' is false. Set to true to execute the query."
        ),
    }),
    annotations: {
      title: 'Delete Data from Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { table, where, preview, confirm } = args;

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

        // Validate column names in WHERE condition
        const columnsResource = await server.embedded(
          `db://table/${table}/columns`
        );
        const columns = JSON.parse(columnsResource.text || '[]') as {
          name: string;
          type: string;
        }[];
        const validColumns = columns.map((col) => col.name);
        for (const key of Object.keys(where)) {
          if (!validColumns.includes(key)) {
            throw new UserError(
              `Invalid column '${key}' in WHERE condition. Valid columns for '${table}': ${JSON.stringify(validColumns)}`
            );
          }
        }

        // Build Knex query
        let query = db(table).where(where).delete();

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

        // Log delete completion
        log.info('Delete completed', { table, rowCount: result });

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
                  message: `Deleted ${result} record(s) from '${table}'.`,
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
        throw new UserError(err.message || 'Failed to delete data');
      }
    },
  });
}
