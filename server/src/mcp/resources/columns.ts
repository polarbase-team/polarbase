import { FastMCP, UserError } from 'fastmcp';

import { builderAgentTools } from '../../agent/agents/builder';

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
            const tablesData = JSON.parse(tablesResource.text || '[]') as any[];
            const tables = Array.isArray(tablesData)
              ? tablesData.map((t) => (typeof t === 'string' ? t : t.name))
              : [];
            return { values: tables };
          } catch (error) {
            return { values: [] };
          }
        },
      },
    ],
    async load({ tableName }) {
      try {
        const result = (await builderAgentTools.findColumns.execute!(
          { tableName },
          {} as any
        )) as any;
        return {
          text: JSON.stringify(result.columns, null, 2),
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
