import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableRecordService } from '../../../db/services/table-record.service';
import { whereFilterSchema } from '../schemas/where-filter';

const recordService = new TableRecordService();

export const queryAgentTools = {
  queryRecords: tool({
    description: 'Fetch raw rows for viewing. Use for lists or searching.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to query.'),
      query: z.object({
        where: whereFilterSchema.optional(),
        search: z
          .string()
          .optional()
          .describe(
            'Fuzzy text search string that scans all searchable text columns.'
          ),
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
    inputExamples: [
      {
        input: {
          tableName: 'users',
          query: {
            where: { status: 'active' },
            order: 'created_at:desc',
            limit: 10,
          },
        },
      },
      {
        input: {
          tableName: 'products',
          query: {
            search: 'laptop',
            fields: 'id,name,price',
            order: 'price:asc',
            page: 1,
            limit: 20,
          },
        },
      },
    ],
    strict: true,
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
      'Calculate totals, averages, or counts. Use for dashboards or reporting.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to aggregate.'),
      query: z.object({
        select: z
          .array(z.string())
          .describe(
            "Array of fields and aggregation functions (e.g., ['count(*) as total', 'sum(price) as revenue'])."
          ),
        where: whereFilterSchema
          .optional()
          .describe('Filters raw data before aggregation.'),
        group: z
          .array(z.string())
          .optional()
          .describe('Fields to group by (e.g., status).'),
        having: whereFilterSchema
          .optional()
          .describe('Filters groups after aggregation.'),
        order: z
          .string()
          .optional()
          .describe('Ordering string (e.g., "id:asc" or "createdAt:desc").'),
        page: z.number().optional(),
        limit: z.number().optional(),
      }),
    }),
    inputExamples: [
      {
        input: {
          tableName: 'orders',
          query: {
            select: ['count(*) as total_orders', 'sum(amount) as revenue'],
            where: { status: 'completed' },
            group: ['user_id'],
            order: 'revenue:desc',
            limit: 10,
          },
        },
      },
      {
        input: {
          tableName: 'products',
          query: {
            select: [
              'category',
              'avg(price) as avg_price',
              'count(*) as count',
            ],
            group: ['category'],
            having: { 'count(*)': { gt: 5 } },
            order: 'avg_price:desc',
          },
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const result = await recordService.aggregate({
        tableName: args.tableName,
        query: args.query,
      });
      return result;
    },
  }),
};

export function createQueryAgent(
  model: any,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  return new ToolLoopAgent({
    id: 'query-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    instructions: `You are a Database Query Assistant. 
    You can query, and aggregate records from tables.
    Always verify table names and column names before performing operations.
    Use the provided tools to interact with the data.

    ### FILTERING RULES:
    1. **WHERE vs HAVING**: 
      - Use 'where' to filter base rows (e.g., {"status": "active"}).
      - Use 'having' ONLY for filtering results of calculations/aggregations (e.g., {"count(*)": {"gt": 5}}).
    2. **OPERATOR MAPPING**: 
      - For partial matches, use {"column": {"ilike": "%term%"}}.
      - For ranges, use {"column": {"gte": 10, "lte": 50}}.
      - For multiple values, use {"column": {"in": [1, 2, 3]}}.
    3. **LOGIC**: Always use "and" or "or" arrays for combining multiple distinct conditions.`,
    tools: queryAgentTools,
  });
}
