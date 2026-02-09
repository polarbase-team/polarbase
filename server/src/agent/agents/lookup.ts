import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableService } from '../../rest/services/table.service';

const tableService = new TableService();

export const lookupAgentTools = {
  listTables: tool({
    description: 'List all tables in the database.',
    inputSchema: z.object({}),
    execute: async () => {
      const tables = await tableService.getAll();
      const blacklist = (process.env.AGENT_BLACKLISTED_TABLES || '').split(',');
      return {
        tables: tables
          .filter((t) => !blacklist.includes(t.name))
          .map((t) => t.name),
      };
    },
  }),

  getTableSchema: tool({
    description: 'Get detailed column information for a specific table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to get columns for.'),
    }),
    execute: async ({ tableName }) => {
      const table = await tableService.getSchema({ tableName });
      if (!table) {
        throw new Error(`Table ${tableName} not found.`);
      }
      return {
        tableName,
        columns: table,
      };
    },
  }),
};

export function createLookupAgent(model: any, temperature?: number) {
  return new ToolLoopAgent({
    id: 'lookup-agent',
    model,
    temperature,
    toolChoice: 'required',
    instructions: `You are a Database Schema Lookup Agent. 
    You can find tables and columns in the database.`,
    tools: lookupAgentTools,
  });
}
