import { FastMCP, UserError } from 'fastmcp';
import db from '../../plugins/db';

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
        const columns = await db
          .select('column_name', 'data_type')
          .from('information_schema.columns')
          .where({ table_schema: 'public', table_name: tableName });
        if (columns.length === 0) {
          throw new UserError(`Table ${tableName} not found or has no columns`);
        }
        return {
          text: JSON.stringify(
            columns.map((col) => ({
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
