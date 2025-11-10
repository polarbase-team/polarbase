import 'dotenv';
import { Elysia } from 'elysia';
import { mcpServer } from './mcp/server';
import { WebSocket } from './plugins/web-socket';

const port = parseInt(process.env.PORT || '3000', 10);

// Start the MCP server
mcpServer
  .start({
    transportType: 'httpStream',
    httpStream: { port },
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
  });

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      WebSocket.addClient(ws as any);
    },
    close(ws) {
      const { id } = ws.data.query;
      WebSocket.removeClient(id);
    },
  })
  .get('/', () => 'Hello Elysia')
  .listen(port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
