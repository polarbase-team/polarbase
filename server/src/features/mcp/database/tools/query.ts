import { FastMCP, UserError } from 'fastmcp';

import { queryAgentTools } from '../../../agent/agents/database/subagents/query';
import { responseToContent } from '../../shared/utils';

export default function registerQueryTools(server: FastMCP) {
  // queryRecords
  server.addTool({
    name: 'queryRecords',
    description: queryAgentTools.queryRecords.description,
    parameters: queryAgentTools.queryRecords.inputSchema as any,
    annotations: {
      title: 'Query Table Records',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await queryAgentTools.queryRecords.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // aggregateRecords
  server.addTool({
    name: 'aggregateRecords',
    description: queryAgentTools.aggregateRecords.description,
    parameters: queryAgentTools.aggregateRecords.inputSchema as any,
    annotations: {
      title: 'Aggregate Table Records',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await queryAgentTools.aggregateRecords.execute!(
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
