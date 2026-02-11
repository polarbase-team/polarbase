import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableRecordService } from '../../rest/services/table-record.service';

const recordService = new TableRecordService();

export const queryAgentTools = {
  queryRecords: tool({
    description:
      'Query records from a table with filtering, searching, and pagination.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to query.'),
      query: z.object({
        where: z
          .record(z.string(), z.any())
          .optional()
          .describe('Filter object (e.g., { name: "Alice" }).'),
        search: z
          .string()
          .optional()
          .describe('Search term to look for across text columns.'),
        fields: z
          .string()
          .optional()
          .describe('Comma-separated list of fields to return.'),
        order: z
          .string()
          .optional()
          .describe('Ordering string (e.g., "id:asc" or "createdAt:desc").'),
        page: z.number().optional(),
        limit: z.number().optional(),
      }),
    }),
    execute: async (args) => {
      const result = await recordService.select({
        tableName: args.tableName,
        query: args.query,
      });
      return result;
    },
  }),

  aggregateRecords: tool({
    description:
      'Perform aggregation queries on a table (COUNT, SUM, AVG, GROUP BY, etc.).',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to aggregate.'),
      query: z.object({
        select: z
          .array(z.string())
          .describe(
            "Array of fields and aggregation functions (e.g., ['count(*) as total', 'sum(price) as revenue'])."
          ),
        where: z
          .record(z.string(), z.any())
          .optional()
          .describe('Filter conditions.'),
        group: z
          .array(z.string())
          .optional()
          .describe('Fields to group by (e.g., status).'),
        having: z
          .record(z.string(), z.any())
          .optional()
          .describe('HAVING clause conditions.'),
        order: z.string().optional().describe('Ordering string.'),
        page: z.number().optional(),
        limit: z.number().optional(),
      }),
    }),
    execute: async (args) => {
      const result = await recordService.aggregate({
        tableName: args.tableName,
        query: args.query,
      });
      return result;
    },
  }),
};

export function createQueryAgent(model: any, temperature?: number) {
  return new ToolLoopAgent({
    id: 'query-agent',
    model,
    temperature,
    toolChoice: 'auto',
    instructions: `You are a Database Query Assistant. 
    You can query, and aggregate records from tables.
    Always verify table names and column names before performing operations.
    Use the provided tools to interact with the data.`,
    tools: queryAgentTools,
  });
}
