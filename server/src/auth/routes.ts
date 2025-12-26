import Elysia, { t } from 'elysia';
import { apiKeyAuth } from '../api-keys/auth';

export const authRoutes = new Elysia({ prefix: '/auth' }).post(
  '/validate',
  ({ body }) => {
    return apiKeyAuth(body.apiKey);
  },
  {
    body: t.Object({
      apiKey: t.String(),
    }),
  }
);
