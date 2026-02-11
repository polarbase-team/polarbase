import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableRecordService } from '../../rest/services/table-record.service';

const recordService = new TableRecordService();

export const editorAgentTools = {
  insertRecords: tool({
    description: 'Insert new records into a table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to insert into. (e.g., "users")'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('An array of objects representing the records to insert.'),
    }),
    execute: async (args) => {
      const result = await recordService.insert(args);
      return { status: 'success', ...result };
    },
  }),

  updateRecords: tool({
    description: 'Update existing records in a table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to update. (e.g., "users")'),
      updates: z
        .array(
          z.object({
            where: z
              .record(z.string(), z.any())
              .describe('Conditions to identify records to update.'),
            data: z
              .record(z.string(), z.any())
              .describe('New values for the records.'),
          })
        )
        .describe('An array of update operations.'),
    }),
    execute: async (args) => {
      const result = await recordService.update(args as any);
      return { status: 'success', ...result };
    },
  }),

  deleteRecords: tool({
    description: 'Delete records from a table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to delete from. (e.g., "users")'),
      where: z
        .record(z.string(), z.any())
        .describe('Conditions to identify records to delete.'),
    }),
    execute: async (args) => {
      const result = await recordService.delete({
        tableName: args.tableName,
        condition: { where: args.where },
      });
      return { status: 'success', ...result };
    },
  }),
};

export function createEditorAgent(model: any, temperature?: number) {
  return new ToolLoopAgent({
    id: 'editor-agent',
    model,
    temperature,
    toolChoice: 'auto',
    instructions: `You are a Database Editor Assistant. 
    You can insert, update, delete records from tables.
    Always verify table names and column names before performing operations.
    Use the provided tools to interact with the data.`,
    tools: editorAgentTools,
  });
}
