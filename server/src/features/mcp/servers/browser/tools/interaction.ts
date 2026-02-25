import { FastMCP, UserError } from 'fastmcp';

import { browserAgentTools } from '../../../../agent/agents/browser/agent';
import { responseToContent } from '../../../shared/utils';

export default function registerInteractionTools(server: FastMCP) {
  server.addTool({
    name: 'click',
    description: browserAgentTools.click.description,
    parameters: browserAgentTools.click.inputSchema as any,
    annotations: {
      title: 'Click Element',
      readOnlyHint: false,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.click.execute!(
          args,
          {} as any
        );
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });

  server.addTool({
    name: 'type',
    description: browserAgentTools.type.description,
    parameters: browserAgentTools.type.inputSchema as any,
    annotations: {
      title: 'Type into Input',
      readOnlyHint: false,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.type.execute!(args, {} as any);
        return responseToContent(response);
      } catch (error) {
        throw new UserError((error as Error).message);
      }
    },
  });
}
