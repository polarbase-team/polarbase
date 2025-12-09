import { FastMCP, UserError } from 'fastmcp';

import { loadTables } from '../../agent/resources/tables';

export default function register(server: FastMCP) {
  server.addResource({
    uri: 'db://tables',
    name: 'Database Tables',
    mimeType: 'application/json',
    async load() {
      try {
        return await loadTables();
      } catch (error) {
        const err = error as Error;
        throw new UserError(`Failed to fetch tables: ${err.message}`);
      }
    },
  });
}
