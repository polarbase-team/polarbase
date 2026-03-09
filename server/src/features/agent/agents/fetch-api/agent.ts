import { LanguageModel, ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

export const fetchApiAgentTools = {
  fetch: tool({
    description: 'Make an HTTP/HTTPS request using fetch.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL to make the request to.'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
        .optional()
        .default('GET')
        .describe('The HTTP method to use.'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('HTTP headers as a key-value object.'),
      body: z
        .string()
        .optional()
        .describe('The request body as a string (typically JSON stringified).'),
    }),
    inputExamples: [
      {
        input: {
          url: 'https://api.github.com/users/octocat',
          method: 'GET',
        },
      },
      {
        input: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"message": "hello world"}',
        },
      },
    ],
    strict: true,
    execute: async ({ url, method, headers, body }) => {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
        });

        const status = response.status;
        const statusText = response.statusText;
        const responseHeaders = Object.fromEntries(response.headers.entries());
        let responseData: any;
        const text = await response.text();

        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }

        return {
          status,
          statusText,
          headers: responseHeaders,
          data: responseData,
        };
      } catch (error: any) {
        return {
          error: error.message || 'An error occurred during the fetch request.',
        };
      }
    },
  }),
};

export function createFetchApiAgent(
  model: LanguageModel,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  return new ToolLoopAgent({
    id: 'fetch-api-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    instructions: `You are a Fetch API Automation Agent.
  You can make HTTP requests to various web APIs using the \`fetch\` tool.

  ### OPERATIONAL GUIDELINES:
  1. Determine the correct URL, HTTP method, headers, and body required for the API endpoint based on the user's request.
  2. If the API expects JSON, ensure you set the \`Content-Type: application/json\` header and stringify the JSON body.
  3. Analyze the response data carefully. If the API returns an error status code, report this clearly to the user with any available error details.
  4. If multiple API calls are needed to complete the task, make them sequentially.
  
  IMPORTANT: When you have finished, write a clear summary of your findings or the actions taken as your final response.
  This summary will be returned to the main agent, so include all relevant information.`,
    tools: fetchApiAgentTools,
  });
}
