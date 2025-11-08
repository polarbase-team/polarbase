import { FastMCP, UserError } from 'fastmcp';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addResourceTemplate({
    uriTemplate: 'db://table/{tableName}/columns',
    name: 'Table Columns',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'tableName',
        description:
          "Name of the table to get columns from. Must be a valid table name from 'db://tables'.",
        required: true,
        async complete() {
          try {
            const tablesResource = await server.embedded('db://tables');
            const tables = JSON.parse(tablesResource.text || '[]') as string[];
            return { values: tables };
          } catch (error) {
            return { values: [] };
          }
        },
      },
    ],
    async load({ tableName }) {
      try {
        let columns: any[] = [];
        if (db.client.config.client === 'pg') {
          columns = await db
            .select('column_name', 'data_type')
            .from('information_schema.columns')
            .where({ table_schema: 'public', table_name: tableName });
        } else if (db.client.config.client === 'mysql') {
          const result = await db.raw(`SHOW COLUMNS FROM \`${tableName}\``);
          columns = result[0].map((row: any) => ({
            column_name: row.Field,
            data_type: row.Type,
          }));
        } else if (db.client.config.client === 'sqlite3') {
          const result = await db.raw(`PRAGMA table_info(${tableName})`);
          columns = result.map((row: any) => ({
            column_name: row.name,
            data_type: row.type,
          }));
        }
        if (columns.length === 0) {
          throw new UserError(`Table ${tableName} not found or has no columns`);
        }
        return {
          text: JSON.stringify(
            columns.map((col: any) => ({
              name: col.column_name,
              type: col.data_type,
            })),
            null,
            2
          ),
        };
      } catch (error) {
        const err = error as any;
        throw new UserError(
          `Failed to fetch columns for table ${tableName}: ${err.message}`
        );
      }
    },
  });
}
