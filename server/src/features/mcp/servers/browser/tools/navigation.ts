import { FastMCP, UserError } from 'fastmcp';

import { browserAgentTools } from '../../../../agent/agents/browser/agent';
import { responseToContent } from '../../../shared/utils';

export default function registerNavigationTools(server: FastMCP) {
  server.addTool({
    name: 'navigate',
    description: browserAgentTools.navigate.description,
    parameters: browserAgentTools.navigate.inputSchema as any,
    annotations: {
      title: 'Navigate to URL',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.navigate.execute!(
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
