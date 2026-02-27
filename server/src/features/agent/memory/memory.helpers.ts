import { generateText, LanguageModel } from 'ai';
import db from './memory.db';

/**
 * Read all core memory entries for a specific session, formatted for system prompt injection.
 */
export const readCoreMemory = (sessionId: string) => {
  const rows = db
    .query(
      'SELECT key, value FROM memory_core WHERE session_id = ? ORDER BY key'
    )
    .all(sessionId) as {
    key: string;
    value: string;
  }[];

  if (rows.length === 0) return '';

  return rows.map((r) => `- ${r.key}: ${r.value}`).join('\n');
};

/**
 * Append a conversation entry to the recall memory table for a specific session.
 */
export const appendConversation = (
  sessionId: string,
  entry: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }
) => {
  db.query(
    'INSERT INTO memory_conversations (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
  ).run(sessionId, entry.role, entry.content, entry.timestamp);
};

/**
 * Update the title of a session.
 */
export const updateSessionTitle = (sessionId: string, title: string) => {
  db.query('UPDATE memory_sessions SET title = ? WHERE id = ?').run(
    title,
    sessionId
  );
};

/**
 * Automatically generate a title for a session based on the first user message if it's still the default.
 */
export const generateSessionTitle = async (
  model: LanguageModel,
  sessionId: string,
  userMessage: string
) => {
  const session = db
    .query('SELECT title FROM memory_sessions WHERE id = ?')
    .get(sessionId) as { title: string } | undefined;

  // Only generate if title is the default
  if (!session || session.title === 'New Conversation') {
    const { text } = await generateText({
      model,
      system:
        'You are a helpful assistant that generates extremely short, concise titles for chat conversations. Return ONLY the title (max 5-6 words), no quotes, no periods.',
      prompt: `Generate a title for a chat that starts with this message: "${userMessage}"`,
    });

    if (text) {
      updateSessionTitle(sessionId, text.trim());
    }
  }
};
