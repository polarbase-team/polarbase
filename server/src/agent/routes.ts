import { Elysia, t } from 'elysia';

import { checkRateLimit } from '../utils/rate-limit';
import { err } from '../utils/api-response';
import { apiKeyAuth } from '../api-keys/auth';
import { generateAIResponse } from './model';

const AGENT_RATE_LIMIT = Number(process.env.AGENT_RATE_LIMIT) || 10;
const AGENT_PREFIX = process.env.AGENT_PREFIX || '/agent';

export const agentRoutes = new Elysia({ prefix: AGENT_PREFIX })
  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error();

      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.rest) {
        set.status = 403;
        throw new Error(
          'Access denied: you do not have permission to access this resource.'
        );
      }
      return authData;
    } catch (e) {
      set.status ??= 401;
      throw e ?? new Error('Invalid or missing x-api-key');
    }
  })

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, AGENT_RATE_LIMIT, AGENT_PREFIX)) {
      set.status = 429;
      return err('Too many requests', 429);
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
      return result.toUIMessageStream();
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
