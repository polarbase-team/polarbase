import { FastMCP } from 'fastmcp';

import { log } from '../../../../shared/utils/logger';
import instructions from './instructions';
import registerFetchTools from './tools/fetch';

export const fetchApiMcpServer = new FastMCP({
  name: 'PolarBase Fetch API MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
});

registerFetchTools(fetchApiMcpServer);
