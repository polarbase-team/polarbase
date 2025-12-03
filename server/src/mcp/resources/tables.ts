import { FastMCP, UserError } from 'fastmcp';
import db from '../../plugins/db';

export default function register(server: FastMCP) {
  server.addResource({
    uri: 'db://tables',
    name: 'Database Tables',
    mimeType: 'application/json',
    async load() {
      try {
        const result = await db
          .select('table_name')
          .from('information_schema.tables')
          .where({ table_schema: 'public' });
        const tables = result.map((row) => row.table_name);
        return {
          text: JSON.stringify(tables, null, 2),
        };
      } catch (error) {
        const err = error as Error;
        throw new UserError(`Failed to fetch tables: ${err.message}`);
      }
    },
  });
}
