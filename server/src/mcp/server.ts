import { FastMCP } from 'fastmcp';

import { log } from '../utils/logger';
import { apiKeyAuth } from '../api-keys/auth';
import instructions from './instructions';
import registerTablesResource from './resources/tables';
import registerColumnsResource from './resources/columns';
import registerSuggestTableStructurePrompt from './prompts/suggest-table-structure';
import registerBuilderTools from './tools/builder';
import registerQueryTools from './tools/query';

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
registerSuggestTableStructurePrompt(mcpServer);

// Register tools
registerBuilderTools(mcpServer);
registerQueryTools(mcpServer);
