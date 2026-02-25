import Elysia from 'elysia';

import { restRoutes } from './routes';

export async function enableRest(app: Elysia) {
  app.use(restRoutes);
}
