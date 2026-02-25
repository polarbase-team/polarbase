import { FilePart, ImagePart, ModelMessage, wrapLanguageModel } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

import { createRootOrchestrator } from './agents/orchestrator';
import { providers } from './providers';

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_MODEL = {
  provider: process.env.LLM_DEFAULT_PROVIDER || 'google',
  name: process.env.LLM_DEFAULT_MODEL || 'gemini-3-pro-preview',
};

export interface ModelConfig {
  provider: string;
  name: string;
}

export function resolveModel(modelConfig: ModelConfig) {
  const { provider, name } = modelConfig;
  const modelFn = providers[provider];
  if (!modelFn) {
    throw new Error(`Unsupported model provider: ${provider}`);
  }

  const model = modelFn(name);

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
  agents = {
    database: {
      builder: true,
      editor: true,
      query: true,
    },
    browser: true,
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
  model?: ModelConfig;
  mentions?: {
    tables?: string[];
  };
  agents?: {
    database?: {
      builder?: boolean;
      editor?: boolean;
      query?: boolean;
    };
    browser?: boolean;
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
  const orchestrator = createRootOrchestrator(
    selectedModel,
    agents,
    generationConfig
  );

  // Use the orchestrator agent to stream the response
  return orchestrator.stream({ messages, abortSignal });
}
