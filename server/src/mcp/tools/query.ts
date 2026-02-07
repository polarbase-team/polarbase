import { FastMCP, UserError } from 'fastmcp';

import { queryAgentTools } from '../../agent/agents/query';

export default function registerQueryTools(server: FastMCP) {
  // selectRecords
  server.addTool({
    name: 'selectRecords',
    description: queryAgentTools.selectRecords.description,
    parameters: queryAgentTools.selectRecords.inputSchema as any,
    annotations: {
      title: 'Select Table Records',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        return (await queryAgentTools.selectRecords.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await queryAgentTools.aggregateRecords.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // insertRecords
  server.addTool({
    name: 'insertRecords',
    description: queryAgentTools.insertRecords.description,
    parameters: queryAgentTools.insertRecords.inputSchema as any,
    annotations: {
      title: 'Insert Table Records',
    },
    async execute(args) {
      try {
        return (await queryAgentTools.insertRecords.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // updateRecords
  server.addTool({
    name: 'updateRecords',
    description: queryAgentTools.updateRecords.description,
    parameters: queryAgentTools.updateRecords.inputSchema as any,
    annotations: {
      title: 'Update Table Records',
    },
    async execute(args) {
      try {
        return (await queryAgentTools.updateRecords.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // deleteRecords
  server.addTool({
    name: 'deleteRecords',
    description: queryAgentTools.deleteRecords.description,
    parameters: queryAgentTools.deleteRecords.inputSchema as any,
    annotations: {
      title: 'Delete Table Records',
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return (await queryAgentTools.deleteRecords.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
