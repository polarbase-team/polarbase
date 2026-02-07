import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { createBuilderAgent } from './builder';
import { createQueryAgent } from './query';

export function createOrchestratorAgent(model: any, temperature?: number) {
  const builderAgent = createBuilderAgent(model, temperature);
  const queryAgent = createQueryAgent(model, temperature);

  return new ToolLoopAgent({
    id: 'orchestrator-agent',
    model,
    temperature,
    instructions: `You are a helpful database assistant. 
    Your job is to understand the user request and route it to the appropriate specialized agent.
    - Use the "builder" agent for tasks related to creating, updating, or deleting tables and columns (schema changes).
    - Use the "query" agent for tasks related to CRUD operations on data within tables.
    
    You have tools that allow you to "call" these agents. Use them when needed.`,
    tools: {
      callBuilder: tool({
        description:
          'Call the Builder Agent for schema management (creating/updating tables and columns).',
        inputSchema: z.object({
          task: z
            .string()
            .describe('The specific database schema task to perform'),
        }),
        execute: async ({ task }) => {
          const result = await builderAgent.generate({ prompt: task });
          return result.text;
        },
      }),
      callQuery: tool({
        description:
          'Call the Query Agent for data operations (CRUD on records).',
        inputSchema: z.object({
          task: z
            .string()
            .describe('The specific data query or mutation task to perform'),
        }),
        execute: async ({ task }) => {
          const result = await queryAgent.generate({ prompt: task });
          return result.text;
        },
      }),
    },
  });
}
