import { Knex } from 'knex';

import pg from '../../plugins/pg';
import { getTableSchema } from '../utils/table';
import { DataType } from '../utils/column';

export class TableRecordService {
  private blacklistedTables: string[] = [];

  constructor(blacklistedTables?: string[]) {
    if (blacklistedTables) {
      this.blacklistedTables = blacklistedTables;
    }
  }

  private checkBlacklist(tableName: string, schemaName: string = 'public') {
    const fullName = `${schemaName}.${tableName}`;

    if (
      this.blacklistedTables.includes(tableName) ||
      this.blacklistedTables.includes(fullName)
    ) {
      throw new Error(`Access to table "${fullName}" is forbidden`);
    }
  }

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
    this.checkBlacklist(tableName, schemaName);

    const { where, search, fields, order, page = 1, limit = 10000 } = query;

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));

    let qb = pg(tableName).withSchema(schemaName);

    // SELECT fields (if specified)
    if (fields) {
      const fieldList = fields.split(',').map((f) => f.trim());
      qb = qb.select(fieldList);
    }

    // WHERE conditions
    if (where && Object.keys(where).length > 0) {
      qb = qb.where(where);
    }

    // Global SEARCH across text columns
    if (search && search.trim()) {
      const cols = await getTableSchema(pg, schemaName, tableName);
      const textColumns = cols.filter((col) => {
        return col.dataType === DataType.Text;
      });

      if (textColumns.length > 0) {
        qb = qb.where((builder) => {
          textColumns.forEach((col, index) => {
            if (index === 0) {
              builder.where(col.name, 'ilike', `%${search.trim()}%`);
            } else {
              builder.orWhere(col.name, 'ilike', `%${search.trim()}%`);
            }
          });
        });
      }
    }

    // ORDER BY
    if (order) {
      const [col, dir] = order.split(':');
      const direction = dir.toLowerCase() === 'desc' ? 'desc' : 'asc';
      qb = qb.orderBy(col, direction);
    }

    // Pagination + total count
    const [data, totalRecord] = await Promise.all([
      qb
        .clone()
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum),
      qb.clone().count('* as total').first(),
    ]);

    const totalNum = Number(totalRecord?.total || 0);

    return {
      rows: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        pages: Math.ceil(totalNum / limitNum || 1),
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
    this.checkBlacklist(tableName, schemaName);

    const {
      select,
      where,
      group,
      having,
      order,
      page = 1,
      limit = 10000,
    } = query;

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));

    let qb = pg(tableName).withSchema(schemaName);

    // SELECT
    select.forEach((expr) => {
      qb = qb.select(pg.raw(expr));
    });

    // WHERE
    if (where && Object.keys(where).length > 0) {
      qb = qb.where(where);
    }

    // GROUP BY
    if (group && group.length > 0) {
      qb = qb.groupBy(group);
    }

    // HAVING
    if (having && Object.keys(having).length > 0) {
      Object.entries(having).forEach(([key, value]) => {
        if (
          typeof value === 'object' &&
          value !== null &&
          'operator' in value &&
          'value' in value
        ) {
          qb = qb.having(key, value.operator, value.value);
        } else {
          qb = qb.having(key, '=', value);
        }
      });
    }

    // ORDER BY
    if (order) {
      const [col, dir] = order.split(':');
      const direction = dir.toLowerCase() === 'desc' ? 'desc' : 'asc';
      qb = qb.orderBy(col, direction);
    }

    // Pagination + total
    const [data, totalRecord] = await Promise.all([
      qb
        .clone()
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum),
      qb.clone().count('* as total').first(),
    ]);

    const totalNum = Number(totalRecord?.total || 0);

    return {
      rows: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        pages: Math.ceil(totalNum / limitNum || 1),
      },
    };
  }

  insert({
    schemaName = 'public',
    tableName,
    record,
  }: {
    schemaName?: string;
    tableName: string;
    record: Record<string, any>;
  }) {
    this.checkBlacklist(tableName, schemaName);

    return pg(tableName).withSchema(schemaName).insert(record).returning('*');
  }

  async update({
    schemaName = 'public',
    tableName,
    update,
  }: {
    schemaName?: string;
    tableName: string;
    update: {
      where: Record<string, any>;
      data: Record<string, any>;
    };
  }) {
    this.checkBlacklist(tableName, schemaName);

    const { where, data } = update;
    const record = await pg(tableName)
      .withSchema(schemaName)
      .where(where)
      .update(data)
      .returning('*');
    if (!record?.length) throw new Error('Not found');
    return record;
  }

  async delete({
    schemaName = 'public',
    tableName,
    condition,
  }: {
    schemaName?: string;
    tableName: string;
    condition: {
      where?: Record<string, any>;
      whereIn?: Record<string, any[]>;
    };
  }) {
    this.checkBlacklist(tableName, schemaName);

    let deleted = 0;

    const { where, whereIn } = condition;
    if (where && Object.keys(where).length) {
      deleted = await pg(tableName)
        .withSchema(schemaName)
        .where(where)
        .delete();
    } else if (whereIn && Object.keys(whereIn).length) {
      const query = pg(tableName).withSchema(schemaName);
      for (const [column, values] of Object.entries(whereIn)) {
        if (Array.isArray(values) && values.length > 0) {
          query.whereIn(column, values);
        }
      }
      deleted = await query.delete();
    } else {
      throw new Error('Missing where conditions');
    }

    return { deletedCount: deleted };
  }

  async bulkInsert({
    schemaName = 'public',
    tableName,
    records,
  }: {
    schemaName?: string;
    tableName: string;
    records: Record<string, any>[];
  }) {
    this.checkBlacklist(tableName, schemaName);

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

  async bulkUpdate({
    schemaName = 'public',
    tableName,
    updates,
  }: {
    schemaName?: string;
    tableName: string;
    updates: {
      where: Record<string, any>;
      data: Record<string, any>;
    }[];
  }) {
    this.checkBlacklist(tableName, schemaName);

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

        const affected = await trx(tableName)
          .withSchema(schemaName)
          .where(where)
          .update(data)
          .returning('*');
        affectedRows.push(...affected);
      }

      return affectedRows;
    });

    return { updatedCount: results.length, returning: results };
  }
}
