import { FastMCP, UserError } from 'fastmcp';
import db from '../../plugins/db';

export default function register(server: FastMCP) {
  server.addResource({
    uri: 'db://tables',
    name: 'Database Tables',
    mimeType: 'application/json',
    async load() {
      try {
        let tables: string[] = [];
        if (db.client.config.client === 'pg') {
          const result = await db
            .select('table_name')
            .from('information_schema.tables')
            .where({ table_schema: 'public' });
          tables = result.map((row: any) => row.table_name);
        } else if (db.client.config.client === 'mysql') {
          const result = await db.raw('SHOW TABLES');
          tables = result[0].map((row: any) => Object.values(row)[0]);
        } else if (db.client.config.client === 'sqlite3') {
          const result = await db
            .select('name')
            .from('sqlite_master')
            .where({ type: 'table' });
          tables = result.map((row: any) => row.name);
        }
        return {
          text: JSON.stringify(tables, null, 2),
        };
      } catch (error) {
        const err = error as any;
        throw new UserError(`Failed to fetch tables: ${err.message}`);
      }
    },
  });
}
