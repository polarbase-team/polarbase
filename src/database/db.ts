import 'dotenv/config';
import knex from 'knex';

const db = knex({
  client: process.env.DB_DIALECT!,
  connection: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
});

export default db;
