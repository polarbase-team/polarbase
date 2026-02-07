import { ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createXai } from '@ai-sdk/xai';

import { createOrchestratorAgent } from './agents/orchestrator';

const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL || 'gemini-3-pro-preview';

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

export function resolveModel(modelId: string) {
  const map: Record<string, any> = {
    // OpenAI
    'gpt-5': openai('gpt-5'),
    'gpt-5.1': openai('gpt-5.1'),

    // Google Gemini
    'gemini-2.5-flash': google('gemini-2.5-flash'),
    'gemini-2.5-pro': google('gemini-2.5-pro'),
    'gemini-3-flash-preview': google('gemini-3-flash-preview'),
    'gemini-3-pro-preview': google('gemini-3-pro-preview'),

    // Anthropic
    'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-latest'),
    'claude-sonnet-4-5': anthropic('claude-sonnet-4-5'),
    'claude-opus-4-6': anthropic('claude-opus-4-6'),
    'claude-3-5-haiku': anthropic('claude-3-5-haiku-latest'),

    // xAI
    'grok-3': xai('grok-3'),
    'grok-4': xai('grok-4-1-fast-reasoning'),
  };

  if (!map[modelId]) {
    return google(DEFAULT_MODEL);
  }

  return map[modelId];
}

export async function generateAIResponse({
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.7,
}: {
  messages: ModelMessage[];
  model?: string;
  temperature?: number;
}) {
  const selectedModel = resolveModel(model);

  // Initialize orchestrator with capability to call worker agents and temperature
  const orchestrator = createOrchestratorAgent(selectedModel, temperature);

  // Use the orchestrator agent to stream the response
  return orchestrator.stream({
    messages,
  });
}
