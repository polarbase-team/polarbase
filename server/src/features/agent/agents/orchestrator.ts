import { ToolLoopAgent, tool, readUIMessageStream } from 'ai';
import { z } from 'zod';

import { createMemoryTool, readCoreMemory } from '../memory';
import { createDatabaseAgent } from './database/agent';
import { createBrowserAgent } from './browser/agent';
import { createFetchApiAgent } from './fetch-api/agent';
import {
  buildSkillsPrompt,
  skillTools,
  createSandbox,
  getDiscoveredSkills,
} from '../skill';

const WORKING_DIR = process.env.AGENT_SANDBOX_WORKING_DIR || '.agents';
const SANDBOX_MODE: 'fs' | 'vm' =
  (process.env.AGENT_SANDBOX_MODE as 'fs' | 'vm') || 'fs';

export function createRootOrchestrator(
  model: any,
  sessionId: string,
  agents?: {
    database?: {
      builder?: boolean;
      editor?: boolean;
      query?: boolean;
    };
    browser?: boolean;
    fetchApi?: boolean;
  },
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  const tools: any = {
    memory: createMemoryTool(sessionId),
  };

  // Database Agent Tool
  if (agents?.database) {
    const databaseAgent = createDatabaseAgent(
      model,
      agents.database,
      generationConfig
    );
    tools.callDatabaseAgent = tool({
      description:
        'Call the Database Agent to perform database operations like reading schema, querying data, creating structures, or managing records.',
      inputSchema: z.object({
        task: z.string().describe('The specific database task to perform'),
      }),
      inputExamples: [
        { input: { task: 'List all tables and create a new users table' } },
        { input: { task: 'Search the products table for laptops' } },
        { input: { task: 'Update John Doe email to john.doe@example.com' } },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await databaseAgent.stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

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

  // Browser Agent
  if (agents?.browser) {
    const browserAgent = createBrowserAgent(model, generationConfig);
    tools.callBrowserAgent = tool({
      description:
        'Call the Browser Agent for web automation, crawling, or scraping.',
      inputSchema: z.object({
        task: z.string().describe('The browser automation task to perform'),
      }),
      inputExamples: [
        {
          input: {
            task: 'Navigate to https://example.com and get the page title',
          },
        },
        { input: { task: 'Search Google for "playwright web scraping"' } },
        {
          input: {
            task: 'Extract all links from https://news.ycombinator.com',
          },
        },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await browserAgent.stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

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

  // Fetch API Agent
  if (agents?.fetchApi) {
    const fetchApiAgent = createFetchApiAgent(model, generationConfig);
    tools.callFetchApiAgent = tool({
      description:
        'Call the Fetch API Agent to make HTTP/HTTPS calls using the fetch API, useful for consuming external APIs.',
      inputSchema: z.object({
        task: z
          .string()
          .describe(
            'The API automation task to perform (which API to call, with what parameters).'
          ),
      }),
      inputExamples: [
        {
          input: {
            task: 'Fetch the latest weather for London using wttr.in/London?format=j1',
          },
        },
        {
          input: {
            task: 'POST a new issue titled "Bug report" to https://api.github.com/repos/USER/REPO/issues with body {"title": "Bug report"}',
          },
        },
      ],
      strict: true,
      execute: async function* ({ task }, { abortSignal, messages }) {
        const result = await fetchApiAgent.stream({
          messages: [...messages, { role: 'user', content: task }],
          abortSignal,
        });

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

  const today = new Date().toISOString().slice(0, 10);

  return new ToolLoopAgent({
    id: 'root-orchestrator',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    prepareCall: async (settings) => {
      const coreMemory = readCoreMemory(sessionId);
      const coreMemoryBlock = coreMemory
        ? `\n\nCore Memory (known user facts):\n${coreMemory}`
        : '';

      const sandbox = createSandbox(WORKING_DIR, SANDBOX_MODE);
      const skills = await getDiscoveredSkills();
      if (skills.length > 0) {
        settings.tools = Object.assign(settings.tools, skillTools);
      }

      return {
        ...settings,
        // Trim to last 20 messages to save tokens; older history is in recall memory
        messages: (settings.messages ?? []).slice(-20),
        experimental_context: { sandbox, skills },
        instructions: `Today's date is ${today}.${coreMemoryBlock}

You are the PolarBase System Orchestrator. 
Your job is to understand the user's ultimate goal and route requests to the correct domain-specific sub-agent.

Available Sub-Agents (if enabled):
- Database Agent: Use for ANY database queries, schema modifications, lookups, row inserts/updates.
- Browser Agent: Use for opening web pages, searching the web, or scraping web content.
- Fetch API Agent: Use for making fetch REST/HTTP requests to external APIs.

${buildSkillsPrompt(skills)}

### MEMORY:
- You have a memory tool for storing and recalling information across conversations.
- Before answering, consider if the query depends on user preferences or past context — if so, search memory first.
- Store important user facts (name, preferences, constraints) as core memories.
- Store detailed observations and summaries as notes.
- Keep memory operations invisible in your user-facing replies.

### ROUTING INSTRUCTIONS:
- Determine which sub-agent is most appropriate for the user's task.
- If a task involves multiple domains (e.g. scrape a website and save to database), call the Browser Agent first, then call the Database Agent with the extracted information.
- DO NOT attempt to answer queries directly if a sub-agent is better suited to gather the data or execute the action.
- Forward confirmations (e.g., "Yes, proceed") to the agent that last asked for confirmation.`,
      };
    },
    tools,
  });
}
