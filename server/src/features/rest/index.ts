import Elysia from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';

import { checkRateLimit } from '../../shared/utils/rate-limit';
import { err, json } from '../../shared/utils/api-response';
import { apiKeyAuth } from '../auth/api-key.auth';

import { dbRoutes } from './db.routes';
import { recordsRoutes } from './records.routes';
import { storageRoutes } from './storage.routes';

const REST_RATE_LIMIT = Number(process.env.REST_RATE_LIMIT) || 100;
const REST_PREFIX = process.env.REST_PREFIX || '/rest';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable REST_BLACKLISTED_TABLES (comma-separated).
 */
const REST_BLACKLISTED_TABLES = (
  process.env.REST_BLACKLISTED_TABLES || ''
).split(',');

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export const restRoutes = new Elysia({ prefix: REST_PREFIX })
  .use(
    openapi({
      documentation: {
        info: {
          title: `${process.env.NAME || 'PolarBase'} Documentation`,
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              name: 'x-api-key',
              in: 'header',
              description: 'API key to authorize (ex: ak_xxx)',
            },
          },
        },
      },
      references: fromTypes(),
    })
  )

  /**
   * Global API key authentication middleware (401 if invalid)
   */
  .derive(async ({ headers, set }) => {
    try {
      const apiKey = headers['x-api-key'];
      if (!apiKey) throw new Error('Invalid or missing x-api-key');

      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.rest) {
        set.status = 403;
        throw new Error(
          'Access denied: you do not have permission to access this resource.'
        );
      }
      return authData;
    } catch (e) {
      set.status ??= 401;
      throw e;
    }
  })

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, REST_RATE_LIMIT, REST_PREFIX)) {
      set.status = 429;
      return err('Too many requests. Please try again later.', 429);
    }
  })

  /**
   * Auto-wrap successful responses with json()
   */
  .onAfterHandle(({ response, set }) => {
    if (
      response !== null &&
      typeof response === 'object' &&
      !('success' in response)
    ) {
      return json(response);
    }
    return response;
  })

  /**
   * Global error handler
   */
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;

      const allErrors = (error as any).all;
      const firstError = allErrors?.[0];
      if (firstError) {
        const rawPath = firstError.path;
        const path =
          rawPath && rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
        const msg = firstError.summary || firstError.message;
        return err(path ? `${path}: ${msg}` : msg);
      }

      return err('Invalid request data');
    }

    if (error instanceof Error) {
      const status = (error as any).cause ?? set.status ?? 500;
      set.status = status;
      const message =
        process.env.NODE_ENV === 'production' && status >= 500
          ? 'Internal server error'
          : error.message;
      return err(message, status);
    }

    set.status = 500;
    return err('Unknown error');
  })

  /**
   * Block access to blacklisted tables
   */
  .derive(({ params, set }) => {
    if (params?.table && REST_BLACKLISTED_TABLES.includes(params.table)) {
      set.status = 403;
      throw new Error(`Table "${params.table}" is forbidden`);
    }
    return { blacklistedTables: REST_BLACKLISTED_TABLES };
  })

  .group('/db', (app) => app.use(dbRoutes).use(recordsRoutes))

  .group('/files', (app) => app.use(storageRoutes));

export async function enableRest(app: Elysia) {
  app.use(restRoutes);
}
