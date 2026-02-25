import { FastMCP, UserError } from 'fastmcp';

import { builderAgentTools } from '../../agent/agents/builder';
import { responseToContent } from '../utils';

export default function registerBuilderTools(server: FastMCP) {
  // createMultipleTables
  server.addTool({
    name: 'createMultipleTables',
    description: builderAgentTools.createMultipleTables.description,
    parameters: builderAgentTools.createMultipleTables.inputSchema as any,
    annotations: {
      title: 'Create Multiple Tables',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.createMultipleTables.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // createTable
  server.addTool({
    name: 'createTable',
    description: builderAgentTools.createTable.description,
    parameters: builderAgentTools.createTable.inputSchema as any,
    annotations: {
      title: 'Create Database Table',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.createTable.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // updateTable
  server.addTool({
    name: 'updateTable',
    description: builderAgentTools.updateTable.description,
    parameters: builderAgentTools.updateTable.inputSchema as any,
    annotations: {
      title: 'Update Database Table',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.updateTable.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // deleteTable
  server.addTool({
    name: 'deleteTable',
    description: builderAgentTools.deleteTable.description,
    parameters: builderAgentTools.deleteTable.inputSchema as any,
    annotations: {
      title: 'Delete Database Table',
      destructiveHint: true,
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.deleteTable.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // createColumn
  server.addTool({
    name: 'createColumn',
    description: builderAgentTools.createColumn.description,
    parameters: builderAgentTools.createColumn.inputSchema as any,
    annotations: {
      title: 'Create Table Column',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.createColumn.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // updateColumn
  server.addTool({
    name: 'updateColumn',
    description: builderAgentTools.updateColumn.description,
    parameters: builderAgentTools.updateColumn.inputSchema as any,
    annotations: {
      title: 'Update Table Column',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.updateColumn.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // deleteColumn
  server.addTool({
    name: 'deleteColumn',
    description: builderAgentTools.deleteColumn.description,
    parameters: builderAgentTools.deleteColumn.inputSchema as any,
    annotations: {
      title: 'Delete Table Column',
      destructiveHint: true,
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.deleteColumn.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // createIndex
  server.addTool({
    name: 'createIndex',
    description: builderAgentTools.createIndex.description,
    parameters: builderAgentTools.createIndex.inputSchema as any,
    annotations: {
      title: 'Create Database Index',
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.createIndex.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // deleteIndex
  server.addTool({
    name: 'deleteIndex',
    description: builderAgentTools.deleteIndex.description,
    parameters: builderAgentTools.deleteIndex.inputSchema as any,
    annotations: {
      title: 'Delete Database Index',
      destructiveHint: true,
    },
    async execute(args) {
      try {
        const response = await builderAgentTools.deleteIndex.execute!(
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
