import { FastMCP, UserError } from 'fastmcp';

import { lookupAgentTools } from '../../../agent/agents/database/subagents/lookup';

export default function register(server: FastMCP) {
  server.addResource({
    uri: 'db://indexes',
    name: 'Database Indexes',
    mimeType: 'application/json',
    async load() {
      try {
        const result = (await lookupAgentTools.listIndexes.execute!(
          {},
          {} as any
        )) as any;
        return {
          text: JSON.stringify(result.indexes, null, 2),
        };
      } catch (error) {
        const err = error as Error;
        throw new UserError(`Failed to fetch indexes: ${err.message}`);
      }
    },
  });

  server.addResourceTemplate({
    uriTemplate: 'db://table/{tableName}/indexes',
    name: 'Table Indexes',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'tableName',
        description:
          "Name of the table to get indexes for. Must be a valid table name from 'db://tables'.",
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
        const result = (await lookupAgentTools.listIndexes.execute!(
          { tableName },
          {} as any
        )) as any;
        return {
          text: JSON.stringify(result.indexes, null, 2),
        };
      } catch (error) {
        const err = error as any;
        throw new UserError(
          `Failed to fetch indexes for table ${tableName}: ${err.message}`
        );
      }
    },
  });
}
