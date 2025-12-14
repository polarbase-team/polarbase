import { FastMCP, UserError } from 'fastmcp';

import { selectFromTableTool } from '../../agent/tools/select_from_table';

export default function register(server: FastMCP) {
  server.addTool({
    name: selectFromTableTool.name,
    description: selectFromTableTool.description,
    parameters: selectFromTableTool.inputSchema,
    annotations: {
      title: 'Select Data from Table',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async execute(args) {
      try {
        return (await selectFromTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
