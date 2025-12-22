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

  async getAll({
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
      page?: string;
      limit?: string;
    };
  }) {
    this.checkBlacklist(tableName, schemaName);

    const {
      where,
      search,
      fields,
      order = '1:asc', // default order first column
      page = '1',
      limit = '20',
    } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(1000, Math.max(1, Number(limit)));

    let qb = pg(tableName).withSchema(schemaName);

    // SELECT fields (if specified)
    if (fields) {
      const fieldList = fields.split(',').map((f: string) => f.trim());
      qb = qb.select(fieldList);
    }

    // WHERE conditions
    if (where) {
      let whereClause: Record<string, any>;
      if (typeof where === 'string') {
        try {
          whereClause = JSON.parse(where);
        } catch (e) {
          throw new Error('Invalid JSON in where parameter');
        }
      } else {
        whereClause = where;
      }
      if (Object.keys(whereClause).length > 0) {
        qb = qb.where(whereClause);
      }
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
      const [colExpr, dir] = order.split(':');
      const direction = dir === 'desc' ? 'desc' : 'asc';
      qb = qb.orderByRaw(`${colExpr} ${direction}`);
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

  async getOne({
    schemaName = 'public',
    tableName,
    id,
  }: {
    schemaName?: string;
    tableName: string;
    id: string | number;
  }) {
    this.checkBlacklist(tableName, schemaName);

    const record = await pg(tableName)
      .withSchema(schemaName)
      .where({ id })
      .first();
    if (!record) throw new Error('Not found');
    return record;
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
      page?: string;
      limit?: string;
    };
  }) {
    this.checkBlacklist(tableName, schemaName);

    const {
      select,
      where,
      group,
      having,
      order = '1:asc', // default order first column
      page = '1',
      limit = '20',
    } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(1000, Math.max(1, Number(limit)));

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
      const [colExpr, dir] = order.split(':');
      const direction = dir === 'desc' ? 'desc' : 'asc';
      qb = qb.orderByRaw(`${colExpr} ${direction}`);
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

  async create({
    schemaName = 'public',
    tableName,
    body,
  }: {
    schemaName?: string;
    tableName: string;
    body: Record<string, any>;
  }) {
    this.checkBlacklist(tableName, schemaName);

    const record = await pg(tableName)
      .withSchema(schemaName)
      .insert(body)
      .returning('*');
    return record;
  }

  async update({
    schemaName = 'public',
    tableName,
    id,
    body,
  }: {
    schemaName?: string;
    tableName: string;
    id: string | number;
    body: Record<string, any>;
  }) {
    this.checkBlacklist(tableName, schemaName);

    const record = await pg(tableName)
      .withSchema(schemaName)
      .where({ id: Number(id) })
      .update(body)
      .returning('*');
    if (!record || record.length === 0) throw new Error('Not found');
    return record;
  }

  async delete({
    schemaName = 'public',
    tableName,
    id,
  }: {
    schemaName?: string;
    tableName: string;
    id: string | number;
  }) {
    this.checkBlacklist(tableName, schemaName);

    const deleted = await pg(tableName)
      .withSchema(schemaName)
      .where({ id })
      .del();
    if (!deleted) throw new Error('Not found');
    return null;
  }

  async bulkCreate({
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
    updates: Array<{ where: Record<string, any>; data: Record<string, any> }>;
  }) {
    this.checkBlacklist(tableName, schemaName);

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('updates must be a non-empty array');
    }

    const results = await pg.transaction(async (trx) => {
      const affectedRows = [];

      for (const { where, data } of updates) {
        if (!where || Object.keys(where).length === 0) {
          throw new Error(
            'Each update item must have a non-empty "where" clause'
          );
        }
        if (!data || Object.keys(data).length === 0) {
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

  async bulkDelete({
    schemaName = 'public',
    tableName,
    body,
  }: {
    schemaName?: string;
    tableName: string;
    body: { ids?: number[]; where?: Record<string, any> };
  }) {
    this.checkBlacklist(tableName, schemaName);

    let deleted = 0;

    const { ids, where } = body;
    if (ids?.length) {
      deleted = await pg(tableName)
        .withSchema(schemaName)
        .whereIn('id', ids)
        .delete();
    } else if (where && Object.keys(where).length) {
      deleted = await pg(tableName)
        .withSchema(schemaName)
        .where(where)
        .delete();
    } else {
      throw new Error('Provide ids[] or where{}');
    }

    return { deletedCount: deleted };
  }
}
