import { FastMCP, UserError } from 'fastmcp';

import { lookupAgentTools } from '../../agent/agents/lookup';
import { responseToContent } from '../utils';

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
        const response = await lookupAgentTools.listTables.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // findTable
  server.addTool({
    name: 'findTable',
    description: lookupAgentTools.findTable.description,
    parameters: lookupAgentTools.findTable.inputSchema as any,
    annotations: {
      title: 'Find Table Schema',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await lookupAgentTools.findTable.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // listIndexes
  server.addTool({
    name: 'listIndexes',
    description: lookupAgentTools.listIndexes.description,
    parameters: lookupAgentTools.listIndexes.inputSchema as any,
    annotations: {
      title: 'List Database Indexes',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await lookupAgentTools.listIndexes.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
