import { FastMCP, UserError } from 'fastmcp';

import { browserAgentTools } from '../../../../agent/agents/browser/agent';
import { responseToContent } from '../../../shared/utils';

export default function registerExtractionTools(server: FastMCP) {
  server.addTool({
    name: 'extractText',
    description: browserAgentTools.extractText.description,
    parameters: browserAgentTools.extractText.inputSchema as any,
    annotations: {
      title: 'Extract Text Content',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.extractText.execute!(
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
    name: 'evaluateJs',
    description: browserAgentTools.evaluateJs.description,
    parameters: browserAgentTools.evaluateJs.inputSchema as any,
    annotations: {
      title: 'Evaluate JavaScript',
      readOnlyHint: false,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.evaluateJs.execute!(
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
    name: 'getPageInfo',
    description: browserAgentTools.getPageInfo.description,
    parameters: browserAgentTools.getPageInfo.inputSchema as any,
    annotations: {
      title: 'Get Page Info',
      readOnlyHint: true,
    },
    async execute(args) {
      try {
        const response = await browserAgentTools.getPageInfo.execute!(
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
