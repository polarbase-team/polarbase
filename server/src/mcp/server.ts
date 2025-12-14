import { FastMCP } from 'fastmcp';

import { log } from '../utils/logger';
import { apiKeyAuth } from '../api-keys/auth';
import instructions from '../agent/instructions';
import registerTablesResource from './resources/tables';
import registerColumnsResource from './resources/columns';
import registerSuggestTableStructurePrompt from './prompts/suggest_table_structure';
import registerFindTablesTool from './tools/find_tables';
import registerFindColumnsTool from './tools/find_coumns';
import registerCreateTableTool from './tools/create_table';
import registerSelectFromTableTool from './tools/select_from_table';
import registerInsertIntoTableTool from './tools/insert_into_table';
import registerUpsertIntoTableTool from './tools/upsert_into_table';
import registerUpdateFromTableTool from './tools/update_from_table';
import registerDeleteFromTableTool from './tools/delete_from_table';

export const mcpServer = new FastMCP({
  name: 'Database Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
  authenticate: async (request) => {
    const apiKey = request.headers['x-api-key'];
    try {
      return await apiKeyAuth(apiKey as string);
    } catch {
      throw new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }
  },
});

// Register resources
registerTablesResource(mcpServer);
registerColumnsResource(mcpServer);

// Register prompts
registerSuggestTableStructurePrompt(mcpServer);

// Register tools
registerFindTablesTool(mcpServer);
registerFindColumnsTool(mcpServer);
registerCreateTableTool(mcpServer);
registerSelectFromTableTool(mcpServer);
registerInsertIntoTableTool(mcpServer);
registerUpsertIntoTableTool(mcpServer);
registerUpdateFromTableTool(mcpServer);
registerDeleteFromTableTool(mcpServer);
