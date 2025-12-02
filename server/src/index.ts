import { Elysia } from 'elysia';
import { restRouter } from './rest/router';
import { mcpServer } from './mcp/server';
import { enableCDC } from './realtime/cdc';
import { WebSocket } from './plugins/web-socket';

const app = new Elysia();

if (process.env.REST_ENABLED === 'true') {
  app.use(restRouter);
}

if (process.env.MCP_ENABLED === 'true') {
  const mcpPort = parseInt(process.env.MCP_PORT || '3001', 10);
  mcpServer
    .start({
      transportType: 'httpStream',
      httpStream: { port: mcpPort },
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
    });
}

if (process.env.REALTIME_ENABLED === 'true') {
  enableCDC();

  app.ws('/realtime', {
    open(ws) {
      WebSocket.addClient(ws as any);
    },
    close(ws) {
      const { id } = ws.data.query;
      WebSocket.removeClient(id);
    },
  });
}

const port = parseInt(process.env.PORT || '3000', 10);
app.get('/', () => 'Hello Elysia').listen(port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
