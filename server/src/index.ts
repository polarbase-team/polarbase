import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import chalk from 'chalk';

import { initDatabaseTypes } from './plugins/pg';
import { compression } from './plugins/compression';
import { authRoutes } from './auth/routes';
import { apiKeyRoutes } from './api-keys/routes';
import { enableRest } from './rest';
import { enableAgent } from './agent';
import { enableMCP } from './mcp';
import { enableRealtime } from './realtime';

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

const APP_NAME = process.env.NAME || 'PolarBase';
const APP_HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const APP_PORT = Number(process.env.PORT || '3000');
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';

(async () => {
  console.log('');
  console.log(chalk.bold.cyan(`   Starting ${APP_NAME} services...`));
  console.log('');

  try {
    await initDatabaseTypes();
  } catch (err) {
    console.error(chalk.red('   Critical: Database initialization failed!'));
    process.exit(1); // Kill the app if types aren't ready
  }

  const app = new Elysia({
    name: APP_NAME,
    serve: { hostname: APP_HOSTNAME },
  });

  app
    .use(compression)
    .use(cors({ origin: CORS_ORIGINS }))
    .use(authRoutes)
    .use(apiKeyRoutes);

  let allGood = true;

  // 1. REST API
  const REST_ENABLED = process.env.REST_ENABLED === 'true';
  const REST_PREFIX = process.env.REST_PREFIX || '/rest';
  if (REST_ENABLED) {
    await enableRest(app);
    logService(
      'REST API',
      true,
      `http://${APP_HOSTNAME}:${APP_PORT}${REST_PREFIX}`
    );
  } else {
    logService('REST API', false);
  }

  // 2. AGENT API
  const AGENT_ENABLED = process.env.AGENT_ENABLED === 'true';
  const AGENT_PREFIX = process.env.AGENT_PREFIX || '/agent';
  if (AGENT_ENABLED) {
    await enableAgent(app);
    logService(
      'AGENT API',
      true,
      `http://${APP_HOSTNAME}:${APP_PORT}${AGENT_PREFIX}`
    );
  } else {
    logService('AGENT API', false);
  }

  // 3. MCP Server
  const MCP_ENABLED = process.env.MCP_ENABLED === 'true';
  const MCP_PATH = process.env.MCP_PATH || '/mcp';
  const MCP_PORT = Number(process.env.MCP_PORT || '8080');
  if (MCP_ENABLED) {
    try {
      await enableMCP(app);
      logService(
        'MCP Server',
        true,
        `http://${APP_HOSTNAME}:${MCP_PORT}${MCP_PATH}`
      );
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
  const REALTIME_ENABLED = process.env.REALTIME_ENABLED === 'true';
  const REALTIME_PATH = process.env.REALTIME_PATH || '/realtime';
  if (REALTIME_ENABLED) {
    await enableRealtime(app);
    logService(
      'Realtime (WS+CDC)',
      true,
      `ws://${APP_HOSTNAME}:${APP_PORT}${REALTIME_PATH}`
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
      agent: AGENT_ENABLED,
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
