import { Knex } from 'knex';

import pg from '../../plugins/pg';
import { getCachedTableSchema, getTableSchema } from '../utils/table';
import { Column, DataType } from '../utils/column';
import { buildWhereClause, WhereFilter } from '../utils/record';

export class TableRecordService {
  async select({
    schemaName = 'public',
    tableName,
    query,
  }: {
    schemaName?: string;
    tableName: string;
    query: {
      where?: Record<string, any>;
      search?: string;
      fields?: string;
      order?: string;
      page?: number;
      limit?: number;
    };
  }) {
    const {
      where,
      search,
      fields,
      order = 'id:asc',
      page = 1,
      limit = 10000,
    } = query;

    const cols = await getCachedTableSchema(pg, schemaName, tableName);
    const validColumnNames = cols.map((c) => c.name);

    let qb = pg(tableName).withSchema(schemaName);

    // WHERE
    if (where) qb = qb.where(where);

    // Global SEARCH across text columns
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[%_]/g, '\\$&');
      const textColumns = cols.filter((col) => col.dataType === DataType.Text);

      if (textColumns.length > 0) {
        qb = qb.where((builder) => {
          textColumns.forEach((col, index) => {
            if (index === 0) {
              builder.where(col.name, 'ilike', `%${safeSearch}%`);
            } else {
              builder.orWhere(col.name, 'ilike', `%${safeSearch}%`);
            }
          });
        });
      }
    }

    const countAllQb = qb.clone();

    // SELECT (if specified)
    if (fields) {
      const fieldList = fields
        .split(',')
        .map((f) => f.trim())
        .filter((f) => validColumnNames.includes(f));

      if (fieldList.length > 0) {
        qb = qb.select(fieldList);
      }
    }

    // ORDER BY
    if (order) {
      const [col, dir] = order.split(':');
      const direction = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';

      if (validColumnNames.includes(col)) {
        qb = qb.orderBy(col, direction);
      } else {
        qb = qb.orderBy('id', 'asc');
      }
    }

    // Pagination + total count
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));
    const [data, totalRecord] = await Promise.all([
      qb
        .clone()
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum),
      countAllQb.count('* as total').first(),
    ]);

    const totalNum = Number(totalRecord?.total || 0);

    return {
      rows: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        pages: Math.ceil(totalNum / limitNum) || 1,
      },
    };
  }

  async aggregate({
    schemaName = 'public',
    tableName,
    query,
  }: {
    schemaName?: string;
    tableName: string;
    query: {
      select: string[];
      where?: Record<string, any>;
      group?: string[];
      having?: Record<string, any>;
      order?: string;
      page?: number;
      limit?: number;
    };
  }) {
    const {
      select,
      where,
      group,
      having,
      order,
      page = 1,
      limit = 10000,
    } = query;

    const cols = await getCachedTableSchema(pg, schemaName, tableName);
    const validColumnNames = cols.map((c) => c.name);

    let qb = pg(tableName).withSchema(schemaName);

    // SELECT
    // Only allow specific aggregate patterns or valid column names
    const safeSelect = select.map((expr) => {
      const isSimpleCol = validColumnNames.includes(expr);
      const isAggregate = /^(count|sum|avg|min|max)\([a-z0-9_*]+\)$/i.test(
        expr
      );

      if (isSimpleCol || isAggregate) {
        return pg.raw(expr);
      }
      throw new Error(`Invalid select expression: ${expr}`);
    });
    qb = qb.select(safeSelect);

    // WHERE
    if (where) qb = qb.where(where);

    // GROUP BY
    if (group) {
      const safeGroup = group.filter((g) => validColumnNames.includes(g));
      qb = qb.groupBy(safeGroup);
    }

    // HAVING
    if (having) {
      Object.entries(having).forEach(([key, value]) => {
        if (!validColumnNames.includes(key)) return;

        const isObj = typeof value === 'object' && value !== null;
        const op = isObj ? value.operator : '=';
        const val = isObj ? value.value : value;

        // Use parameterized having to prevent injection in value
        qb.having(pg.raw(key), op, val);
      });
    }

    // ORDER BY
    if (order) {
      const [col, dir] = order.split(':');
      if (validColumnNames.includes(col)) {
        qb = qb.orderBy(col, dir.toLowerCase() === 'desc' ? 'desc' : 'asc');
      }
    }

    // Pagination + total
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));
    const [data, totalRecord] = await Promise.all([
      qb
        .clone()
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum),
      pg
        .from(qb.clone().as('sub'))
        .count('* as total')
        .first<{ total: string | number } | undefined>(),
    ]);

    const totalNum = Number(totalRecord?.total || 0);

    return {
      rows: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        pages: Math.ceil(totalNum / limitNum) || 1,
      },
    };
  }

  async insert({
    schemaName = 'public',
    tableName,
    records,
  }: {
    schemaName?: string;
    tableName: string;
    records: Record<string, any>[];
  }) {
    const returning = [] as any[];
    const chunk = 500;

    await pg.transaction(async (trx: Knex.Transaction) => {
      for (let i = 0; i < records.length; i += chunk) {
        const inserted = await trx(tableName)
          .withSchema(schemaName)
          .insert(records.slice(i, i + chunk))
          .returning('*');
        returning.push(...inserted);
      }
    });

    return { insertedCount: returning.length, returning };
  }

  async update({
    schemaName = 'public',
    tableName,
    updates,
  }: {
    schemaName?: string;
    tableName: string;
    updates: {
      where: WhereFilter;
      data: Record<string, any>;
    }[];
  }) {
    if (!Array.isArray(updates) || !updates.length) {
      throw new Error('updates must be a non-empty array');
    }

    const results = await pg.transaction(async (trx) => {
      const affectedRows = [];

      for (const { where, data } of updates) {
        if (!where || !Object.keys(where).length) {
          throw new Error(
            'Each update item must have a non-empty "where" clause'
          );
        }
        if (!data || !Object.keys(data).length) {
          throw new Error(
            'Each update item must have a non-empty "data" object'
          );
        }

        const qb = trx(tableName).withSchema(schemaName);
        const affected = await buildWhereClause(qb, where)
          .update(data)
          .returning('*');
        affectedRows.push(...affected);
      }

      return affectedRows;
    });

    return { updatedCount: results.length, returning: results };
  }

  async delete({
    schemaName = 'public',
    tableName,
    condition,
  }: {
    schemaName?: string;
    tableName: string;
    condition: {
      where: WhereFilter;
    };
  }) {
    let deleted = 0;

    const { where } = condition;
    if (where && Object.keys(where).length) {
      const qb = pg(tableName).withSchema(schemaName);
      deleted = await buildWhereClause(qb, where).delete();
    } else {
      throw new Error('Missing where conditions');
    }

    return { deletedCount: deleted };
  }
}
