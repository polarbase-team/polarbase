import { Elysia } from 'elysia';

import { checkRateLimit } from '../../shared/utils/rate-limit';
import { err } from '../../shared/utils/api-response';
import { apiKeyAuth } from '../auth/api-key.auth';

const APP_HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const MCP_PREFIX = process.env.MCP_PREFIX || '/mcp';
const MCP_RATE_LIMIT = Number(process.env.MCP_RATE_LIMIT) || 10;
const DATABASE_PORT = Number(process.env.MCP_DATABASE_PORT || '8081');
const DATABASE_PATH = process.env.MCP_DATABASE_PATH || '/database';
const BROWSER_PORT = Number(process.env.MCP_BROWSER_PORT || '8082');
const BROWSER_PATH = process.env.MCP_BROWSER_PATH || '/browser';

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

export const mcpRoutes = new Elysia({ prefix: MCP_PREFIX })
  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error('Invalid or missing x-api-key');

      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.mcp) {
        set.status = 403;
        throw new Error(
          'Access denied: you do not have permission to access this resource.'
        );
      }
      return authData;
    } catch (e) {
      set.status ??= 401;
      throw e;
    }
  })

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, MCP_RATE_LIMIT, MCP_PREFIX)) {
      set.status = 429;
      return err('Too many requests', 429);
    }
  })

  .all(`${DATABASE_PATH}*`, ({ request }) =>
    proxyHandler(`http://${APP_HOSTNAME}:${DATABASE_PORT}/mcp`, request)
  )
  .all(`${BROWSER_PATH}*`, ({ request }) =>
    proxyHandler(`http://${APP_HOSTNAME}:${BROWSER_PORT}/mcp`, request)
  );
