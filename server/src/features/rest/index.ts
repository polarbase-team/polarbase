import Elysia from 'elysia';

import { restRoutes } from './routes';

export function enableRest(app: Elysia) {
  app.use(restRoutes);
}
