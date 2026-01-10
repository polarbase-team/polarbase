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
      expandFields?: Record<string, string>;
      order?: string;
      page?: number;
      limit?: number;
    };
  }) {
    const {
      where,
      search,
      fields,
      expandFields,
      order = 'id:asc',
      page = 1,
      limit = 10000,
    } = query;

    const cols = await getCachedTableSchema(pg, schemaName, tableName);
    const validColumnNames = cols.map((c) => c.name);

    let qb = pg(tableName).withSchema(schemaName).as(tableName);

    // WHERE
    if (where) {
      const prefixedWhere: Record<string, any> = {};
      for (const [key, value] of Object.entries(where)) {
        if (validColumnNames.includes(key)) {
          prefixedWhere[`${tableName}.${key}`] = value;
        }
      }
      qb = qb.where(prefixedWhere);
    }

    // Global SEARCH across text columns
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[%_]/g, '\\$&');
      const textColumns = cols.filter((col) => col.dataType === DataType.Text);

      if (textColumns.length > 0) {
        qb = qb.where((builder) => {
          textColumns.forEach((col, index) => {
            const fullColName = `${tableName}.${col.name}`;
            if (index === 0) {
              builder.where(fullColName, 'ilike', `%${safeSearch}%`);
            } else {
              builder.orWhere(fullColName, 'ilike', `%${safeSearch}%`);
            }
          });
        });
      }
    }

    const countAllQb = qb.clone();

    // EXPAND FIELDS
    if (expandFields) {
      const effectiveExpands: Record<string, string> = {};
      const shouldExpandAll =
        expandFields['*'] !== undefined || expandFields['all'] !== undefined;

      if (shouldExpandAll) {
        cols.forEach((col) => {
          if (col.foreignKey) {
            effectiveExpands[col.name] = col.foreignKey.table;
          }
        });
      } else {
        for (const [fkField, alias] of Object.entries(expandFields)) {
          const colInfo = cols.find((c) => c.name === fkField);
          if (colInfo?.foreignKey) {
            effectiveExpands[fkField] = alias || colInfo.foreignKey.table;
          }
        }
      }

      for (const [fkField, alias] of Object.entries(effectiveExpands)) {
        const colInfo = cols.find((c) => c.name === fkField)!;
        const { table: refTable, column: refColObj } = colInfo.foreignKey;
        const safeAlias = alias.replace(/[^a-zA-Z0-9_]/g, '');

        qb = qb.leftJoin(
          `${refTable} as ${safeAlias}`,
          `${tableName}.${fkField}`,
          `${safeAlias}.${refColObj.name}`
        );

        qb = qb.select(pg.raw(`to_jsonb(??.*) as ??`, [safeAlias, safeAlias]));
      }
    }

    // SELECT
    if (fields) {
      const fieldList = fields
        .split(',')
        .map((f) => f.trim())
        .map((f) => (validColumnNames.includes(f) ? `${tableName}.${f}` : null))
        .filter(Boolean) as string[];

      qb = qb.select(fieldList.length > 0 ? fieldList : `${tableName}.*`);
    } else {
      qb = qb.select(`${tableName}.*`);
    }

    // ORDER BY
    if (order) {
      const [col, dir] = order.split(':');
      const direction = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';

      if (validColumnNames.includes(col)) {
        qb = qb.orderBy(`${tableName}.${col}`, direction);
      } else {
        qb = qb.orderBy(`${tableName}.id`, 'asc');
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
      countAllQb.count(`${tableName}.id as total`).first(),
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
