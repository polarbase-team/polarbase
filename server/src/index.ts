import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import chalk from 'chalk';

import { restRouter } from './rest/router';
import { mcpServer } from './mcp/server';
import { enableCDC } from './realtime/cdc';
import { WebSocket } from './plugins/web-socket';

const logService = (name: string, status: boolean, extra?: string) => {
  const dot = status ? chalk.green('●') : chalk.red('●');
  const label = status ? chalk.green('RUNNING') : chalk.red('DISABLED/FAILED');
  const namePad = name.padEnd(18);
  console.log(
    `   ${dot}  ${chalk.cyan(namePad)} ${label}${
      extra ? ' ' + chalk.gray(extra) : ''
    }`
  );
};

const appName = 'CozyDB';
const app = new Elysia({ name: appName }).use(cors());

const PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_PORT = parseInt(process.env.MCP_PORT || '8080', 10);
const REST_ENABLED = process.env.REST_ENABLED === 'true';
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';
const REALTIME_ENABLED = process.env.REALTIME_ENABLED === 'true';

console.log('');
console.log(chalk.bold.cyan('   Starting services...'));
console.log('');

async function startApp() {
  // 1. REST API
  if (REST_ENABLED) {
    app.use(restRouter);
    logService('REST API', true, `http://localhost:${PORT}/rest`);
  } else {
    logService('REST API', false);
  }

  // 2. MCP Server (Model Context Protocol)
  if (MCP_ENABLED) {
    await mcpServer
      .start({
        transportType: 'httpStream',
        httpStream: { port: MCP_PORT },
      })
      .then(() => {
        logService('MCP Server', true, `http://localhost:${MCP_PORT}/mcp`);
      })
      .catch((err) => {
        logService('MCP Server', false);
        console.error(chalk.red('   MCP Server failed to start:'), err.message);
      });
  } else {
    logService('MCP Server', false);
  }

  // 3. Realtime (CDC + WebSocket)
  if (REALTIME_ENABLED) {
    enableCDC();

    app.ws('/realtime', {
      open(ws) {
        WebSocket.addClient(ws as any);
      },
      close(ws) {
        const { id } = (ws as any).data.query;
        WebSocket.removeClient(id);
      },
    });

    logService(
      'Realtime (WS+CDC)',
      true,
      'ws://localhost:' + PORT + '/realtime'
    );
  } else {
    logService('Realtime (WS+CDC)', false);
  }

  // 4. Health check route
  app.get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.listen(PORT, () => {
    console.log(''); // dòng trống cho đẹp
    console.log(chalk.bold.green('   All services started successfully!'));
    console.log(chalk.gray('   ──────────────────────────────────────────'));
    console.log(
      `   ${chalk.bold(appName)} ${chalk.magenta(
        'is running on'
      )} ${chalk.underline(`http://localhost:${PORT}`)}`
    );
    console.log('');
  });
}

startApp();
