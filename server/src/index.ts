import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import chalk from 'chalk';

import { restRouter } from './rest/router';
import { agentRouter } from './agent/route';
import { mcpServer } from './mcp/server';
import { enableCDC } from './realtime/cdc';
import { WebSocket } from './plugins/web-socket';

const logService = (name: string, status: boolean, extra?: string) => {
  const dot = status ? chalk.green('●') : chalk.red('●');
  const label = status ? chalk.green('RUNNING') : chalk.red('DISABLED');
  const namePad = name.padEnd(20);
  console.log(
    `   ${dot}  ${chalk.cyan(namePad)} ${label}${
      extra ? chalk.gray(`  ${extra}`) : ''
    }`
  );
};

const APP_NAME = 'CozyDB';
const APP_PORT = Number(process.env.PORT || '3000');
const CORS_ORIGINS = process.env.CORS_ORIGINS;

const REST_ENABLED = process.env.REST_ENABLED === 'true';
const REST_PREFIX = process.env.REST_PREFIX;

const AGENT_ENABLED = process.env.AGENT_ENABLED === 'true';
const AGENT_PREFIX = process.env.AGENT_PREFIX;

const MCP_ENABLED = process.env.MCP_ENABLED === 'true';
const MCP_PATH = process.env.MCP_PATH;
const MCP_PORT = Number(process.env.MCP_PORT || '8080');

const REALTIME_ENABLED = process.env.REALTIME_ENABLED === 'true';
const REALTIME_PATH = process.env.REALTIME_PATH;

(async () => {
  console.log('');
  console.log(chalk.bold.cyan(`   Starting ${APP_NAME} services...`));
  console.log('');

  const app = new Elysia({ name: APP_NAME }).use(
    cors({ origin: CORS_ORIGINS })
  );

  let allGood = true;

  // 1. REST API
  if (REST_ENABLED) {
    app.use(restRouter);
    logService('REST API', true, `http://localhost:${APP_PORT}${REST_PREFIX}`);
  } else {
    logService('REST API', false);
  }

  // 2. AGENT API
  if (AGENT_ENABLED) {
    app.use(agentRouter);
    logService(
      'AGENT API',
      true,
      `http://localhost:${APP_PORT}${AGENT_PREFIX}`
    );
  } else {
    logService('AGENT API', false);
  }

  // 3. MCP Server
  if (MCP_ENABLED) {
    try {
      await mcpServer.start({
        transportType: 'httpStream',
        httpStream: { port: MCP_PORT },
      });
      logService('MCP Server', true, `http://localhost:${MCP_PORT}${MCP_PATH}`);
    } catch (err: any) {
      allGood = false;
      logService('MCP Server', false);
      console.error(
        chalk.red('   Failed to start MCP Server:'),
        err.message || err
      );
    }
  } else {
    logService('MCP Server', false);
  }

  // 4. Realtime
  if (REALTIME_ENABLED) {
    enableCDC();
    app.ws(`${REALTIME_PATH}`, {
      open(ws) {
        WebSocket.addClient(ws as any);
      },
      close(ws) {
        const { id } = (ws as any).data.query || {};
        if (id) WebSocket.removeClient(id);
      },
    });
    logService(
      'Realtime (WS+CDC)',
      true,
      `ws://localhost:${APP_PORT}${REALTIME_PATH}`
    );
  } else {
    logService('Realtime (WS+CDC)', false);
  }

  // Health check
  app.get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      rest: REST_ENABLED,
      mcp: MCP_ENABLED,
      realtime: REALTIME_ENABLED,
    },
  }));

  // Start Elysia
  app.listen(APP_PORT, ({ hostname, port }) => {
    console.log('');
    if (allGood) {
      console.log(chalk.bold.green('   All services started successfully!'));
    } else {
      console.log(chalk.bold.yellow('   Some services failed to start'));
    }
    console.log(
      chalk.gray('   ───────────────────────────────────────────────')
    );
    console.log(
      `   ${chalk.bold.magenta(APP_NAME)} is running → ${chalk.underline.cyan(
        `http://${hostname}:${port}`
      )}`
    );
    console.log('');
  });
})();
