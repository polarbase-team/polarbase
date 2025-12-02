import { Elysia, t } from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';
import { Knex } from 'knex';
import knex from '../plugins/db';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable BLACKLISTED_TABLES (comma-separated).
 */
const BLACKLISTED_TABLES = (process.env.BLACKLISTED_TABLES || '').split(',');

/**
 * Simple in-memory rate limiter (per IP).
 * Allows max 300 requests per minute.
 */
const rateLimit = new Map<string, { count: number; reset: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const rec = rateLimit.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > rec.reset) rec.count = 0;
  if (rec.count >= 300) return false;
  rec.count++;
  rateLimit.set(ip, rec);
  return true;
};

/**
 * Standard success response format.
 */
const json = (data: any, meta?: any) => ({
  success: true,
  data,
  meta,
  timestamp: new Date().toISOString(),
});

/**
 * Standard error response format.
 */
const err = (message: string, status = 400) => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
});

/**
 * Retrieves the list of tables in the public schema (excluding blacklisted ones)
 * along with their comments.
 */
const getTableList = () => {
  return knex('pg_class as c')
    .select({
      tableName: 'c.relname',
      tableComment: 'descr.description',
    })
    .leftJoin('pg_namespace as ns', 'c.relnamespace', 'ns.oid')
    .leftJoin('pg_description as descr', function () {
      this.on('descr.objoid', 'c.oid').andOn(knex.raw('descr.objsubid = 0'));
    })
    .where({
      'ns.nspname': 'public',
      'c.relkind': 'r', // r = ordinary table
    })
    .modify((qb) => {
      if (BLACKLISTED_TABLES.length > 0) {
        qb.whereNotIn('c.relname', BLACKLISTED_TABLES);
      }
    })
    .orderBy('c.relname');
};

/**
 * Builds a detailed schema for a given table:
 * - column info
 * - primary key flags
 * - column comments
 * - enum values for enum types
 */
const getTableSchema = async (tableName: string) => {
  // 1. Basic column information
  const columns = await knex('information_schema.columns')
    .select(
      'column_name',
      'data_type',
      'udt_name as raw_type',
      'is_nullable',
      'character_maximum_length as max_length',
      'column_default as default_value',
      'ordinal_position'
    )
    .where({ table_schema: 'public', table_name: tableName })
    .orderBy('ordinal_position');

  // 2. Column comments from pg_description
  const comments = await knex('pg_description')
    .select(
      'pg_description.objsubid as ordinal_position',
      'pg_description.description',
      'information_schema.columns.column_name'
    )
    .join('pg_class', 'pg_description.objoid', 'pg_class.oid')
    .join('pg_namespace', 'pg_class.relnamespace', 'pg_namespace.oid')
    .leftJoin('information_schema.columns', function () {
      this.on('information_schema.columns.table_name', '=', 'pg_class.relname')
        .andOn(
          'information_schema.columns.table_schema',
          '=',
          'pg_namespace.nspname'
        )
        .andOn(
          'information_schema.columns.ordinal_position',
          '=',
          'pg_description.objsubid'
        );
    })
    .where({
      'pg_namespace.nspname': 'public',
      'pg_class.relname': tableName,
    });

  const commentMap = Object.fromEntries(
    comments
      .map((c: any) => [c.column_name, c.description])
      .filter(([_, desc]) => desc != null)
  );

  // 3. Primary key columns
  const primaryKeys = await knex('information_schema.key_column_usage')
    .select('column_name')
    .join('information_schema.table_constraints', function () {
      this.on(
        'table_constraints.constraint_name',
        '=',
        'key_column_usage.constraint_name'
      )
        .andOn(
          'table_constraints.table_schema',
          '=',
          'key_column_usage.table_schema'
        )
        .andOn(
          'table_constraints.table_name',
          '=',
          'key_column_usage.table_name'
        );
    })
    .where({
      'key_column_usage.table_schema': 'public',
      'key_column_usage.table_name': tableName,
      'table_constraints.constraint_type': 'PRIMARY KEY',
    });

  const primaryKeySet = new Set(primaryKeys.map((pk: any) => pk.column_name));

  // 4. Enum type values
  const enumColumns = await knex('information_schema.columns')
    .select('column_name', 'udt_name')
    .where({ table_schema: 'public', table_name: tableName })
    .whereRaw(`udt_name IN (SELECT typname FROM pg_type WHERE typtype = 'e')`);

  const enumMap: Record<string, string> = {};

  for (const col of enumColumns) {
    const result = await knex('pg_enum')
      .select(
        knex.raw("string_agg(enumlabel, ', ' ORDER BY enumsortorder) as labels")
      )
      .whereRaw(`enumtypid = (SELECT oid FROM pg_type WHERE typname = ?)`, [
        col.udt_name,
      ])
      .first();

    if (result?.labels) {
      enumMap[col.column_name] = result.labels;
    }
  }

  // 5. Combine everything into a clean schema object
  return columns.map((col) => ({
    columnName: col.column_name,
    dataType: col.data_type,
    rawType: col.raw_type,
    isPrimary: primaryKeySet.has(col.column_name),
    isNullable: col.is_nullable === 'YES',
    maxLength: col.max_length,
    defaultValue: col.default_value,
    comment: commentMap[col.column_name] ?? null,
    enumValues: enumMap[col.column_name] ?? null,
  }));
};

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export const restRouter = new Elysia({ prefix: '/rest' })
  .use(
    openapi({
      references: fromTypes(),
    })
  )

  /**
   * Global rate-limit middleware (429 if exceeded)
   */
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      set.status = 429;
      return err('Too many requests', 429);
    }
  })

  /**
   * Block access to blacklisted tables
   */
  .derive(({ params, set }) => {
    if (params?.table && BLACKLISTED_TABLES.includes(params.table)) {
      set.status = 403;
      throw new Error(`Table "${params.table}" is not allowed`);
    }
  })

  /**
   * GET /rest/tables → list of allowed tables + comments
   */
  .get('/tables', async () => {
    const allowedTables = await getTableList();
    return json(allowedTables);
  })

  /**
   * GET /rest/tables/:table/schema → detailed column schema
   */
  .get(
    '/tables/:table/schema',
    async ({ params: { table }, set }) => {
      const exists = await knex.schema.hasTable(table);
      if (!exists) {
        set.status = 404;
        return err('Table not found');
      }

      const schema = await getTableSchema(table);
      return json(schema);
    },
    {
      params: t.Object({ table: t.String() }),
    }
  )

  /**
   * GET /rest/:table → paginated list with optional filters
   */
  .get(
    '/:table',
    async ({ params: { table }, query }) => {
      const {
        page = '1',
        limit = '20',
        search,
        order = 'id:desc',
        where,
        fields,
      } = query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(1000, Math.max(1, Number(limit)));

      let qb = knex(table);
      if (where) qb = qb.where(JSON.parse(where as string));
      if (search) {
        const cols = await knex(table).columnInfo();
        qb = qb.where((b) =>
          Object.keys(cols).forEach((col) =>
            b.orWhere(col, 'like', `%${search}%`)
          )
        );
      }
      if (fields) qb = qb.select(fields.split(',').map((f) => f.trim()));
      const [col, dir] = order.split(':');
      qb = qb.orderBy(col, dir === 'desc' ? 'desc' : 'asc');

      const [data, total] = await Promise.all([
        qb
          .clone()
          .limit(limitNum)
          .offset((pageNum - 1) * limitNum),
        qb.clone().count('* as total').groupBy('id').first(),
      ]);
      const totalNum = Number(total?.total || 0);

      return json(data, {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalNum,
          pages: Math.ceil(totalNum / limitNum),
        },
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })),
        search: t.Optional(t.String()),
        order: t.Optional(t.String({ pattern: '^[^:]+:(asc|desc)$' })),
        where: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /rest/:table/:id → single record
   */
  .get(
    '/:table/:id',
    async ({ params: { table, id } }) => {
      const record = await knex(table)
        .where({ id: Number(id) })
        .first();
      if (!record) throw new Error('Not found');
      return json(record);
    },
    { params: t.Object({ table: t.String(), id: t.Numeric() }) }
  )

  /**
   * POST /rest/:table → create new record
   */
  .post(
    '/:table',
    async ({ params: { table }, body }) => {
      const [{ id }] = await knex(table).insert(body).returning('id');
      const record = await knex(table).where({ id }).first();
      return json(record);
    },
    { body: t.Record(t.String(), t.Any(), { minProperties: 1 }) }
  )

  /**
   * PATCH /rest/:table/:id → partial update
   */
  .patch(
    '/:table/:id',
    async ({ params: { table, id }, body }) => {
      const count = await knex(table)
        .where({ id: Number(id) })
        .update(body);
      if (count === 0) throw new Error('Not found');
      const record = await knex(table)
        .where({ id: Number(id) })
        .first();
      return json(record);
    },
    {
      params: t.Object({ table: t.String(), id: t.Numeric() }),
      body: t.Record(t.String(), t.Any(), { minProperties: 1 }),
    }
  )

  /**
   * DELETE /rest/:table/:id → delete single record
   */
  .delete(
    '/:table/:id',
    async ({ params: { table, id } }) => {
      const deleted = await knex(table)
        .where({ id: Number(id) })
        .del();
      if (!deleted) throw new Error('Not found');
      return json(null);
    },
    { params: t.Object({ table: t.String(), id: t.Numeric() }) }
  )

  /**
   * POST /rest/:table/bulk-create → insert many records (max 10,000)
   */
  .post(
    '/:table/bulk-create',
    async ({ params: { table }, body }) => {
      const records = body as any[];
      const chunk = 500;
      let inserted = 0;

      await knex.transaction(async (trx: Knex.Transaction) => {
        for (let i = 0; i < records.length; i += chunk) {
          await trx(table).insert(records.slice(i, i + chunk));
          inserted += records.slice(i, i + chunk).length;
        }
      });

      return json({ insertedCount: inserted });
    },
    {
      body: t.Array(t.Record(t.String(), t.Any(), { minProperties: 1 }), {
        minItems: 1,
        maxItems: 10000,
      }),
    }
  )

  /**
   * PATCH /rest/:table/bulk-update → update many records by where clause
   */
  .patch(
    '/:table/bulk-update',
    async ({ params: { table }, body }) => {
      const { where, data } = body;
      const affected = await knex(table).where(where).update(data);
      return json({ updatedCount: affected });
    },
    {
      body: t.Object({
        where: t.Record(t.String(), t.Any(), { minProperties: 1 }),
        data: t.Record(t.String(), t.Any(), { minProperties: 1 }),
      }),
    }
  )

  /**
   * DELETE /rest/:table/bulk-delete → delete many records (by ids or where)
   */
  .delete(
    '/:table/bulk-delete',
    async ({ params: { table }, body }) => {
      let deleted = 0;

      const { ids, where } = body as {
        ids?: number[];
        where?: { [x: string]: any };
      };
      if (ids?.length) {
        deleted = await knex(table).whereIn('id', ids).delete();
      } else if (where && Object.keys(where).length) {
        deleted = await knex(table).where(where).delete();
      } else {
        throw err('Provide ids[] or where{}');
      }

      return json({ deletedCount: deleted });
    },
    {
      body: t.Union([
        t.Object({
          ids: t.Array(t.Number(), { minItems: 1, maxItems: 10000 }),
        }),
        t.Object({
          where: t.Record(t.String(), t.Any(), { minProperties: 1 }),
        }),
      ]),
    }
  );
