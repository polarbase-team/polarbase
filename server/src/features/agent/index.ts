import Elysia from 'elysia';

import { agentRoutes } from './routes';

export async function enableAgent(app: Elysia) {
  app.use(agentRoutes);
}
