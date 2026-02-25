import { ToolLoopAgent, tool, readUIMessageStream } from 'ai';
import { z } from 'zod';

import { createLookupAgent } from './lookup';
import { createBuilderAgent } from './builder';
import { createEditorAgent } from './editor';
import { createQueryAgent } from './query';

export function createOrchestratorAgent(
  model: any,
  subAgents?: {
    builder?: boolean;
    editor?: boolean;
    query?: boolean;
  },
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  const lookupAgentTools = createLookupAgent(model, generationConfig);
  const tools: any = {
    callLookupAgent: tool({
      description:
        'Call the Lookup Agent for information about the database schema (tables, columns, indexes).',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific database schema task to perform'),
      }),
      inputExamples: [
        { input: { task: 'List all tables in the database' } },
        { input: { task: 'Show me the index for the users table' } },
        { input: { task: 'What columns does the products table have?' } },
        { input: { task: 'List all indexes' } },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await (lookupAgentTools as any).stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

        // Each iteration yields a complete, accumulated UIMessage
        for await (const message of readUIMessageStream({
          stream: result.toUIMessageStream(),
        })) {
          yield message;
        }
      },
      toModelOutput: ({ output: message }: any) => {
        const lastTextPart = message?.parts.findLast(
          (p: any) => p.type === 'text'
        );
        return {
          type: 'text',
          value: lastTextPart?.text ?? 'Task completed.',
        };
      },
    }),
  };

  if (subAgents?.builder) {
    const builderAgent = createBuilderAgent(model, generationConfig);
    tools.callBuilderAgent = tool({
      description:
        'Call the Builder Agent for schema management (creating/updating tables, columns, and indexes).',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific database schema task to perform'),
      }),
      inputExamples: [
        { input: { task: 'Create a users table with email and name columns' } },
        { input: { task: 'Add a bio column to the users table' } },
        {
          input: {
            task: 'Create a unique index on the email column of users table',
          },
        },
        { input: { task: 'Delete the idx_old_index' } },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await (builderAgent as any).stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

        // Each iteration yields a complete, accumulated UIMessage
        for await (const message of readUIMessageStream({
          stream: result.toUIMessageStream(),
        })) {
          yield message;
        }
      },
      toModelOutput: ({ output: message }: any) => {
        const lastTextPart = message?.parts.findLast(
          (p: any) => p.type === 'text'
        );
        return {
          type: 'text',
          value: lastTextPart?.text ?? 'Task completed.',
        };
      },
    });
  }

  if (subAgents?.editor) {
    const editorAgent = createEditorAgent(model, generationConfig);
    tools.callEditorAgent = tool({
      description:
        'Call the Editor Agent for data manipulation (insert, update, delete records).',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific data manipulation task to perform'),
      }),
      inputExamples: [
        { input: { task: 'Insert a new user with email john@example.com' } },
        { input: { task: 'Update all inactive products to active status' } },
        { input: { task: 'Delete all logs older than 2024-01-01' } },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await (editorAgent as any).stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

        // Each iteration yields a complete, accumulated UIMessage
        for await (const message of readUIMessageStream({
          stream: result.toUIMessageStream(),
        })) {
          yield message;
        }
      },
      toModelOutput: ({ output: message }: any) => {
        const lastTextPart = message?.parts.findLast(
          (p: any) => p.type === 'text'
        );
        return {
          type: 'text',
          value: lastTextPart?.text ?? 'Task completed.',
        };
      },
    });
  }

  if (subAgents?.query) {
    const queryAgent = createQueryAgent(model, generationConfig);
    tools.callQueryAgent = tool({
      description: 'Call the Query Agent for data analysis and querying.',
      inputSchema: z.object({
        task: z
          .string()
          .describe('The specific data query or analysis task to perform'),
      }),
      inputExamples: [
        { input: { task: 'Show me all active users' } },
        { input: { task: 'Count total orders by status' } },
        { input: { task: 'Find the top 10 products by revenue' } },
        { input: { task: 'Search for products containing laptop' } },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await (queryAgent as any).stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

        // Each iteration yields a complete, accumulated UIMessage
        for await (const message of readUIMessageStream({
          stream: result.toUIMessageStream(),
        })) {
          yield message;
        }
      },
      toModelOutput: ({ output: message }: any) => {
        const lastTextPart = message?.parts.findLast(
          (p: any) => p.type === 'text'
        );
        return {
          type: 'text',
          value: lastTextPart?.text ?? 'Task completed.',
        };
      },
    });
  }

  return new ToolLoopAgent({
    id: 'orchestrator-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    instructions: `You are a professional Database Architect and Orchestrator. 
    Your goal is to manage the database by routing user requests to specialized sub-agents.

    ### OPERATIONAL PRIORITIES:
    1. SCHEMA VERIFICATION: Before calling the "builder", "editor", or "query" agents, you MUST verify if the tables/columns exist using the "lookup" agent, unless the table names were explicitly provided in the recent conversation context.
    2. AMBIGUITY RESOLUTION: If a user's request is vague (e.g., "add a field"), use the "lookup" agent to find the most relevant table before proceeding.
    3. WORKFLOW CONTINUITY: If a sub-agent has previously been called and is awaiting confirmation or more information (e.g., Builder asking "Are you sure?"), you MUST continue to delegate to that same sub-agent to complete the operation.
    4. DATA VS. SCHEMA: 
      - Use "builder" ONLY for structural changes (CREATE, ALTER, DROP).
      - Use "editor" ONLY for row-level changes (INSERT, UPDATE, DELETE records).
      - Use "query" ONLY for reading or analyzing data.

    ### SAFETY GUARDRAILS:
    - NEVER guess table or column names. 
    - NEVER claim a database modification was successful yourself. Success must be reported based on the tool output of the sub-agent you delegated to.
    - If a sub-agent previously asked for confirmation and the user provides it, call that sub-agent again with the confirmation to trigger the actual tool execution.
    - For destructive requests (dropping tables), the "builder" agent MUST be the one to perform the final execution after it receives the user's confirmation.

    ### ROUTING LOGIC:
    - lookup: Use when the user asks "What tables do I have?", "Show me the columns in X", or when you need to verify existence.
    - builder: Use for any schema changes, including confirmations response related to schema changes.
    - editor: Use for any data records changes, including confirmations response related to records.
    - query: Use for data reading or analysis.`,
    tools,
  });
}
