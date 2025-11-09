import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'updateFromTable',
    description: `
      Updates records in a database table based on a WHERE condition.
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in 'data' and 'where'.
      - Ensure data and WHERE condition match the table's column types and constraints.
    `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to update. Call 'findTables' to get valid table names."
        ),
      data: z
        .record(z.any())
        .refine((obj) => Object.keys(obj).length >= 1, {
          message: 'At least one column to update is required',
        })
        .describe(
          "Key-value object with columns and values to update. Keys must be valid column names; call 'findColumns' to validate."
        ),
      where: z
        .record(z.any())
        .refine((obj) => Object.keys(obj).length >= 1, {
          message: 'At least one column to update is required',
        })
        .describe(
          "Key-value pairs for WHERE conditions, e.g., { id: 1 }. Keys must be valid column names; call 'findColumns' to validate."
        ),
    }),
    annotations: {
      title: 'Update Data in Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { table, data, where } = args;

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
        const query = db(table).update(data).where(where);

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
