import { FilePart, ImagePart, ModelMessage, wrapLanguageModel } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

import { createRootOrchestrator } from './agents/orchestrator';
import { providers } from './providers';
import { appendConversation, generateSessionTitle } from './memory';

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_MODEL = {
  provider: process.env.LLM_DEFAULT_PROVIDER || 'google',
  name: process.env.LLM_DEFAULT_MODEL || 'gemini-3-pro-preview',
};
const DEFAULT_AGENTS = {
  database: {
    builder: true,
    editor: true,
    query: true,
  },
  browser: true,
};
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 2048,
};

export interface ModelConfig {
  provider: string;
  name: string;
}

const resolveModel = (modelConfig: ModelConfig) => {
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
};

export async function generateAIResponse({
  messages,
  sessionId,
  attachments,
  mentions,
  model = DEFAULT_MODEL,
  agents = DEFAULT_AGENTS,
  generationConfig = DEFAULT_GENERATION_CONFIG,
  abortSignal,
}: {
  messages: ModelMessage[];
  sessionId: string;
  attachments?: File[];
  model?: ModelConfig;
  mentions?: {
    tables?: string[];
    skills?: string[];
  };
  agents?: {
    database?: {
      builder?: boolean;
      editor?: boolean;
      query?: boolean;
    };
    browser?: boolean;
    fetchApi?: boolean;
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

  if (mentions?.skills?.length) {
    messages.unshift({
      role: 'system',
      content: `Skills explicitly mentioned by user: ${mentions.skills.join(', ')}. Load these skills to get specialised instructions.`,
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
  const result = await orchestrator.stream({
    messages,
    abortSignal,
    options: { sessionId },
  });

  // Record conversation for recall memory asynchronously
  (async () => {
    try {
      // Record user message
      const lastUserMessage = [...messages]
        .reverse()
        .find((m: any) => m.role === 'user');
      if (lastUserMessage) {
        let content = '';
        if (typeof lastUserMessage.content === 'string') {
          content = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          content = lastUserMessage.content
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join(' ');
        }

        if (content) {
          appendConversation(sessionId, {
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
          });

          // Generate a title if it's the first message
          await generateSessionTitle(selectedModel, sessionId, content);
        }
      }

      // Record assistant message after it's complete
      const finalResult = await result.response;
      const lastAssistantMessage = [...finalResult.messages]
        .reverse()
        .find((m: any) => m.role === 'assistant');

      const assistantText = Array.isArray(lastAssistantMessage?.content)
        ? (lastAssistantMessage.content as any[]).find(
            (p: any) => p.type === 'text'
          )?.text
        : lastAssistantMessage?.content;

      if (assistantText) {
        appendConversation(sessionId, {
          role: 'assistant',
          content: assistantText,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Failed to record memory:', e);
    }
  })();

  return result;
}
