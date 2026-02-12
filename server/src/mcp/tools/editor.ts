import { FastMCP, UserError } from 'fastmcp';

import { editorAgentTools } from '../../agent/agents/editor';

export default function registerEditorTools(server: FastMCP) {
  // insertRecords
  server.addTool({
    name: 'insertRecords',
    description: editorAgentTools.insertRecords.description,
    parameters: editorAgentTools.insertRecords.inputSchema as any,
    annotations: {
      title: 'Insert Table Records',
    },
    async execute(args) {
      try {
        return JSON.stringify(
          await editorAgentTools.insertRecords.execute!(args as any, {} as any)
        );
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  // updateRecords
  server.addTool({
    name: 'updateRecords',
    description: editorAgentTools.updateRecords.description,
    parameters: editorAgentTools.updateRecords.inputSchema as any,
    annotations: {
      title: 'Update Table Records',
    },
    async execute(args) {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await editorAgentTools.updateRecords.execute!(args, {} as any),
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

  // deleteRecords
  server.addTool({
    name: 'deleteRecords',
    description: editorAgentTools.deleteRecords.description,
    parameters: editorAgentTools.deleteRecords.inputSchema as any,
    annotations: {
      title: 'Delete Table Records',
      destructiveHint: true,
    },
    async execute(args) {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await editorAgentTools.deleteRecords.execute!(args, {} as any),
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
