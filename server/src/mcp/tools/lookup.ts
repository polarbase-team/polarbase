import { FastMCP, UserError } from 'fastmcp';

import { lookupAgentTools } from '../../agent/agents/lookup';

export default function registerLookupTools(server: FastMCP) {
  // listTables
  server.addTool({
    name: 'listTables',
    description: lookupAgentTools.listTables.description,
    parameters: lookupAgentTools.listTables.inputSchema as any,
    annotations: {
      title: 'List Database Tables',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await lookupAgentTools.listTables.execute!(args, {} as any),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // getTableSchema
  server.addTool({
    name: 'getTableSchema',
    description: lookupAgentTools.getTableSchema.description,
    parameters: lookupAgentTools.getTableSchema.inputSchema as any,
    annotations: {
      title: 'Get Table Schema',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await lookupAgentTools.getTableSchema.execute!(args, {} as any),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
