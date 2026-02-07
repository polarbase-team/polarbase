import { FastMCP, UserError } from 'fastmcp';

import { builderAgentTools } from '../../agent/agents/builder';

export default function register(server: FastMCP) {
  server.addResource({
    uri: 'db://tables',
    name: 'Database Tables',
    mimeType: 'application/json',
    async load() {
      try {
        const result = (await builderAgentTools.listTables.execute!(
          {},
          {} as any
        )) as any;
        return {
          text: JSON.stringify(result.tables, null, 2),
        };
      } catch (error) {
        const err = error as Error;
        throw new UserError(`Failed to fetch tables: ${err.message}`);
      }
    },
  });
}
