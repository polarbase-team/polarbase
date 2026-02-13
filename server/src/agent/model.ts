import { FilePart, ImagePart, ModelMessage, wrapLanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createXai } from '@ai-sdk/xai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

import { createOrchestratorAgent } from './agents/orchestrator';

const NODE_ENV = process.env.NODE_ENV || 'development';
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

  const model = map[modelId];

  if (NODE_ENV === 'development') {
    return wrapLanguageModel({
      model,
      middleware: [devToolsMiddleware()],
    });
  }

  return model;
}

export async function generateAIResponse({
  messages,
  attachments,
  mentions,
  model = DEFAULT_MODEL,
  subAgents = {
    builder: true,
    editor: true,
    query: true,
  },
  generationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 2048,
  },
  abortSignal,
}: {
  messages: ModelMessage[];
  attachments?: File[];
  model?: string;
  mentions?: {
    tables?: string[];
  };
  subAgents?: {
    builder?: boolean;
    editor?: boolean;
    query?: boolean;
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
  abortSignal?: AbortSignal;
}) {
  // Attach files to the last message
  if (attachments?.length) {
    const attachmentParts: (ImagePart | FilePart)[] = await Promise.all(
      attachments.map(async (file): Promise<ImagePart | FilePart> => {
        const arrayBuffer = await file.arrayBuffer();
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          return {
            type: 'image',
            image: new Uint8Array(arrayBuffer),
            mediaType: file.type,
          };
        } else {
          return {
            type: 'file',
            data: new Uint8Array(arrayBuffer),
            mediaType: file.type,
            filename: file.name,
          };
        }
      })
    );

    // Get the last user message and convert its content to the array format
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (lastUserMessage) {
      const textContent =
        typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : '';

      lastUserMessage.content = [
        { type: 'text', text: textContent },
        ...attachmentParts,
      ];
    }
  }

  // Add mentioned tables to the last message
  if (mentions?.tables?.length) {
    messages.unshift({
      role: 'system',
      content: `Tables mentioned in this conversation: ${mentions.tables.join(', ')}`,
    });
  }

  // Initialize orchestrator with capability to call worker agents and generation config
  const selectedModel = resolveModel(model);
  const orchestrator = createOrchestratorAgent(
    selectedModel,
    subAgents,
    generationConfig
  );

  // Use the orchestrator agent to stream the response
  return orchestrator.stream({ messages, abortSignal });
}
