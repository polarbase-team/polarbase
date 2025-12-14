import { FastMCP, UserError } from 'fastmcp';

import { findTablesTool } from '../../agent/tools/find_tables';

export default function register(server: FastMCP) {
  server.addTool({
    name: findTablesTool.name,
    description: findTablesTool.description,
    parameters: findTablesTool.inputSchema,
    annotations: {
      title: 'Find Database Tables',
      readOnlyHint: true,
      destructiveHint: false,
    },
    async execute(args) {
      try {
        return (await findTablesTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
