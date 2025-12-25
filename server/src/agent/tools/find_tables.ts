import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';

const inputSchema = z.object({});

export const findTablesTool = {
  name: 'findTables',
  description: `
    Retrieves a list of all tables in the database.
    Returns a JSON array of allowed tables.
  `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const tables = await loadTables();

      log.info('Fetched table list', { tables });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                message: 'List of accessible tables retrieved successfully.',
                tables,
              },
              null,
              2
            ),
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
