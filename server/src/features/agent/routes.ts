import { Elysia, t } from 'elysia';

import { checkRateLimit } from '../../shared/utils/rate-limit';
import { err } from '../../shared/utils/api-response';
import { apiKeyAuth } from '../auth/api-key.auth';
import { generateAIResponse } from './model';
import db from './memory/memory.db';

const AGENT_RATE_LIMIT = Number(process.env.AGENT_RATE_LIMIT) || 10;
const AGENT_PREFIX = process.env.AGENT_PREFIX || '/agent';

export const agentRoutes = new Elysia({ prefix: AGENT_PREFIX })
  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error('Invalid or missing x-api-key');

      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.agent) {
        set.status = 403;
        throw new Error(
          'Access denied: you do not have permission to access this resource.'
        );
      }
      return authData;
    } catch (e) {
      set.status ??= 401;
      throw e;
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
    async ({
      request: { signal },
      body: {
        messages,
        sessionId,
        attachments,
        mentions,
        model,
        agents,
        generationConfig,
      },
    }) => {
      // Ensure session exists and update timestamp
      db.query(
        `INSERT INTO memory_sessions (id, title, updated_at) VALUES (?, 'New Conversation', datetime('now'))
         ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
      ).run(sessionId);

      const result = await generateAIResponse({
        messages,
        sessionId,
        attachments,
        mentions,
        model,
        agents,
        generationConfig,
        abortSignal: signal,
      });

      return result.toUIMessageStream();
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            role: t.Union([
              t.Literal('user'),
              t.Literal('assistant'),
              t.Literal('system'),
            ]),
            content: t.Any(),
          })
        ),
        sessionId: t.String(),
        attachments: t.Optional(t.Files()),
        mentions: t.Optional(
          t.Object({
            tables: t.Optional(t.Array(t.String())),
          })
        ),
        model: t.Optional(
          t.Object({
            provider: t.String(),
            name: t.String(),
          })
        ),
        agents: t.Optional(
          t.Object({
            database: t.Optional(
              t.Object({
                builder: t.Optional(t.Boolean()),
                editor: t.Optional(t.Boolean()),
                query: t.Optional(t.Boolean()),
              })
            ),
            browser: t.Optional(t.Boolean()),
          })
        ),
        generationConfig: t.Optional(
          t.Object({
            temperature: t.Optional(t.Number()),
            topP: t.Optional(t.Number()),
            topK: t.Optional(t.Number()),
            maxOutputTokens: t.Optional(t.Number()),
          })
        ),
      }),
    }
  )
  .get('/sessions', () => {
    return db
      .query(
        'SELECT id, title, updated_at FROM memory_sessions ORDER BY updated_at DESC LIMIT 50'
      )
      .all();
  })
  .get('/history/:sessionId', ({ params: { sessionId } }) => {
    return db
      .query(
        'SELECT role, content, timestamp FROM memory_conversations WHERE session_id = ? ORDER BY timestamp ASC'
      )
      .all(sessionId);
  })
  .post(
    '/sessions/:sessionId/title',
    ({ params: { sessionId }, body: { title } }) => {
      db.query(
        'UPDATE memory_sessions SET title = ?, updated_at = datetime("now") WHERE id = ?'
      ).run(title, sessionId);
      return { success: true };
    },
    {
      body: t.Object({
        title: t.String(),
      }),
    }
  )
  .delete('/sessions/:sessionId', ({ params: { sessionId } }) => {
    db.query('DELETE FROM memory_sessions WHERE id = ?').run(sessionId);
    return { success: true };
  });
