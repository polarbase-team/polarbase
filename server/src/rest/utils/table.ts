import { Knex } from 'knex';
import { LRUCache } from 'lru-cache';
import { getAllTableMetadata } from '../db/table-metadata';
import { getAllColumnMetadata, getColumnMetadata } from '../db/column-metadata';
import {
  Column,
  LENGTH_CHECK_SUFFIX,
  mapDataType,
  SIZE_CHECK_SUFFIX,
  RANGE_CHECK_SUFFIX,
  DATE_RANGE_CHECK_SUFFIX,
  FILE_COUNT_CHECK_SUFFIX,
  OPTIONS_CHECK_SUFFIX,
  EMAIL_DOMAIN_CHECK_SUFFIX,
} from './column';

export interface Table {
  name: string;
  comment: string | null;
  primaryKey: { name: string; type: string };
  presentation?: {
    uiName?: string;
  } | null;
}

/**
 * Retrieves the list of tables in the public schema
 * along with their comments.
 */
export const getTableList = async (pg: Knex, schemaName: string) => {
  // Get table list from database
  const tables: Table[] = await pg('pg_class as c')
    .select({
      name: 'c.relname',
      comment: 'descr.description',
      primaryKey: pg.raw(`
        json_build_object(
          'name', pk.attname,
          'type', t.typname
        )
      `),
    })
    .leftJoin('pg_namespace as ns', 'c.relnamespace', 'ns.oid')
    .leftJoin('pg_description as descr', function () {
      this.on('descr.objoid', 'c.oid').andOn(pg.raw('descr.objsubid = 0'));
    })
    .leftJoin(
      pg.raw(`
        (
          SELECT i.indrelid, a.attname, a.atttypid
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indisprimary
        ) pk
      `),
      'pk.indrelid',
      'c.oid'
    )
    .leftJoin('pg_type as t', 'pk.atttypid', 't.oid')
    .where({
      'ns.nspname': schemaName,
      'c.relkind': 'r',
    })
    .orderBy('c.relname');

  // Get table presentation metadata
  const allTableMetadata = await getAllTableMetadata(schemaName);
  tables.forEach((table) => {
    const tableMetadata = allTableMetadata.find(
      (metadata) => metadata.tableName === table.name
    );
    table.presentation = tableMetadata
      ? {
          uiName: tableMetadata.uiName,
        }
      : null;
  });

  return tables;
};

/**
 * Retrieves and constructs a comprehensive schema for a specific table,
 * including column metadata, primary key identification, column comments,
 * and additional validation and foreign key details.
 */
export const getTableSchema = async (
  pg: Knex,
  schemaName: string,
  tableName: string,
  columnName?: string
) => {
  /**
   * 1. Parallel Data Fetching
   * Execute all independent metadata queries concurrently to minimize network latency.
   */
  const [
    columns,
    comments,
    primaryKeys,
    foreignKeys,
    uniqueConstraints,
    checkConstraints,
    columnMetadata,
  ] = await Promise.all([
    // Basic column properties (type, nullability, default values)
    pg('information_schema.columns')
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
      .orderBy('ordinal_position'),

    // Column descriptions from pg_description
    pg('pg_description')
      .select(
        'pg_description.objsubid as ordinal_position',
        'pg_description.description',
        'information_schema.columns.column_name'
      )
      .join('pg_class', 'pg_description.objoid', 'pg_class.oid')
      .join('pg_namespace', 'pg_class.relnamespace', 'pg_namespace.oid')
      .leftJoin('information_schema.columns', function () {
        this.on(
          'information_schema.columns.table_name',
          '=',
          'pg_class.relname'
        )
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
      }),

    // Identify primary key columns
    pg('information_schema.key_column_usage')
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
      }),

    // Fetch Foreign Key relationships and referential actions (ON UPDATE/DELETE)
    pg.raw(
      `
      SELECT kcu.column_name, c.udt_name AS column_udt_type, ccu.table_name AS referenced_table_name,
             ccu.column_name AS referenced_column_name, rc.update_rule AS on_update, rc.delete_rule AS on_delete
      FROM information_schema.key_column_usage AS kcu
      JOIN information_schema.referential_constraints AS rc ON kcu.constraint_name = rc.constraint_name AND kcu.constraint_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage AS ccu ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
      JOIN information_schema.columns AS c ON kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name AND kcu.column_name = c.column_name
      WHERE kcu.table_schema = ? AND kcu.table_name = ? ${columnName ? 'AND kcu.column_name = ?' : ''}
    `,
      [schemaName, tableName, ...(columnName ? [columnName] : [])]
    ),

    // Single-column unique constraints
    pg('information_schema.table_constraints as tc')
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
      .havingRaw('COUNT(*) = 1'),

    // Check constraints definition for custom validation logic
    pg.raw(
      `
      SELECT c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS constraint_def,
             STRING_AGG(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) AS involved_columns
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE ns.nspname = ? AND rel.relname = ? AND c.contype = 'c' ${columnName ? `AND a.attname = ?` : ''}
      GROUP BY c.conname, c.oid, c.conkey;
    `,
      columnName ? [schemaName, tableName, columnName] : [schemaName, tableName]
    ),

    // Get column metadata
    columnName
      ? getColumnMetadata(schemaName, tableName, columnName)
      : getAllColumnMetadata(schemaName, tableName),
  ]);

  /**
   * 2. Map Raw Data to Optimized Lookup Structures (O(1) access)
   */
  const commentMap = Object.fromEntries(
    comments.map((c: any) => [c.column_name, c.description])
  );
  const primaryKeySet = new Set(primaryKeys.map((pk: any) => pk.column_name));
  const uniqueSet = new Set(uniqueConstraints.map((u: any) => u.column_name));
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

  /**
   * 3. Parse Check Constraints into Validation Rules
   * Uses Naming Convention (Suffixes) to categorize constraints.
   */
  const validationMap: Record<string, any> = {};
  const optionsMap: Record<string, string[] | null> = {};
  for (const cons of checkConstraints.rows) {
    const def = cons.constraint_def;
    const colName = cons.involved_columns;
    validationMap[colName] = validationMap[colName] || { constraints: [] };
    validationMap[colName].constraints.push(cons);

    if (cons.constraint_name.endsWith(LENGTH_CHECK_SUFFIX)) {
      const range = extractLengthRange(def);
      if (range?.[0]) validationMap[colName].minLength = range[0].value;
      if (range?.[1]) validationMap[colName].maxLength = range[1].value;
    } else if (cons.constraint_name.endsWith(RANGE_CHECK_SUFFIX)) {
      const range = extractValueRange(def);
      if (range?.[0]) validationMap[colName].minValue = range[0].value;
      if (range?.[1]) validationMap[colName].maxValue = range[1].value;
    } else if (cons.constraint_name.endsWith(DATE_RANGE_CHECK_SUFFIX)) {
      const range = extractDateRange(def);
      if (range?.[0]) validationMap[colName].minDate = range[0].value;
      if (range?.[1]) validationMap[colName].maxDate = range[1].value;
    } else if (cons.constraint_name.endsWith(SIZE_CHECK_SUFFIX)) {
      validationMap[colName].maxSize = extractMaxSize(def);
    } else if (cons.constraint_name.endsWith(FILE_COUNT_CHECK_SUFFIX)) {
      validationMap[colName].maxFiles = extractFileCount(def);
    } else if (cons.constraint_name.endsWith(EMAIL_DOMAIN_CHECK_SUFFIX)) {
      validationMap[colName].allowedDomains = extractEmailDomains(def);
    } else if (cons.constraint_name.endsWith(OPTIONS_CHECK_SUFFIX)) {
      optionsMap[colName] = extractOptions(def);
    }
  }

  /**
   * 4. Get column presentation metadata
   * columnMetadata is either a single object or an array of objects
   */
  const presentationMap: Record<string, { uiName: string; format: any }> = {};
  if (columnMetadata) {
    for (const m of Array.isArray(columnMetadata)
      ? columnMetadata
      : [columnMetadata]) {
      presentationMap[m.columnName] = {
        uiName: m.uiName,
        format: m.format,
      };
    }
  }

  /**
   * 5. Final Schema Assembly
   * Combine all metadata into a unified Column object.
   */
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
      options: optionsMap[col.column_name] ?? null,
      foreignKey: foreignKeyMap[col.column_name] || null,
      validation: Object.keys(validation).length ? validation : null,
      presentation: presentationMap[col.column_name] ?? null,
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

const schemaCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60,
});
export const getCachedTableSchema = async (
  pg: Knex,
  schemaName: string,
  tableName: string
) => {
  const cacheKey = `schema:${schemaName}:${tableName}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey) as Column[];
  }

  const schema = await getTableSchema(pg, schemaName, tableName);
  schemaCache.set(cacheKey, schema);

  return schema;
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

  // Remove type casting (e.g., 'val'::text -> 'val')
  let expr = rawDefault
    .trim()
    .replace(/::[\w\s"'\[\]]+$/, '')
    .trim();

  // Check for special expressions/functions
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

  if (specialExpressionPatterns.some((pattern) => pattern.test(expr))) {
    return { ...parsed, value: expr, isSpecialExpression: true };
  }

  // Handle Postgres Array Literals: '{val1,val2}'
  if (/^'\{.*\}'$/.test(expr)) {
    const arrayContent = expr.slice(2, -2); // Remove '{ and }'
    if (arrayContent === '') return { ...parsed, value: [] };

    const items = arrayContent.split(',').map((item) => {
      let trimmed = item.trim();
      // Remove surrounding quotes if elements are quoted
      if (/^".*"$/.test(trimmed)) {
        return trimmed.slice(1, -1).replace(/\\"/g, '"');
      }
      return trimmed;
    });

    return { ...parsed, value: items };
  }

  // Handle Strings: 'text'
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

  // Handle Numbers
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    const num = Number(expr);
    return {
      ...parsed,
      value: Number.isInteger(num) ? parseInt(expr, 10) : num,
    };
  }

  // Booleans and Nulls
  if (expr.toLowerCase() === 'true') return { ...parsed, value: true };
  if (expr.toLowerCase() === 'false') return { ...parsed, value: false };
  if (expr.toUpperCase() === 'NULL') return { ...parsed, value: null };

  // Default fallback for unhandled expressions
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
  if (matches.length === 0) return null;

  return matches.map((match) => {
    const operator = match[2];
    const value = match[3].match(/('[^']*'|\-?\d+(?:\.\d+)?)/)?.[1] || '';
    return { operator, value: parseFloat(value) };
  });
};

const extractDateRange = (definition: string) => {
  const regex =
    /\(\s*["']?([\w ]+)["']?\s*(>=|<=|>|<)\s*to_timestamp\s*\(\s*'([^']+)'\s*::text\s*,\s*'YYYY-MM-DD HH24:MI'::text\s*\)\s*(::[\w\s]+)?\s*\)/gi;

  const matches = Array.from(definition.matchAll(regex));
  if (matches.length === 0) return null;

  return matches.map((match) => {
    const operator = match[2];
    const value = match[3] || '';
    return { operator, value };
  });
};

const extractMaxSize = (definition: string): number | null => {
  const regex =
    /pg_column_size\s*\(\s*["']?([\w ]+)["']?\s*\)\s*(<=|<)\s*(\d+)/i;

  const match = definition.match(regex);
  if (!match) return null;

  return parseInt(match[3], 10);
};

const extractFileCount = (definition: string) => {
  const regex = /cardinality\s*\(\s*"?([\w ]+)"?\s*\)\s*(<=|<)\s*(\d+)/i;
  const match = definition.match(regex);
  if (!match) return null;

  return parseInt(match[3], 10);
};

const extractEmailDomains = (definition: string): string | null => {
  const regex =
    /split_part\s*\(\s*\(.*?\)::text\s*,\s*'@'::text\s*,\s*2\s*\)\s*(?:=\s*ANY\s*\(ARRAY\[(.*?)\]\)|IN\s*\((.*?)\)|=\s*('(.*?)'::text))/i;

  const match = definition.match(regex);
  if (!match) return null;

  const rawList = match[1] || match[2];
  if (rawList) {
    return rawList
      .split(',')
      .map((item) => {
        return item
          .trim()
          .split('::')[0]
          .replace(/^'|'$/g, '')
          .replace(/''/g, "'");
      })
      .filter((item) => item !== '')
      .join(', ');
  }

  if (match[4]) {
    return match[4].replace(/''/g, "'");
  }

  return null;
};

const extractOptions = (definition: string): string[] | null => {
  const regex =
    /(?:ANY\s*\(\s*ARRAY\s*\[\s*(.*?)\s*\]\s*\)|IN\s*\((.*?)\)|<@\s*ARRAY\[(.*?)\]|=\s*('(?:''|[^'])*'))/i;

  const match = definition.match(regex);
  if (!match) return null;

  const rawContent = match[1] || match[2] || match[3] || match[4];
  return rawContent
    .split(',')
    .map((item) => {
      return item
        .trim()
        .split('::')[0]
        .trim()
        .replace(/^'|'$/g, '')
        .replace(/''/g, "'");
    })
    .filter((item) => item !== '');
};
