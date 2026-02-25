import { FastMCP } from 'fastmcp';

import { log } from '../../../shared/utils/logger';
import { authenticate } from '../shared/auth';
import instructions from './instructions';
import registerTableResource from './resources/table';
import registerIndexResource from './resources/index';
import registerSuggestTableStructurePrompt from './prompts/suggest-table-structure';
import registerLookupTools from './tools/lookup';
import registerBuilderTools from './tools/builder';
import registerEditorTools from './tools/editor';
import registerQueryTools from './tools/query';

export const databaseMcpServer = new FastMCP({
  name: 'PolarBase Database MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
  authenticate,
});

// Register resources
registerTableResource(databaseMcpServer);
registerIndexResource(databaseMcpServer);

// Register prompts
registerSuggestTableStructurePrompt(databaseMcpServer);

// Register tools
registerLookupTools(databaseMcpServer);
registerBuilderTools(databaseMcpServer);
registerEditorTools(databaseMcpServer);
registerQueryTools(databaseMcpServer);
