import { Elysia } from 'elysia';
import { mcpServer } from './mcp/server';

// Start the MCP server
mcpServer
  .start({
    transportType: 'httpStream',
    httpStream: {
      port: 8080,
    },
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
  });

const app = new Elysia().get('/', () => 'Hello Elysia').listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
