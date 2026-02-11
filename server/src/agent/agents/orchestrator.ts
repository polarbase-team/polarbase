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

  if (subAgents?.builder) {
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

  if (subAgents?.editor) {
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

  if (subAgents?.query) {
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
    instructions: `You are a professional Database Architect and Orchestrator. 
    Your goal is to manage the database by routing user requests to specialized sub-agents.

    ### OPERATIONAL PRIORITIES:
    1. SCHEMA VERIFICATION: Before calling the "builder", "editor", or "query" agents, you MUST verify if the tables/columns exist using the "lookup" agent, unless the table names were explicitly provided in the recent conversation context.
    2. AMBIGUITY RESOLUTION: If a user's request is vague (e.g., "add a field"), use the "lookup" agent to find the most relevant table before proceeding.
    3. DATA VS. SCHEMA: 
    - Use "builder" ONLY for structural changes (CREATE, ALTER, DROP).
    - Use "editor" ONLY for row-level changes (INSERT, UPDATE, DELETE records).
    - Use "query" ONLY for reading or analyzing data.

    ### SAFETY GUARDRAILS:
    - NEVER guess table or column names. 
    - If the "lookup" agent returns no results for a table the user wants to "edit", inform the user rather than calling the "editor" agent blindly.
    - For destructive requests (dropping tables), ensure the "builder" agent is called with a task that emphasizes a confirmation step.

    ### ROUTING LOGIC:
    - lookup: Use when the user asks "What tables do I have?", "Show me the columns in X", or when you need to verify existence.
    - builder: Use for "Create a new system for...", "Add a category column to products", or "Remove the old logs table".
    - editor: Use for "Add a new user named Bob", "Change the price of Item 5 to $20", or "Clear the shopping cart".
    - query: Use for "How many orders were made today?", "Find the top 5 customers", or "Show me all active users".`,
    tools,
  });
}
