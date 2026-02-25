import { FastMCP } from 'fastmcp';

import { log } from '../../../shared/utils/logger';
import { authenticate } from '../shared/auth';
import instructions from './instructions';

export const browserMcpServer = new FastMCP({
  name: 'PolarBase Browser MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
  authenticate,
});

// Register browser tools/resources/prompts here when available
