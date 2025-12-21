import knex from 'knex';

export const pgConfig = {
  host: process.env.POSTGRES_HOST || '0.0.0.0',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'P@ssw0rd2025',
  database: process.env.POSTGRES_DATABASE || 'polarbase',
  ssl:
    process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export default knex({
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
  debug: process.env.NODE_ENV === 'development',
});
