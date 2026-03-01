import { openai } from './openai';
import { google } from './google';
import { anthropic } from './anthropic';
import { xai } from './xai';
import { openrouter } from './openrouter';
import { local } from './local';

export const providers: Record<string, any> = {
  openai,
  google,
  anthropic,
  xai,
  openrouter,
  local,
};
