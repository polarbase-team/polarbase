import { tool } from 'ai';
import { z } from 'zod';

import db from './memory.db';

const memoryTool = tool({
  description: `Manage long-term memory stored in a local database.

Rules:
- If the user prompt might depend on preferences, history, constraints, or goals, search memory first, then reply.
- If the prompt is fully self-contained or general knowledge, reply directly.
- Keep searches short and focused (1-4 words).
- Store durable user facts (name, preferences, constraints) as core memories with upsert_core.
- Store detailed notes, observations, and summaries with add_note.
- Keep memory operations invisible in user-facing replies.`,

  inputSchema: z.object({
    command: z
      .enum([
        'view_core',
        'upsert_core',
        'delete_core',
        'view_notes',
        'add_note',
        'search',
      ])
      .describe('The memory command to execute.'),
    key: z
      .string()
      .optional()
      .describe('For core memory: a short descriptive key (e.g. "user_name").'),
    value: z
      .string()
      .optional()
      .describe('For upsert_core: the value to store.'),
    title: z.string().optional().describe('For add_note: a short title.'),
    content: z.string().optional().describe('For add_note: the content.'),
    query: z.string().optional().describe('For search: matching keywords.'),
    limit: z.number().optional().describe('Max results to return. Default 20.'),
  }),

  execute: async (input, { experimental_context }) => {
    const { sessionId } = experimental_context as { sessionId: string };

    try {
      switch (input.command) {
        case 'view_core': {
          const rows = db
            .query(
              'SELECT key, value, updated_at FROM memory_core WHERE session_id = ? ORDER BY key'
            )
            .all(sessionId) as {
            key: string;
            value: string;
            updated_at: string;
          }[];

          if (rows.length === 0)
            return { output: 'No core memories stored yet.' };

          const formatted = rows
            .map(
              (r) => `- **${r.key}**: ${r.value} _(updated ${r.updated_at})_`
            )
            .join('\n');
          return { output: formatted };
        }

        case 'upsert_core': {
          if (!input.key || !input.value) {
            return {
              output: 'Error: key and value are required for upsert_core.',
            };
          }
          db.query(
            `INSERT INTO memory_core (session_id, key, value, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(session_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          ).run(sessionId, input.key, input.value);
          return { output: `Core memory "${input.key}" saved.` };
        }

        case 'delete_core': {
          if (!input.key) {
            return { output: 'Error: key is required for delete_core.' };
          }
          const result = db
            .query('DELETE FROM memory_core WHERE session_id = ? AND key = ?')
            .run(sessionId, input.key);
          return {
            output:
              result.changes > 0
                ? `Deleted core memory "${input.key}".`
                : `No core memory found with key "${input.key}" for this session.`,
          };
        }

        case 'view_notes': {
          const limit = input.limit ?? 20;
          const rows = db
            .query(
              'SELECT title, content, created_at FROM memory_notes WHERE session_id = ? ORDER BY created_at DESC LIMIT ?'
            )
            .all(sessionId, limit) as {
            title: string | null;
            content: string;
            created_at: string;
          }[];

          if (rows.length === 0) return { output: 'No notes stored yet.' };

          const formatted = rows
            .map(
              (r) =>
                `[${r.created_at}] ${r.title ? `**${r.title}**: ` : ''}${r.content}`
            )
            .join('\n');
          return { output: formatted };
        }

        case 'add_note': {
          if (!input.content) {
            return { output: 'Error: content is required for add_note.' };
          }
          db.query(
            `INSERT INTO memory_notes (session_id, title, content, created_at) VALUES (?, ?, ?, datetime('now'))`
          ).run(sessionId, input.title ?? null, input.content);
          return { output: 'Note saved.' };
        }

        case 'search': {
          if (!input.query) {
            return { output: 'Error: query is required for search.' };
          }
          const limit = input.limit ?? 20;
          const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);

          if (terms.length === 0) return { output: 'Empty search query.' };

          // Build LIKE conditions for each term
          const contentLikeConditions = terms
            .map(() => 'LOWER(content) LIKE ?')
            .join(' AND ');
          const titleLikeConditions = terms
            .map(() => 'LOWER(title) LIKE ?')
            .join(' AND ');
          const likeParams = terms.map((t) => `%${t}%`);

          // Search notes (matching content OR title)
          const noteMatches = db
            .query(
              `SELECT 'note' as source, COALESCE(title, '') || ': ' || content as content, created_at as timestamp
               FROM memory_notes WHERE session_id = ? AND (${contentLikeConditions} OR ${titleLikeConditions})
               ORDER BY created_at DESC LIMIT ?`
            )
            .all(sessionId, ...likeParams, ...likeParams, limit) as {
            source: string;
            content: string;
            timestamp: string;
          }[];

          // Search conversations
          const convMatches = db
            .query(
              `SELECT 'conversation' as source, role || ': ' || content as content, timestamp
               FROM memory_conversations WHERE session_id = ? AND ${contentLikeConditions}
               ORDER BY timestamp DESC LIMIT ?`
            )
            .all(sessionId, ...likeParams, limit) as {
            source: string;
            content: string;
            timestamp: string;
          }[];

          const allMatches = [...noteMatches, ...convMatches];

          if (allMatches.length === 0) return { output: 'No matches found.' };

          const formatted = allMatches
            .map((m) => `[${m.source}][${m.timestamp}] ${m.content}`)
            .join('\n');
          return { output: formatted };
        }
      }
    } catch (error) {
      return { output: `Memory action failed: ${(error as Error).message}` };
    }
  },
});

export const memoryTools = {
  memory: memoryTool,
};
