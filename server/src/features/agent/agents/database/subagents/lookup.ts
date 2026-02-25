import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableService } from '../../../../../db/services/table.service';
import { IndexService } from '../../../../../db/services/index.service';

const tableService = new TableService();
const indexService = new IndexService();

export const lookupAgentTools = {
  listTables: tool({
    description: 'List all tables in the database.',
    inputSchema: z.object({}),
    inputExamples: [{ input: {} }],
    strict: true,
    execute: async () => {
      const tables = await tableService.getAll();
      return { tables };
    },
  }),

  findTable: tool({
    description:
      'Find a specific table and get its detailed information (optionally including columns).',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to find.'),
      includeSchema: z
        .boolean()
        .default(true)
        .describe(
          'Whether to include the full column list (schema) in the result.'
        ),
    }),
    inputExamples: [
      { input: { tableName: 'users', includeSchema: true } },
      { input: { tableName: 'products', includeSchema: false } },
    ],
    strict: true,
    execute: async ({ tableName, includeSchema }) => {
      const table = await tableService.getOne({ tableName, includeSchema });
      return {
        ...table,
        schema: table.schema?.map(({ metadata, ...rest }) => rest),
      };
    },
  }),

  listIndexes: tool({
    description: 'List all indexes in the database or for a specific table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .optional()
        .describe('Optional table name to filter indexes.'),
    }),
    inputExamples: [{ input: {} }, { input: { tableName: 'users' } }],
    strict: true,
    execute: async ({ tableName }) => {
      const indexes = await indexService.getAll({ tableName });
      return { indexes };
    },
  }),
};

export function createLookupAgent(
  model: any,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  return new ToolLoopAgent({
    id: 'lookup-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    toolChoice: 'required',
    instructions: `You are a Database Schema Lookup Agent. 
    You can find tables, columns and indexes in the database.
    
    IMPORTANT: When you have finished, write a clear summary of your findings as your final response.
    This summary will be returned to the main agent, so include all relevant information.`,
    tools: lookupAgentTools,
  });
}
