import { FastMCP } from 'fastmcp';

import { log } from '../../../../shared/utils/logger';
import instructions from './instructions';

export const browserMcpServer = new FastMCP({
  name: 'PolarBase Browser MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
});

// Register browser tools/resources/prompts here when available
