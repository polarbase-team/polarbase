import knex from 'knex';
import { types } from 'pg';

import { log } from '../utils/logger';

export const pgConfig = {
  host: process.env.POSTGRES_HOST || '0.0.0.0',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'P@ssw0rd2026',
  database: process.env.POSTGRES_DB || 'polarbase',
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

const parsePgArray = (val: any) => {
  if (!val) return [];
  return val
    .replace(/^{|}$/g, '')
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((item: string) => {
      let cleaned = item.replace(/^"|"$/g, '').replace(/\\"/g, '"');
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        return cleaned;
      }
    });
};

/**
 * Initialize Custom DB Types
 * Includes Email, URL, and Attachment domains.
 */
export const initDatabaseTypes = async () => {
  try {
    await pg.raw(`
      DO $$
      BEGIN
          -- Email Domain
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_address') THEN
              CREATE DOMAIN email_address AS TEXT
              CHECK (VALUE ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]+$');
          END IF;

          -- URL Domain
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'url_address') THEN
              CREATE DOMAIN url_address AS TEXT
              CHECK (VALUE ~* '^https\\?:\\/\\/[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(\\/.*)\\?$');
          END IF;

          -- Attachment Domain
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment') THEN
              CREATE DOMAIN attachment AS JSONB
              CHECK (
                  jsonb_typeof(VALUE) = 'object' AND
                  jsonb_exists(VALUE, 'id') AND
                  jsonb_exists(VALUE, 'key') AND
                  jsonb_exists(VALUE, 'size') AND
                  jsonb_exists(VALUE, 'name') AND
                  jsonb_exists(VALUE, 'mimeType') AND
                  jsonb_exists(VALUE, 'provider') AND
                  jsonb_exists(VALUE, 'uploadedAt')
              );
          END IF;
      END
      $$;
    `);

    const result = await pg.raw(`
      SELECT typname, oid FROM pg_type 
      WHERE typname = '_attachment'
    `);

    result.rows.forEach((row: { typname: string; oid: number }) => {
      if (row.typname === '_attachment') {
        types.setTypeParser(row.oid, parsePgArray);
      }
    });

    log.info('✅ Custom database types initialized');
  } catch (error) {
    log.error('❌ Failed to initialize database types:', error);
    throw error;
  }
};

let cachedVersion: number | null = null;

/**
 * Detects PostgreSQL major version from the database.
 * Uses SHOW server_version_num which returns a number like 170001 for PG 17.0.1
 * Major version = first 2 digits (e.g., 170001 -> 17)
 * Result is cached after first call.
 */
export const getPostgresVersion = async (): Promise<number> => {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  const result = await pg.raw('SHOW server_version_num');
  const versionNum = parseInt(result.rows[0].server_version_num, 10);

  cachedVersion = Math.floor(versionNum / 10000);
  return cachedVersion;
};

/**
 * Check if PostgreSQL version meets minimum requirement.
 */
export const isPgVersionAtLeast = async (
  minVersion: number
): Promise<boolean> => {
  const version = await getPostgresVersion();
  return version >= minVersion;
};

export default pg;
