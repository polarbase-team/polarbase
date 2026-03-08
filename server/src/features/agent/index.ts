import Elysia from 'elysia';

import { agentRoutes } from './routes';

export function enableAgent(app: Elysia) {
  app.use(agentRoutes);
}
