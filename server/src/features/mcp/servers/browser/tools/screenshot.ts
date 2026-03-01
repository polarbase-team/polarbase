import { FastMCP, UserError } from 'fastmcp';

import { browserAgentTools } from '../../../../agent/agents/browser/agent';
import { responseToContent } from '../../../shared/utils';

export default function registerScreenshotTools(server: FastMCP) {
  server.addTool({
    name: 'screenshot',
    description: browserAgentTools.screenshot.description,
    parameters: browserAgentTools.screenshot.inputSchema as any,
    annotations: {
      title: 'Take Screenshot',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.screenshot.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
