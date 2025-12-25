import { FastMCP, UserError } from 'fastmcp';

import { insertIntoTableTool } from '../../agent/tools/insert-into-table';

export default function register(server: FastMCP) {
  server.addTool({
    name: insertIntoTableTool.name,
    description: insertIntoTableTool.description,
    parameters: insertIntoTableTool.inputSchema,
    annotations: {
      title: 'Insert Data into Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await insertIntoTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
