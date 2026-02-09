import { ToolLoopAgent, tool, readUIMessageStream } from 'ai';
import { z } from 'zod';

import { createLookupAgent } from './lookup';
import { createBuilderAgent } from './builder';
import { createQueryAgent } from './query';

export function createOrchestratorAgent(model: any, temperature?: number) {
  const lookupAgentTools = createLookupAgent(model, temperature);
  const builderAgent = createBuilderAgent(model, temperature);
  const queryAgent = createQueryAgent(model, temperature);

  return new ToolLoopAgent({
    id: 'orchestrator-agent',
    model,
    temperature,
    instructions: `You are a helpful database assistant. 
    Your job is to understand the user request and route it to the appropriate specialized agent.
    - Use the "lookup" agent for tasks related to fetching information about the database schema.
    - Use the "builder" agent for tasks related to creating, updating, or deleting tables and columns (schema changes).
    - Use the "query" agent for tasks related to CRUD operations on data within tables.
    
    You have tools that allow you to "call" these agents. Use them when needed.`,
    tools: {
      callLookupAgent: tool({
        description:
          'Call the Lookup Agent for information about the database schema.',
        inputSchema: z.object({
          task: z
            .string()
            .describe('The specific database schema task to perform'),
        }),
        execute: async function* ({ task }, { abortSignal }) {
          const result = await lookupAgentTools.stream({
            prompt: task,
            abortSignal,
          });

          // Each iteration yields a complete, accumulated UIMessage
          for await (const message of readUIMessageStream({
            stream: result.toUIMessageStream(),
          })) {
            yield message;
          }
        },
      }),

      callBuilderAgent: tool({
        description:
          'Call the Builder Agent for schema management (creating/updating tables and columns).',
        inputSchema: z.object({
          task: z
            .string()
            .describe('The specific database schema task to perform'),
        }),
        execute: async function* ({ task }, { abortSignal }) {
          const result = await builderAgent.stream({
            prompt: task,
            abortSignal,
          });

          // Each iteration yields a complete, accumulated UIMessage
          for await (const message of readUIMessageStream({
            stream: result.toUIMessageStream(),
          })) {
            yield message;
          }
        },
      }),

      callQueryAgent: tool({
        description:
          'Call the Query Agent for data operations (CRUD on records).',
        inputSchema: z.object({
          task: z
            .string()
            .describe('The specific data query or mutation task to perform'),
        }),
        execute: async function* ({ task }, { abortSignal }) {
          const result = await queryAgent.stream({ prompt: task, abortSignal });

          // Each iteration yields a complete, accumulated UIMessage
          for await (const message of readUIMessageStream({
            stream: result.toUIMessageStream(),
          })) {
            yield message;
          }
        },
      }),
    },
  });
}
