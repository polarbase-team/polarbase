import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'findTables',
    description: `
      Retrieves a list of all tables in the database.
      Use this tool to get valid table names before calling other tools like 'selectFromTable', 'insertIntoTable', etc.
      Returns a JSON array of table names.
    `,
    parameters: z.object({}),
    annotations: {
      title: 'Find Database Tables',
      readOnlyHint: true,
      destructiveHint: false,
    },
    async execute(args, { log }) {
      try {
        let tables: any[] = [];
        if (db.client.config.client === 'pg') {
          const result = await db
            .select('table_name')
            .from('information_schema.tables')
            .where({ table_schema: 'public' });
          tables = result.map((row) => row.table_name);
        } else if (db.client.config.client === 'mysql') {
          const result = await db.raw('SHOW TABLES');
          tables = result[0].map((row) => Object.values(row)[0]);
        } else if (db.client.config.client === 'sqlite3') {
          const result = await db
            .select('name')
            .from('sqlite_master')
            .where({ type: 'table' });
          tables = result.map((row) => row.name);
        }
        log.info('Fetched table list', { tables });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'success', tables }, null, 2),
            },
          ],
        };
      } catch (error) {
        const err = error as Error;
        log.error('Failed to fetch tables', { error: err.message });
        throw new UserError(`Failed to fetch tables: ${err.message}`);
      }
    },
  });
}
