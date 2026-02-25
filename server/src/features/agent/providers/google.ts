import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.GEMINI_API_BASE_URL,
});
