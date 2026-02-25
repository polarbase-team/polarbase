import { FastMCP } from 'fastmcp';

import { log } from '../../shared/utils/logger';
import { apiKeyAuth } from '../auth/api-key.auth';
import instructions from './instructions';
import registerTableResource from './resources/table';
import registerSuggestTableStructurePrompt from './prompts/suggest-table-structure';
import registerLookupTools from './tools/lookup';
import registerBuilderTools from './tools/builder';
import registerEditorTools from './tools/editor';
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
registerTableResource(mcpServer);

// Register prompts
registerSuggestTableStructurePrompt(mcpServer);

// Register tools
registerLookupTools(mcpServer);
registerBuilderTools(mcpServer);
registerEditorTools(mcpServer);
registerQueryTools(mcpServer);
