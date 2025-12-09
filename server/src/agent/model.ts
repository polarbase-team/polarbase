import { streamText, ModelMessage, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';

import { createTableTool } from './tools/create_table';
import { deleteFromTableTool } from './tools/delete_from_table';
import { findColumnsTool } from './tools/find_coumns';
import { findTablesTool } from './tools/find_tables';
import { insertIntoTableTool } from './tools/insert_into_table';
import { selectFromTableTool } from './tools/select_from_table';
import { updateFromTableTool } from './tools/update_from_table';
import { upsertIntoTableTool } from './tools/upsert_into_table';
import instructions from './instructions';

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

function resolveModel(modelId: SupportedModel) {
  const map: Record<string, any> = {
    // OpenAI
    'gpt-4o': openai('gpt-4o'),
    'gpt-4o-mini': openai('gpt-4o-mini'),

    // Google Gemini
    'gemini-2.5-flash': google('gemini-2.5-flash'),
    'gemini-2.5-pro': google('gemini-2.5-pro'),

    // Anthropic
    'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
    'claude-3-opus': anthropic('claude-3-opus-20240229'),
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
    tools: {
      findColumnsTool: tool(findColumnsTool),
      findTablesTool: tool(findTablesTool),
      createTableTool: tool(createTableTool),
      deleteFromTableTool: tool(deleteFromTableTool),
      insertIntoTableTool: tool(insertIntoTableTool),
      selectFromTableTool: tool(selectFromTableTool),
      updateFromTableTool: tool(updateFromTableTool),
      upsertIntoTableTool: tool(upsertIntoTableTool),
    },
  });
}
