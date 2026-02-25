import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const local = createOpenAICompatible({
  name: 'local',
  apiKey: process.env.LOCAL_LLM_API_KEY,
  baseURL: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:1234/v1',
});
