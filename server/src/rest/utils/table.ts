import { Knex } from 'knex';
import {
  Column,
  LENGTH_CHECK_SUFFIX,
  mapDataType,
  SIZE_CHECK_SUFFIX,
  RANGE_CHECK_SUFFIX,
  DATE_RANGE_CHECK_SUFFIX,
} from './column';

export interface Table {
  tableName: string;
  tableComment: string;
  tableColumnPk: string;
}

/**
 * Retrieves the list of tables in the public schema
 * along with their comments.
 */
export const getTableList = async (pg: Knex, schemaName: string) => {
  const tables: Table[] = await pg('pg_class as c')
    .select({
      tableName: 'c.relname',
      tableComment: 'descr.description',
      tableColumnPk: pg.raw(`
        (
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = c.oid AND i.indisprimary
          LIMIT 1
        )
      `),
      tableColumnPkType: pg.raw(`
        (
          SELECT t.typname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          JOIN pg_type t ON a.atttypid = t.oid
          WHERE i.indrelid = c.oid AND i.indisprimary
          LIMIT 1
        )
      `),
    })
    .leftJoin('pg_namespace as ns', 'c.relnamespace', 'ns.oid')
    .leftJoin('pg_description as descr', function () {
      this.on('descr.objoid', 'c.oid').andOn(pg.raw('descr.objsubid = 0'));
    })
    .where({
      'ns.nspname': schemaName,
      'c.relkind': 'r', // r = ordinary table
    })
    .orderBy('c.relname');

  return tables;
};

/**
 * Retrieves and constructs a comprehensive schema for a specific table,
 * including column metadata, primary key identification, column comments,
 * associated enum values for enum-typed columns, and additional validation
 * and foreign key details.
 */
export const getTableSchema = async (
  pg: Knex,
  schemaName: string,
  tableName: string,
  columnName?: string
) => {
  // 1. Basic column information
  const columns = await pg('information_schema.columns')
    .select(
      'column_name',
      'data_type',
      'udt_name',
      'domain_name',
      'is_nullable',
      'character_maximum_length',
      'column_default',
      'ordinal_position'
    )
    .where({
      table_schema: schemaName,
      table_name: tableName,
      ...(columnName ? { column_name: columnName } : {}),
    })
    .orderBy('ordinal_position');

  // 2. Column comments from pg_description
  const comments = await pg('pg_description')
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
      'pg_namespace.nspname': schemaName,
      'pg_class.relname': tableName,
      ...(columnName
        ? { 'information_schema.columns.column_name': columnName }
        : {}),
    });

  const commentMap = Object.fromEntries(
    comments
      .map((c: any) => [c.column_name, c.description])
      .filter(([_, desc]) => desc != null)
  );

  // 3. Primary key columns
  const primaryKeys = await pg('information_schema.key_column_usage')
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
      'key_column_usage.table_schema': schemaName,
      'key_column_usage.table_name': tableName,
      ...(columnName ? { 'key_column_usage.column_name': columnName } : {}),
      'table_constraints.constraint_type': 'PRIMARY KEY',
    });

  const primaryKeySet = new Set(primaryKeys.map((pk: any) => pk.column_name));

  // 4. Enum type values
  const enumColumns = await pg.raw(
    `
      SELECT
        c.column_name,
        t.typname AS enum_type_name
      FROM information_schema.columns c
      JOIN pg_type t ON t.typname =
        CASE
          WHEN c.udt_name ~ '^_' THEN substring(c.udt_name FROM 2)
          ELSE c.udt_name
        END
      WHERE c.table_schema = ?
        AND c.table_name = ?
        ${columnName ? 'AND c.column_name = ?' : ''}
        AND t.typtype = 'e'
    `,
    [schemaName, tableName, ...(columnName ? [columnName] : [])]
  );

  const enumMap: Record<string, string[]> = {};

  for (const col of enumColumns.rows) {
    const result = await pg('pg_enum')
      .select(
        pg.raw("string_agg(enumlabel, ', ' ORDER BY enumsortorder) as labels")
      )
      .whereRaw(`enumtypid = (SELECT oid FROM pg_type WHERE typname = ?)`, [
        col.enum_type_name,
      ])
      .first();

    if (result?.labels) {
      enumMap[col.column_name] = result.labels.split(', ');
    }
  }

  // 5. Fetch foreign key information
  const foreignKeys = await pg.raw(
    `
      SELECT
          kcu.column_name,
          c.udt_name AS column_udt_type,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name,
          rc.update_rule AS on_update,
          rc.delete_rule AS on_delete
      FROM information_schema.key_column_usage AS kcu
      -- Join để lấy quy tắc onDelete/onUpdate
      JOIN information_schema.referential_constraints AS rc
          ON kcu.constraint_name = rc.constraint_name
          AND kcu.constraint_schema = rc.constraint_schema
      -- Join để lấy thông tin bảng/cột được tham chiếu
      JOIN information_schema.constraint_column_usage AS ccu
          ON rc.unique_constraint_name = ccu.constraint_name
          AND rc.unique_constraint_schema = ccu.constraint_schema
      -- Join để lấy udt_name của cột hiện tại
      JOIN information_schema.columns AS c
          ON kcu.table_schema = c.table_schema
          AND kcu.table_name = c.table_name
          AND kcu.column_name = c.column_name
      WHERE kcu.table_schema = ?
        AND kcu.table_name = ?
        ${columnName ? 'AND kcu.column_name = ?' : ''}
    `,
    [schemaName, tableName, ...(columnName ? [columnName] : [])]
  );

  const foreignKeyMap = Object.fromEntries(
    foreignKeys.rows.map((fk: any) => [
      fk.column_name,
      {
        table: fk.referenced_table_name,
        column: { name: fk.referenced_column_name, type: fk.column_udt_type },
        onUpdate: fk.on_update,
        onDelete: fk.on_delete,
      },
    ])
  );

  // 6. Unique columns (single-column UNIQUE constraints only)
  const uniqueConstraints = await pg(
    'information_schema.table_constraints as tc'
  )
    .select('kcu.column_name')
    .join('information_schema.key_column_usage as kcu', function () {
      this.on('kcu.constraint_name', '=', 'tc.constraint_name')
        .andOn('kcu.table_schema', '=', 'tc.table_schema')
        .andOn('kcu.table_name', '=', 'tc.table_name');
    })
    .where({
      'tc.table_schema': schemaName,
      'tc.table_name': tableName,
      'tc.constraint_type': 'UNIQUE',
      ...(columnName ? { 'kcu.column_name': columnName } : {}),
    })
    .groupBy('kcu.column_name')
    .havingRaw('COUNT(*) = 1');

  const uniqueSet = new Set(uniqueConstraints.map((u: any) => u.column_name));

  // 7. Fetch CHECK constraints (min/max length and min/max value)
  const checkConstraints = await pg.raw(
    `
    SELECT 
        c.conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_def,
        STRING_AGG(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) AS involved_columns
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid 
        AND a.attnum = ANY(c.conkey)
    WHERE ns.nspname = ? 
      AND rel.relname = ?
      AND c.contype = 'c'  -- Chỉ check constraints
      ${columnName ? `AND a.attname = ?` : ''}
    GROUP BY c.conname, c.oid, c.conkey;
  `,
    columnName ? [schemaName, tableName, columnName] : [schemaName, tableName]
  );

  const validationMap: Record<
    string,
    {
      constraints: any[];
      minLength?: number;
      maxLength?: number;
      minValue?: number | null;
      maxValue?: number | null;
      minDate?: string | null;
      maxDate?: string | null;
      maxSize?: number | null;
    }
  > = {};

  for (const cons of checkConstraints.rows) {
    const def = cons.constraint_def.toLowerCase();
    const columnName = cons.involved_columns;

    if (cons.constraint_name.endsWith(LENGTH_CHECK_SUFFIX)) {
      const [min, max] = extractLengthRange(def) || [];

      validationMap[columnName] = validationMap[columnName] || {
        constraints: [],
      };
      validationMap[columnName].constraints.push(cons);
      if (min) validationMap[columnName].minLength = min.value;
      if (max) validationMap[columnName].maxLength = max.value;
    }

    if (cons.constraint_name.endsWith(RANGE_CHECK_SUFFIX)) {
      const [min, max] = extractValueRange(def) || [];

      validationMap[columnName] = validationMap[columnName] || {
        constraints: [],
      };
      validationMap[columnName].constraints.push(cons);
      if (min) validationMap[columnName].minValue = min.value;
      if (max) validationMap[columnName].maxValue = max.value;
    }

    if (cons.constraint_name.endsWith(DATE_RANGE_CHECK_SUFFIX)) {
      const [min, max] = extractDateRange(def) || [];

      validationMap[columnName] = validationMap[columnName] || {
        constraints: [],
      };
      validationMap[columnName].constraints.push(cons);
      if (min) validationMap[columnName].minDate = min.value;
      if (max) validationMap[columnName].maxDate = max.value;
    }

    if (cons.constraint_name.endsWith(SIZE_CHECK_SUFFIX)) {
      const maxSize = extractMaxSize(def);

      validationMap[columnName] = validationMap[columnName] || {
        constraints: [],
      };
      validationMap[columnName].constraints.push(cons);
      validationMap[columnName].maxSize = maxSize;
    }
  }

  // 8. Combine everything into a clean schema object
  return columns.map((col) => {
    const {
      value: defaultValue,
      rawValue: rawDefaultValue,
      isSpecialExpression: hasSpecialDefault,
    } = parsePgDefault(col.column_default);
    const { constraints, ...validation } = validationMap[col.column_name] || {};
    const column: Column = {
      name: col.column_name,
      primary: primaryKeySet.has(col.column_name),
      nullable: col.is_nullable === 'YES',
      unique: uniqueSet.has(col.column_name),
      defaultValue: !hasSpecialDefault ? defaultValue : null,
      comment: commentMap[col.column_name] ?? null,
      options: enumMap[col.column_name] ?? null,
      foreignKey: foreignKeyMap[col.column_name] || null,
      validation: Object.keys(validation).length ? validation : null,
      metadata: {
        pgDataType: col.data_type,
        pgRawType: col.udt_name,
        pgDomainName: col.domain_name,
        pgDefaultValue: rawDefaultValue,
        constraints,
      },
    } as Column;

    column.dataType = mapDataType(column);

    return column;
  });
};

const parsePgDefault = (
  rawDefault: string | null
): {
  value: any;
  rawValue: string | null;
  isSpecialExpression: boolean;
} => {
  const parsed = { rawValue: rawDefault, isSpecialExpression: false };

  if (rawDefault === null) {
    return { ...parsed, value: null };
  }

  let expr = rawDefault
    .trim()
    .replace(/::[\w\s"'\[\]]+$/, '')
    .trim();

  const specialExpressionPatterns = [
    /^nextval\(/i,
    /^currval\(/i,
    /^now\(\)$/i,
    /^current_timestamp/i,
    /^current_date/i,
    /^gen_random_uuid\(\)$/i,
    /^uuid_generate_v[1-5]/i,
    /^transaction_timestamp\(\)$/i,
    /^statement_timestamp\(\)$/i,
    /^clock_timestamp\(\)$/i,
    /^timezone\(/i,
    /^date_bin\(/i,
  ];

  const isSpecial = specialExpressionPatterns.some((pattern) =>
    pattern.test(expr)
  );
  if (isSpecial) {
    return { ...parsed, value: expr, isSpecialExpression: true };
  }

  if (/^'.*'$/.test(expr)) {
    const str = expr
      .slice(1, -1)
      .replace(/''/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"');

    return { ...parsed, value: str };
  }

  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    const num = Number(expr);
    return {
      ...parsed,
      value: Number.isInteger(num) ? parseInt(expr, 10) : num,
    };
  }

  if (expr === 'true') return { ...parsed, value: true };
  if (expr === 'false') return { ...parsed, value: false };

  if (expr === 'NULL') return { ...parsed, value: null };

  return { ...parsed, value: expr, isSpecialExpression: true };
};

export const toPgArray = (arr: string[] | null | undefined) => {
  if (arr === null || arr === undefined) return null;
  if (arr.length === 0) return '{}';
  if (typeof arr === 'string') return arr;
  return '{' + arr.map((item) => `"${item}"`).join(',') + '}';
};

const extractLengthRange = (definition: string) => {
  const regex = new RegExp(
    /(?:char_length|length)\s*\(\s*\(\s*["']?([\w ]+)["']?\s*\)?(?:::\w+)?\s*\)\s*(>=|<=|>|<)\s*(\d+)/gi
  );
  const matches = Array.from(definition.matchAll(regex));

  if (matches.length === 0) return null;

  return matches.map((match) => ({
    operator: match[2],
    value: parseInt(match[3], 10),
  }));
};

const extractValueRange = (definition: string) => {
  const regex =
    /\(\s*["']?([\w ]+)["']?\s*(>=|<=|>|<)\s*\(?\s*(-?\d+(?:\.\d+)?|'[^']*')\s*(::[\w\s]+)?\)/gi;
  const matches = Array.from(definition.matchAll(regex));

  const bounds: {
    operator: string;
    value: number | null;
  }[] = [];

  for (const match of matches) {
    const operator = match[2];
    const value = match[3].match(/('[^']*'|\-?\d+(?:\.\d+)?)/)?.[1] || '';
    bounds.push({ operator, value: parseFloat(value) });
  }

  return bounds;
};

const extractDateRange = (definition: string) => {
  const regex =
    /\(\s*["']?([\w ]+)["']?\s*(>=|<=|>|<)\s*to_timestamp\s*\(\s*'([^']+)'\s*::text\s*,\s*'YYYY-MM-DD HH24:MI'::text\s*\)\s*(::[\w\s]+)?\s*\)/gi;
  const matches = Array.from(definition.matchAll(regex));

  const bounds: {
    operator: string;
    value: string | null;
  }[] = [];

  for (const match of matches) {
    const operator = match[2];
    const value = match[3] || '';
    bounds.push({ operator, value });
  }

  return bounds;
};

const extractMaxSize = (definition: string): number | null => {
  const regex =
    /pg_column_size\s*\(\s*["']?([\w ]+)["']?\s*\)\s*(<=|<)\s*(\d+)/i;
  const match = definition.match(regex);

  if (!match) return null;

  return parseInt(match[3], 10);
};
