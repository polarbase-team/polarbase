import { FastMCP, UserError } from 'fastmcp';

import { findColumnsTool } from '../../agent/tools/find-columns';

export default function register(server: FastMCP) {
  server.addTool({
    name: findColumnsTool.name,
    description: findColumnsTool.description,
    parameters: findColumnsTool.inputSchema,
    annotations: {
      title: 'Find Table Columns',
      readOnlyHint: true,
      destructiveHint: false,
    },
    async execute(args) {
      try {
        return (await findColumnsTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
