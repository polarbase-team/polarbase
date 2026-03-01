import { FastMCP } from 'fastmcp';

import { log } from '../../../../shared/utils/logger';
import instructions from './instructions';
import registerNavigationTools from './tools/navigation';
import registerInteractionTools from './tools/interaction';
import registerExtractionTools from './tools/extraction';
import registerScreenshotTools from './tools/screenshot';

export const browserMcpServer = new FastMCP({
  name: 'PolarBase Browser MCP Server',
  version: '1.0.0',
  logger: log as any,
  instructions,
});

registerNavigationTools(browserMcpServer);
registerInteractionTools(browserMcpServer);
registerExtractionTools(browserMcpServer);
registerScreenshotTools(browserMcpServer);
