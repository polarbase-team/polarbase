import Elysia from 'elysia';

import { databaseMcpServer } from './database/server';
import { browserMcpServer } from './browser/server';

export async function enableMCP(app: Elysia) {
  const APP_HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
  const MCP_PATH = process.env.MCP_PATH || '/mcp';
  const DATABASE_PORT = Number(process.env.MCP_DATABASE_PORT || '8081');
  const DATABASE_PATH = process.env.MCP_DATABASE_PATH || '/database';
  const BROWSER_PORT = Number(process.env.MCP_BROWSER_PORT || '8082');
  const BROWSER_PATH = process.env.MCP_BROWSER_PATH || '/browser';

  databaseMcpServer.start({
    transportType: 'httpStream',
    httpStream: {
      host: APP_HOSTNAME,
      port: DATABASE_PORT,
    },
  });

  browserMcpServer.start({
    transportType: 'httpStream',
    httpStream: {
      host: APP_HOSTNAME,
      port: BROWSER_PORT,
    },
  });

  const proxyHandler = async (targetUrl: string, request: Request) => {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
      // @ts-ignore - Bun supports proxying stream better with duplex: 'half'
      duplex: 'half',
    });

    // Create new response with appropriate headers for SSE/Keep-alive
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Connection', 'keep-alive');
    newHeaders.set('Cache-Control', 'no-cache');
    newHeaders.set('X-Accel-Buffering', 'no');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };

  const routes = new Elysia({ prefix: MCP_PATH })
    .all(`${DATABASE_PATH}*`, ({ request }) =>
      proxyHandler(`http://${APP_HOSTNAME}:${DATABASE_PORT}/mcp`, request)
    )
    .all(`${BROWSER_PATH}*`, ({ request }) =>
      proxyHandler(`http://${APP_HOSTNAME}:${BROWSER_PORT}/mcp`, request)
    );

  app.use(routes);
}
