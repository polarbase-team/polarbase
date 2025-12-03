import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../plugins/db';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'findColumns',
    description: `
      Retrieves the list of columns and their data types for a specific table.
      Use this tool to validate column names before calling tools like 'selectFromTable', 'insertIntoTable', etc.
      Returns a JSON array of objects with column names and types.
      First, call 'findTables' to ensure the table name is valid.
    `,
    parameters: z.object({
      table: z
        .string()
        .describe(
          "Name of the table to get columns for. Must be a valid table name from 'findTables'."
        ),
    }),
    annotations: {
      title: 'Find Table Columns',
      readOnlyHint: true,
      destructiveHint: false,
    },
    async execute(args, { log }) {
      try {
        const { table } = args;

        // Validate table name
        const result = await db
          .select('table_name')
          .from('information_schema.tables')
          .where({ table_schema: 'public' });
        const tables = result.map((row) => row.table_name);
        if (!tables.includes(table)) {
          throw new UserError(
            `Table '${table}' does not exist. Use 'findTables' to get valid table names: ${JSON.stringify(
              tables
            )}`
          );
        }

        // Fetch columns
        const columns = await db
          .select('column_name', 'data_type')
          .from('information_schema.columns')
          .where({ table_schema: 'public', table_name: table });
        if (columns.length === 0) {
          throw new UserError(`Table ${table} has no columns`);
        }

        const columnList = columns.map((col) => ({
          name: col.column_name,
          type: col.data_type,
        }));
        log.info('Fetched columns for table', { table, columns: columnList });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { status: 'success', table, columns: columnList },
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
        throw new UserError(
          `Failed to fetch columns for table ${args.table}: ${err.message}`
        );
      }
    },
  });
}
