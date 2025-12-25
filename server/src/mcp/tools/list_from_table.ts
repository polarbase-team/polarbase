import { FastMCP, UserError } from 'fastmcp';

import { listFromTableTool } from '../../agent/tools/list_from_table';

export default function register(server: FastMCP) {
  server.addTool({
    name: listFromTableTool.name,
    description: listFromTableTool.description,
    parameters: listFromTableTool.inputSchema,
    annotations: {
      title: 'List Data from Table',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async execute(args) {
      try {
        return (await listFromTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
