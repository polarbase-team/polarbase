import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';

import { responseToContent } from '../../../shared/utils';

export default function registerFetchTools(server: FastMCP) {
  server.addTool({
    name: 'fetch',
    description: 'Make an HTTP/HTTPS request using fetch.',
    parameters: z.object({
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
    execute: async (args) => {
      try {
        const { url, method, headers, body } = args;
        const response = await fetch(url, {
          method,
          headers,
          body,
        });

        let responseData: any;
        const text = await response.text();

        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }

        return responseToContent(responseData);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
