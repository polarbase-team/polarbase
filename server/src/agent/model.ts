import { streamText, ModelMessage, tool, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createXai } from '@ai-sdk/xai';

import instructions from './instructions';
import { findColumnsTool } from './tools/find-columns';
import { findTablesTool } from './tools/find-tables';
// import { createTableTool } from './tools/create-table';
import { listFromTableTool } from './tools/list-from-table';
import { aggregateFromTableTool } from './tools/aggregate-from-table';
// import { insertIntoTableTool } from './tools/insert-into-table';
// import { updateFromTableTool } from './tools/update-from-table';
import { deleteFromTableTool } from './tools/delete-from-table';

const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL || 'gemini-2.5-flash';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

function resolveModel(modelId: SupportedModel) {
  const map: Record<string, any> = {
    // OpenAI
    'gpt-4o': openai('gpt-4o'),
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'gpt-5': openai('gpt-5'),

    // Google Gemini
    'gemini-2.5-flash': google('gemini-2.5-flash'),
    'gemini-2.5-pro': google('gemini-2.5-pro'),
    'gemini-3-pro-preview': google('gemini-3-pro-preview'),

    // Anthropic
    'claude-opus-4-5': anthropic('claude-opus-4-5'),
    'claude-sonnet-4-5': anthropic('claude-sonnet-4-5'),

    // xAI
    'grok-3': xai('grok-3'),
    'grok-4': xai('grok-4'),
    'grok-4-fast': xai('grok-4-fast'),
  };

  if (!map[modelId]) {
    return google(DEFAULT_MODEL);
  }

  return map[modelId];
}

type SupportedModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus'
  | string;

export async function generateAIResponse({
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.7,
}: {
  messages: ModelMessage[];
  model?: SupportedModel;
  temperature?: number;
}) {
  const selectedModel = resolveModel(model);

  return streamText({
    model: selectedModel,
    system: instructions,
    messages,
    temperature,
    stopWhen: [stepCountIs(10)],
    tools: {
      findColumnsTool: tool(findColumnsTool),
      findTablesTool: tool(findTablesTool),
      // createTableTool: tool(createTableTool),
      listFromTableTool: tool(listFromTableTool),
      aggregateFromTableTool: tool(aggregateFromTableTool),
      // insertIntoTableTool: tool(insertIntoTableTool),
      // updateFromTableTool: tool(updateFromTableTool),
      deleteFromTableTool: tool(deleteFromTableTool),
    },
  });
}
