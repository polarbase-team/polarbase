import { FastMCP, UserError } from 'fastmcp';

import { loadColumns } from '../../agent/resources/columns';

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
        return await loadColumns(tableName);
      } catch (error) {
        const err = error as any;
        throw new UserError(
          `Failed to fetch columns for table ${tableName}: ${err.message}`
        );
      }
    },
  });
}
