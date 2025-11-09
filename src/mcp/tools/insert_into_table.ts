import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'insertIntoTable',
    description: `
      Inserts one or more records into a database table.
      Steps for AI:
      - Call 'findTables' to validate the table name for the 'table' parameter.
      - Call 'findColumns' with the table name to validate column names in the 'data' parameter.
      - Ensure data matches the table's column types and constraints.
    `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to insert into. Call 'findTables' to get valid table names."
        ),
      data: z
        .array(z.record(z.any()))
        .min(1, 'At least one record is required')
        .describe(
          "Array of records to insert, each as a key-value object. Keys must be valid column names; call 'findColumns' to validate."
        ),
    }),
    annotations: {
      title: 'Insert Data into Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { table, data } = args;

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

        // Build Knex query
        const query = db(table).insert(data);

        // Execute query
        const result = await query;

        // Log insert completion
        log.info('Insert completed', {
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
                  message: `Inserted ${result.length || result} record(s) into '${table}'.`,
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
        throw new UserError(err.message || 'Failed to insert data');
      }
    },
  });
}
