import { FastMCP } from 'fastmcp';

import { log } from '../utils/logger';
import { apiKeyAuth } from '../api-keys/auth';
import instructions from '../agent/instructions';
import registerTablesResource from './resources/tables';
import registerColumnsResource from './resources/columns';
import registerFindTablesTool from './tools/find-tables';
import registerFindColumnsTool from './tools/find-columns';
import registerListFromTableTool from './tools/list-from-table';
import registerAggregateFromTableTool from './tools/aggregate-from-table';
import registerInsertIntoTableTool from './tools/insert-into-table';
import registerUpdateFromTableTool from './tools/update-from-table';
import registerDeleteFromTableTool from './tools/delete-from-table';

export const mcpServer = new FastMCP({
  name: 'PolarBase MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
  authenticate: async (request) => {
    const apiKey = request.headers['x-api-key'];
    try {
      const authData = await apiKeyAuth(apiKey as string);
      if (!authData.scopes.mcp) {
        throw new Response(null, {
          status: 403,
          statusText: 'Forbidden',
        });
      }
      return authData;
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

// Register tools
registerFindTablesTool(mcpServer);
registerFindColumnsTool(mcpServer);
registerListFromTableTool(mcpServer);
registerAggregateFromTableTool(mcpServer);
registerInsertIntoTableTool(mcpServer);
registerUpdateFromTableTool(mcpServer);
registerDeleteFromTableTool(mcpServer);
