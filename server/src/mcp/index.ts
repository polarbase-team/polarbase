import Elysia from 'elysia';

import { mcpServer } from './server';

const MCP_PORT = Number(process.env.MCP_PORT || '8080');

export async function enableMCP(app: Elysia) {
  await mcpServer.start({
    transportType: 'httpStream',
    httpStream: { port: MCP_PORT },
  });
}
