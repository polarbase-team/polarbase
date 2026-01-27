import { Knex } from 'knex';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'like'
  | 'ilike'
  | 'notLike'
  | 'notIlike';

export type SimpleFilter = {
  [operator in FilterOperator]?: any;
};

export type ColumnFilter = {
  [column: string]: any | SimpleFilter;
};

export type LogicGroup = {
  and?: Condition[];
  or?: Condition[];
};

export type Condition = ColumnFilter | LogicGroup;

export type WhereFilter = Condition;

const VALID_OPERATORS: FilterOperator[] = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'like',
  'ilike',
  'notLike',
  'notIlike',
];

const applySimpleFilter = (
  qb: Knex.QueryBuilder,
  column: string,
  value: any | SimpleFilter
) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Advanced operator
    for (const [op, val] of Object.entries(value) as [string, any][]) {
      if (!VALID_OPERATORS.includes(op as FilterOperator)) {
        throw new Error(`Invalid operator: ${op}`);
      }

      switch (op) {
        case 'eq':
          qb.andWhere(column, '=', val);
          break;
        case 'ne':
          qb.andWhere(column, '!=', val);
          break;
        case 'gt':
          qb.andWhere(column, '>', val);
          break;
        case 'gte':
          qb.andWhere(column, '>=', val);
          break;
        case 'lt':
          qb.andWhere(column, '<', val);
          break;
        case 'lte':
          qb.andWhere(column, '<=', val);
          break;
        case 'in':
          qb.andWhere(column, 'in', Array.isArray(val) ? val : [val]);
          break;
        case 'notIn':
          qb.andWhere(column, 'not in', Array.isArray(val) ? val : [val]);
          break;
        case 'like':
          qb.andWhere(column, 'like', val);
          break;
        case 'ilike':
          qb.andWhere(column, 'ilike', val);
          break;
        case 'notLike':
          qb.andWhere(column, 'not like', val);
          break;
        case 'notIlike':
          qb.andWhere(column, 'not ilike', val);
          break;
        default:
          throw new Error(`Unsupported operator: ${op}`);
      }
    }
    return qb;
  } else {
    // Simple equality
    return qb.andWhere(column, '=', value);
  }
};

const buildWhereClauseRecursive = (
  qb: Knex.QueryBuilder,
  condition: Condition,
  tableName?: string
): Knex.QueryBuilder => {
  if ('and' in condition || 'or' in condition) {
    const andConditions = (condition as LogicGroup).and;
    const orConditions = (condition as LogicGroup).or;

    if (andConditions && orConditions) {
      throw new Error('Cannot mix "and" and "or" at the same level');
    }

    if (andConditions) {
      if (andConditions.length === 0) return qb;
      if (andConditions.length === 1) {
        return buildWhereClauseRecursive(qb, andConditions[0], tableName);
      }
      return qb.where(function (this: Knex.QueryBuilder) {
        for (const cond of andConditions) {
          buildWhereClauseRecursive(this, cond, tableName);
        }
      });
    }

    if (orConditions) {
      if (orConditions.length === 0) return qb;
      if (orConditions.length === 1) {
        return buildWhereClauseRecursive(qb, orConditions[0], tableName);
      }
      return qb.where(function () {
        for (const cond of orConditions) {
          this.orWhere((sub) =>
            buildWhereClauseRecursive(sub, cond, tableName)
          );
        }
      });
    }
  } else if (typeof condition === 'object' && condition !== null) {
    return qb.where(function (this: Knex.QueryBuilder) {
      for (const [column, value] of Object.entries(condition)) {
        const safeColumn =
          tableName && !column.includes('.')
            ? `${tableName}.${column}`
            : column;
        applySimpleFilter(this, safeColumn, value);
      }
    });
  }

  throw new Error('Invalid condition structure');
};

export const buildWhereClause = (
  qb: Knex.QueryBuilder,
  where?: WhereFilter,
  tableName?: string
) => {
  if (!where || Object.keys(where).length === 0) {
    return qb;
  }
  return buildWhereClauseRecursive(qb, where, tableName);
};
