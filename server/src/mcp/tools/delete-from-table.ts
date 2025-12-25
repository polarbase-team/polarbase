import { FastMCP, UserError } from 'fastmcp';

import { deleteFromTableTool } from '../../agent/tools/delete-from-table';

export default function register(server: FastMCP) {
  server.addTool({
    name: deleteFromTableTool.name,
    description: deleteFromTableTool.description,
    parameters: deleteFromTableTool.inputSchema,
    annotations: {
      title: 'Delete Data from Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await deleteFromTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
