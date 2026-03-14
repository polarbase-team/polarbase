import Elysia from 'elysia';

import { databaseMcpServer } from './servers/database/server';
import { browserMcpServer } from './servers/browser/server';
import { fetchApiMcpServer } from './servers/fetch-api/server';
import { mcpRoutes } from './routes';

const APP_HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const DATABASE_PORT = Number(process.env.MCP_DATABASE_PORT || '8081');
const BROWSER_PORT = Number(process.env.MCP_BROWSER_PORT || '8082');
const FETCH_API_PORT = Number(process.env.MCP_FETCH_API_PORT || '8083');

export function enableMCP(app: Elysia) {
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

  fetchApiMcpServer.start({
    transportType: 'httpStream',
    httpStream: {
      host: APP_HOSTNAME,
      port: FETCH_API_PORT,
    },
  });

  app.use(mcpRoutes);
}
