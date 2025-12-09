import { FastMCP, UserError } from 'fastmcp';

import { createTableTool } from '../../agent/tools/create_table';

export default function register(server: FastMCP) {
  server.addTool({
    name: createTableTool.name,
    description: createTableTool.description,
    parameters: createTableTool.inputSchema,
    annotations: {
      title: 'Create Database Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await createTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
