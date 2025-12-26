import { FastMCP, UserError } from 'fastmcp';

import { aggregateFromTableTool } from '../../agent/tools/aggregate-from-table';

export default function register(server: FastMCP) {
  server.addTool({
    name: aggregateFromTableTool.name,
    description: aggregateFromTableTool.description,
    parameters: aggregateFromTableTool.inputSchema,
    annotations: {
      title: 'Aggregate Data from Table',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async execute(args) {
      try {
        return (await aggregateFromTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
