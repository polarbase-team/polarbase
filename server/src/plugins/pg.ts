import knex from 'knex';

import { log } from '../utils/logger';

export const pgConfig = {
  host: process.env.POSTGRES_HOST || '0.0.0.0',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'P@ssw0rd2025',
  database: process.env.POSTGRES_DATABASE || 'polarbase',
  ssl:
    process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const pg = knex({
  client: 'postgres',
  connection: { ...pgConfig },
  pool: {
    min: 0,
    max: Number(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    reapIntervalMillis: 1000,
    propagateCreateError: false,
  },
  acquireConnectionTimeout: 60000,
  debug: process.env.DEBUG === 'true',
});

/**
 * Initialize Custom DB Types
 * Includes Email, URL domains, and the Attachment composite type.
 */
export const initDatabaseTypes = async () => {
  try {
    await pg.raw(`
      DO $$
      BEGIN
          -- 1. Email Domain
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_address') THEN
              CREATE DOMAIN email_address AS TEXT
              CHECK (VALUE ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]+$');
          END IF;

          -- 2. URL Domain
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'url_address') THEN
              CREATE DOMAIN url_address AS TEXT
              CHECK (VALUE ~* '^https\\?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$');
          END IF;

          -- 3. Attachment Composite Type
          -- We check pg_type for the 'attachment' name
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment') THEN
              CREATE TYPE attachment AS (
                  id           UUID,
                  name         TEXT,
                  key          TEXT,
                  size         BIGINT,
                  mime_type    TEXT,
                  provider     TEXT,
                  url          TEXT,
                  created_at   TIMESTAMPTZ
              );
          END IF;
      END
      $$;
    `);
    log.info('✅ Custom database types initialized');
  } catch (error) {
    log.error('❌ Failed to initialize database types:', error);
    throw error;
  }
};

export default pg;
