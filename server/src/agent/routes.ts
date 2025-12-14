import { Elysia, t } from 'elysia';

import { apiKeyAuth } from '../api-keys/auth';
import { generateAIResponse } from './model';

const AGENT_PREFIX = process.env.AGENT_PREFIX;

export const agentRoutes = new Elysia({ prefix: AGENT_PREFIX })
  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error();
      return await apiKeyAuth(apiKey);
    } catch {
      set.status = 401;
      return { error: 'Invalid or missing x-api-key' };
    }
  })

  .post(
    '/chat',
    async ({ body }) => {
      const { messages, model, temperature } = body;
      const result = await generateAIResponse({
        messages: messages as any,
        model,
        temperature,
      });
      return result.toTextStreamResponse();
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            id: t.Optional(t.String()),
            role: t.Union([
              t.Literal('user'),
              t.Literal('assistant'),
              t.Literal('system'),
              t.Literal('tool'),
            ]),
            content: t.String(),
            createdAt: t.Optional(t.Union([t.String(), t.Date()])),
            toolInvocations: t.Optional(t.Any()),
          })
        ),
        model: t.Optional(t.String()),
        temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      }),
    }
  );
