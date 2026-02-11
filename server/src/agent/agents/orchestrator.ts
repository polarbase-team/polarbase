import { ToolLoopAgent, tool, readUIMessageStream } from 'ai';
import { z } from 'zod';

import { createLookupAgent } from './lookup';
import { createBuilderAgent } from './builder';
import { createEditorAgent } from './editor';
import { createQueryAgent } from './query';

export function createOrchestratorAgent(
  model: any,
  temperature?: number,
  subAgents?: {
    builder?: boolean;
    editor?: boolean;
    query?: boolean;
  }
) {
  const lookupAgentTools = createLookupAgent(model, temperature);
  const tools: any = {
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
  };

  const isBuilderAgentEnabled = subAgents?.builder;
  if (isBuilderAgentEnabled) {
    const builderAgent = createBuilderAgent(model, temperature);
    tools.callBuilderAgent = tool({
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
    });
  }

  const isEditorAgentEnabled = subAgents?.editor;
  if (isEditorAgentEnabled) {
    const editorAgent = createEditorAgent(model, temperature);
    tools.callEditorAgent = tool({
      description:
        'Call the Editor Agent for data manipulation (insert, update, delete records).',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific data manipulation task to perform'),
      }),
      execute: async function* ({ task }, { abortSignal }) {
        const result = await editorAgent.stream({ prompt: task, abortSignal });

        // Each iteration yields a complete, accumulated UIMessage
        for await (const message of readUIMessageStream({
          stream: result.toUIMessageStream(),
        })) {
          yield message;
        }
      },
    });
  }

  const isQueryAgentEnabled = subAgents?.query;
  if (isQueryAgentEnabled) {
    const queryAgent = createQueryAgent(model, temperature);
    tools.callQueryAgent = tool({
      description: 'Call the Query Agent for data analysis and querying.',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific data query or analysis task to perform'),
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
    });
  }

  return new ToolLoopAgent({
    id: 'orchestrator-agent',
    model,
    temperature,
    instructions: `You are a helpful database assistant. 
    Your job is to understand the user request and route it to the appropriate specialized agent.
    - Use the "lookup" agent for tasks related to fetching information about the database schema.

    ${isBuilderAgentEnabled ? '- Use the "builder" agent for tasks related to creating, updating, or deleting tables and columns (schema changes).\n' : ''}
    ${isEditorAgentEnabled ? '- Use the "editor" agent for tasks related to data manipulation (insert, update, delete records).\n' : ''}
    ${isQueryAgentEnabled ? '- Use the "query" agent for tasks related to data analysis and querying.\n' : ''}
    
    You have tools that allow you to "call" these agents. Use them when needed.`,
    tools,
  });
}
