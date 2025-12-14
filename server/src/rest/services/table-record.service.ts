import { Knex } from 'knex';

import pg from '../../plugins/pg';

export class TableRecordService {
  async getAll(
    tableName: string,
    query: Record<string, any>,
    schemaName = 'public'
  ) {
    const {
      page = '1',
      limit = '20',
      search,
      order = 'id:asc',
      where,
      fields,
    } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(1000, Math.max(1, Number(limit)));

    let qb = pg(tableName).withSchema(schemaName);
    if (where) qb = qb.where(JSON.parse(where as string));
    if (search) {
      const cols = await pg(tableName).withSchema(schemaName).columnInfo();
      qb = qb.where((b) =>
        Object.keys(cols).forEach((col) =>
          b.orWhere(col, 'like', `%${search}%`)
        )
      );
    }
    if (fields) qb = qb.select(fields.split(',').map((f: string) => f.trim()));
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

    return {
      rows: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        pages: Math.ceil(totalNum / limitNum),
      },
    };
  }

  async getOne(tableName: string, id: string | number, schemaName = 'public') {
    const record = await pg(tableName)
      .withSchema(schemaName)
      .where({ id })
      .first();
    if (!record) throw new Error('Not found');
    return record;
  }

  async create(
    tableName: string,
    body: Record<string, any>,
    schemaName = 'public'
  ) {
    const record = await pg(tableName)
      .withSchema(schemaName)
      .insert(body)
      .returning('*');
    return record;
  }

  async update(
    tableName: string,
    id: string | number,
    body: Record<string, any>,
    schemaName = 'public'
  ) {
    const record = await pg(tableName)
      .withSchema(schemaName)
      .where({ id: Number(id) })
      .update(body)
      .returning('*');
    if (!record) throw new Error('Not found');
    return record;
  }

  async delete(tableName: string, id: string | number, schemaName = 'public') {
    const deleted = await pg(tableName)
      .withSchema(schemaName)
      .where({ id })
      .del();
    if (!deleted) throw new Error('Not found');
    return null;
  }

  async bulkCreate(
    tableName: string,
    records: Record<string, any>[],
    schemaName = 'public'
  ) {
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

  async bulkUpdate(
    tableName: string,
    updates: Array<{ where: Record<string, any>; data: Record<string, any> }>,
    schemaName = 'public'
  ) {
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

  async bulkDelete(
    tableName: string,
    body: { ids?: number[]; where?: { [x: string]: any } },
    schemaName = 'public'
  ) {
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
