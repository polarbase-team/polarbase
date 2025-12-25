import { FastMCP, UserError } from 'fastmcp';

import { updateFromTableTool } from '../../agent/tools/update-from-table';

export default function register(server: FastMCP) {
  server.addTool({
    name: updateFromTableTool.name,
    description: updateFromTableTool.description,
    parameters: updateFromTableTool.inputSchema,
    annotations: {
      title: 'Update Data in Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await updateFromTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
