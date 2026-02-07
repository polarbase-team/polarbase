import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableRecordService } from '../../rest/services/table-record.service';

const recordService = new TableRecordService();

export const queryAgentTools = {
  selectRecords: tool({
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

  insertRecords: tool({
    description: 'Insert new records into a table.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to insert into.'),
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
      tableName: z.string().describe('The name of the table to update.'),
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
      tableName: z.string().describe('The name of the table to delete from.'),
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
    toolChoice: 'required',
    instructions: `You are a Database Query Assistant. 
    You can insert, update, delete, select, and aggregate records from tables.
    Always verify table names and column names before performing operations.
    Use the provided tools to interact with the data.`,
    tools: queryAgentTools,
  });
}
