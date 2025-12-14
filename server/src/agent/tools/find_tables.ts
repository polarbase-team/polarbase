import { z } from 'zod';

import pg from '../../plugins/pg';
import { log } from '../../utils/logger';

const inputSchema = z.object({});

export const findTablesTool = {
  name: 'findTables',
  description: `
    Retrieves a list of all tables in the database.
    Use this tool to get valid table names before calling other tools like 'selectFromTable', 'insertIntoTable', etc.
    Returns a JSON array of table names.
  `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const result = await pg
        .select('table_name')
        .from('information_schema.tables')
        .where({ table_schema: 'public' });
      const tables = result.map((row) => row.table_name);

      log.info('Fetched table list', { tables });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ status: 'success', tables }, null, 2),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Failed to fetch tables', { error: err.message });
      throw new Error(`Failed to fetch tables: ${err.message}`);
    }
  },
};
