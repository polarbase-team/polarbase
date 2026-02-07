import { FastMCP, UserError } from 'fastmcp';

import { builderAgentTools } from '../../agent/agents/builder';

export default function registerBuilderTools(server: FastMCP) {
  // listTables
  server.addTool({
    name: 'listTables',
    description: builderAgentTools.listTables.description,
    parameters: builderAgentTools.listTables.inputSchema as any,
    annotations: {
      title: 'List Database Tables',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        return (await builderAgentTools.listTables.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // findColumns
  server.addTool({
    name: 'findColumns',
    description: builderAgentTools.findColumns.description,
    parameters: builderAgentTools.findColumns.inputSchema as any,
    annotations: {
      title: 'Find Table Columns',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        return (await builderAgentTools.findColumns.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.createTable.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.updateTable.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.deleteTable.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.createColumn.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.updateColumn.execute!(
          args as any,
          {} as any
        )) as any;
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
        return (await builderAgentTools.deleteColumn.execute!(
          args as any,
          {} as any
        )) as any;
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
