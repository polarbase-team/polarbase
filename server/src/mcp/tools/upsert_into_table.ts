import { FastMCP, UserError } from 'fastmcp';

import { upsertIntoTableTool } from '../../agent/tools/upsert_into_table';

export default function register(server: FastMCP) {
  server.addTool({
    name: upsertIntoTableTool.name,
    description: upsertIntoTableTool.description,
    parameters: upsertIntoTableTool.inputSchema,
    annotations: {
      title: 'Upsert Data into Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await upsertIntoTableTool.execute(args)) as any;
      } catch (error) {
        const err = error as Error;
        throw new UserError(err.message);
      }
    },
  });
}
