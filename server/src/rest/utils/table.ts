import { Knex } from 'knex';
import { Column, mapDataType } from './column';

/**
 * Retrieves the list of tables in the public schema (excluding blacklisted ones)
 * along with their comments.
 */
export const getTableList = (
  pg: Knex,
  schemaName: string,
  blacklisted: string[] = []
) => {
  return pg('pg_class as c')
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
    })
    .leftJoin('pg_namespace as ns', 'c.relnamespace', 'ns.oid')
    .leftJoin('pg_description as descr', function () {
      this.on('descr.objoid', 'c.oid').andOn(pg.raw('descr.objsubid = 0'));
    })
    .where({
      'ns.nspname': schemaName,
      'c.relkind': 'r', // r = ordinary table
    })
    .modify((qb) => {
      if (blacklisted.length > 0) {
        qb.whereNotIn('c.relname', blacklisted);
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
  const enumColumns = await pg('information_schema.columns')
    .select('column_name', 'udt_name')
    .where({
      table_schema: schemaName,
      table_name: tableName,
      ...(columnName ? { column_name: columnName } : {}),
    })
    .whereRaw(`udt_name IN (SELECT typname FROM pg_type WHERE typtype = 'e')`);

  const enumMap: Record<string, string[]> = {};

  for (const col of enumColumns) {
    const result = await pg('pg_enum')
      .select(
        pg.raw("string_agg(enumlabel, ', ' ORDER BY enumsortorder) as labels")
      )
      .whereRaw(`enumtypid = (SELECT oid FROM pg_type WHERE typname = ?)`, [
        col.udt_name,
      ])
      .first();

    if (result?.labels) {
      enumMap[col.column_name] = result.labels?.split(', ');
    }
  }

  // 5. Fetch foreign key information
  const foreignKeys = await pg('information_schema.key_column_usage as kcu')
    .select(
      'kcu.column_name',
      'tc.table_name as referenced_table_name',
      'ccu.column_name as referenced_column_name'
    )
    .join('information_schema.table_constraints as tc', function () {
      this.on('tc.constraint_name', '=', 'kcu.constraint_name')
        .andOn('tc.table_schema', '=', 'kcu.table_schema')
        .andOn('tc.table_name', '=', 'kcu.table_name');
    })
    .join('information_schema.constraint_column_usage as ccu', function () {
      this.on('ccu.constraint_name', '=', 'tc.constraint_name').andOn(
        'ccu.table_schema',
        '=',
        'tc.table_schema'
      );
    })
    .where({
      'kcu.table_schema': schemaName,
      'kcu.table_name': tableName,
      ...(columnName ? { 'kcu.column_name': columnName } : {}),
      'tc.constraint_type': 'FOREIGN KEY',
    });

  const foreignKeyMap = Object.fromEntries(
    foreignKeys.map((fk: any) => [
      fk.column_name,
      {
        table: fk.referenced_table_name,
        column: fk.referenced_column_name || 'id',
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
          AND a.attnum = ANY(c.conkey)  -- Unnest conkey để lấy từng column
      WHERE ns.nspname = ? 
        AND rel.relname = ?
        AND c.contype = 'c'  -- Chỉ check constraints
      GROUP BY c.conname, c.oid, c.conkey;
    `,
    [schemaName, tableName]
  );

  const validationMap: Record<
    string,
    {
      minLength?: number;
      maxLength?: number;
      minValue?: string | number | null;
      maxValue?: string | number | null;
    }
  > = {};

  for (const cons of checkConstraints.rows) {
    const def = cons.constraint_def.toLowerCase();
    const columnName = cons.involved_columns.toLowerCase();

    if (cons.constraint_name.endsWith('_length_check')) {
      const [min, max] = extractLengthRange(def) || [];

      validationMap[columnName] = validationMap[columnName] || {};
      if (min) validationMap[columnName].minLength = min.value;
      if (max) validationMap[columnName].maxLength = max.value;
    }

    if (cons.constraint_name.endsWith('_value_check')) {
      const [min, max] = extractValueRange(def) || [];

      validationMap[columnName] = validationMap[columnName] || {};
      if (min) validationMap[columnName].minValue = min.value;
      if (max) validationMap[columnName].maxValue = max.value;
    }

    if (cons.constraint_name.endsWith('_size_check')) {
      const maxSize = extractMaxSize(def);

      validationMap[columnName] = validationMap[columnName] || {};
      validationMap[columnName].maxValue = maxSize;
    }
  }

  // 8. Combine everything into a clean schema object
  return columns.map((col) => {
    const validation = validationMap[col.column_name] || {};
    const column: Column = {
      name: col.column_name,
      pgDataType: col.data_type,
      pgRawType: col.udt_name,
      primary: primaryKeySet.has(col.column_name),
      nullable: col.is_nullable === 'YES',
      unique: uniqueSet.has(col.column_name),
      minLength: validation.minLength ?? null,
      maxLength: validation.maxLength ?? col.character_maximum_length ?? null,
      minValue: validation.minValue ?? null,
      maxValue: validation.maxValue ?? null,
      defaultValue: col.column_default,
      comment: commentMap[col.column_name] ?? null,
      options: enumMap[col.column_name] ?? null,
      foreignKey: foreignKeyMap[col.column_name] || null,
    } as Column;
    column.dataType = mapDataType(column);
    return column;
  });
};

const extractLengthRange = (definition: string) => {
  const regex = new RegExp(
    /(?:char_length|length)\s*\(\s*\(?(\w+)\)?(?:::\w+)?\s*\)\s*(>=|<=|>|<|=|<>|!=)\s*(\d+)/gi
  );
  const matches = Array.from(definition.matchAll(regex));

  if (matches.length === 0) return null;

  return matches.map((match) => ({
    func: match[1].toLowerCase() as 'char_length' | 'length',
    operator: match[2],
    value: parseInt(match[3], 10),
  }));
};

const extractValueRange = (definition: string) => {
  const regex =
    /([\w"]+)\s*(>=|<=|>|<|=|<>|!=)\s*\(?\s*(-?\d+(?:\.\d+)?|'[^']*')\s*\)?\s*(::[\w\s]+)?/gi;
  const matches = Array.from(definition.matchAll(regex));

  const bounds: {
    operator: string;
    rawValue: string;
    value: string | number | null;
    cast?: string;
  }[] = [];

  for (const match of matches) {
    const operator = match[1];
    const rawValue = match[0].match(/('[^']*'|\-?\d+(?:\.\d+)?)/)?.[1] || '';
    let value: string | number | null = rawValue;

    if (!rawValue.startsWith("'")) {
      value = parseFloat(rawValue);
    }

    const cast = match[0].match(/::([\w\s]+)/)?.[1]?.trim();

    bounds.push({ operator, rawValue, value, cast });
  }

  return bounds;
};

const extractMaxSize = (definition: string): number | null => {
  const regex = /pg_column_size\s*\(\s*["']?(\w+)["']?\s*\)\s*(<=|<)\s*(\d+)/i;
  const match = definition.match(regex);

  if (!match) return null;

  return parseInt(match[3], 10);
};
