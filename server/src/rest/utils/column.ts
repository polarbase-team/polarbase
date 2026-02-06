import { Knex } from 'knex';

import { getPostgresVersion } from '../../plugins/pg';

export const DataType = {
  Text: 'text',
  LongText: 'long-text',
  Integer: 'integer',
  Number: 'number',
  Date: 'date',
  Checkbox: 'checkbox',
  Select: 'select',
  MultiSelect: 'multi-select',
  Email: 'email',
  Url: 'url',
  JSON: 'json',
  GeoPoint: 'geo-point',
  Reference: 'reference',
  Attachment: 'attachment',
  AutoNumber: 'auto-number',
  AutoDate: 'auto-date',
  Formula: 'formula',
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export const ReferentialAction = {
  NoAction: 'NO ACTION',
  SetNull: 'SET NULL',
  Cascade: 'CASCADE',
} as const;
export type ReferentialAction =
  (typeof ReferentialAction)[keyof typeof ReferentialAction];

export const FormulaResultType = {
  Text: 'text',
  Integer: 'integer',
  Number: 'numeric',
  Date: 'date',
  Boolean: 'boolean',
  Jsonb: 'jsonb',
} as const;
export type FormulaResultType =
  (typeof FormulaResultType)[keyof typeof FormulaResultType];

export const FormulaStrategy = {
  Stored: 'stored',
  Virtual: 'virtual',
} as const;
export type FormulaStrategy =
  (typeof FormulaStrategy)[keyof typeof FormulaStrategy];

export interface Column {
  name: string;
  dataType: DataType;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string | null;
  comment: string | null;
  presentation: {
    uiName?: string;
    format?: any;
  } | null;
  validation: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    minDate?: string;
    maxDate?: string;
    maxSize?: number;
    maxFiles?: number;
    allowedDomains?: string;
  } | null;
  options: string[] | null;
  foreignKey: {
    table: string;
    column: { name: string; type: string };
    onUpdate: ReferentialAction;
    onDelete: ReferentialAction;
  } | null;
  formula?: {
    resultType: FormulaResultType;
    expression: string;
    strategy?: FormulaStrategy;
  } | null;
  metadata: {
    rawDataType?: string;
    rawDefaultValue?: string;
    udtName?: string;
    domainName?: string;
    isGenerated?: string;
    generationExpression?: string;
    constraints?: {
      constraint_name: string;
      constraint_type: string;
      constraint_definition: string;
    }[];
  };
}

const PG_TYPE_MAPPING: Record<string, DataType> = {
  // Integer
  smallint: DataType.Integer,
  integer: DataType.Integer,
  bigint: DataType.Integer,
  smallserial: DataType.Integer,
  serial: DataType.Integer,
  bigserial: DataType.Integer,

  // Number
  numeric: DataType.Number,
  real: DataType.Number,
  'double precision': DataType.Number,

  // Text
  character: DataType.Text,
  'character varying': DataType.Text,
  uuid: DataType.Text,
  bit: DataType.Text,
  'bit varying': DataType.Text,

  // Long Text
  text: DataType.LongText,

  // Checkbox
  boolean: DataType.Checkbox,

  // Date
  date: DataType.Date,
  timestamp: DataType.Date,
  time: DataType.Date,

  // Email
  email_address: DataType.Email,

  // Url
  url_address: DataType.Url,

  // JSON
  json: DataType.JSON,
  jsonb: DataType.JSON,

  // GeoPoint
  point: DataType.GeoPoint,
};

export const mapDataType = (column: Column) => {
  const { rawDataType, rawDefaultValue, udtName, domainName } =
    column.metadata || {};

  // Detect AutoNumber
  if (
    rawDefaultValue &&
    typeof rawDefaultValue === 'string' &&
    rawDefaultValue.includes('nextval')
  ) {
    return DataType.AutoNumber;
  }

  // Detect AutoDateTime
  if (
    rawDataType === 'timestamp with time zone' &&
    rawDefaultValue === 'CURRENT_TIMESTAMP'
  ) {
    return DataType.AutoDate;
  }

  // Detect Email and Url domains
  if (domainName === 'email_address') {
    return DataType.Email;
  } else if (domainName === 'url_address') {
    return DataType.Url;
  }

  // Detect Selects and Multi-Selects
  if (column.options) {
    if (rawDataType === 'ARRAY') {
      return DataType.MultiSelect;
    }
    return DataType.Select;
  }

  // Detect References
  if (column.foreignKey) {
    return DataType.Reference;
  }

  // Detect Formula
  if (column.formula) {
    return DataType.Formula;
  }

  // Detect Attachment
  if (udtName === '_attachment') {
    return DataType.Attachment;
  }

  const normalizedType = rawDataType!
    .toLowerCase()
    .split('(')[0]
    .trim()
    .split(' without')[0]
    .split(' with')[0];
  return PG_TYPE_MAPPING[normalizedType] || DataType.Text;
};

export const specificType = (
  pg: Knex,
  tableBuilder: Knex.TableBuilder,
  {
    name,
    dataType,
    foreignKey,
    formula,
  }: {
    name: string;
    dataType: DataType;
    foreignKey?: {
      table: string;
      column: { name: string; type: string };
      onUpdate: ReferentialAction;
      onDelete: ReferentialAction;
    } | null;
    formula?: {
      resultType: FormulaResultType;
      expression: string;
      strategy?: FormulaStrategy;
    } | null;
  },
  typeDefinitionOnly?: boolean,
  pgVersion?: number
) => {
  switch (dataType) {
    case DataType.Text:
      return tableBuilder.string(name);
    case DataType.LongText:
      return tableBuilder.text(name);
    case DataType.Integer:
      return tableBuilder.integer(name);
    case DataType.Number:
      return tableBuilder.double(name);
    case DataType.Checkbox:
      return tableBuilder.boolean(name);
    case DataType.Date:
      return tableBuilder.timestamp(name);
    case DataType.Select:
      return tableBuilder.text(name);
    case DataType.MultiSelect:
      return tableBuilder.specificType(name, 'text[]');
    case DataType.Email:
      return tableBuilder.specificType(name, 'email_address');
    case DataType.Url:
      return tableBuilder.specificType(name, 'url_address');
    case DataType.JSON:
      return tableBuilder.jsonb(name);
    case DataType.GeoPoint:
      return tableBuilder.point(name);
    case DataType.Reference:
      if (!foreignKey) {
        throw new Error(`Foreign key metadata is required for column: ${name}`);
      }
      const column = tableBuilder.specificType(name, foreignKey.column.type);
      if (!typeDefinitionOnly) {
        column
          .references(foreignKey.column.name)
          .inTable(foreignKey.table)
          .onUpdate(foreignKey.onUpdate)
          .onDelete(foreignKey.onDelete);
      }
      return column;
    case DataType.Attachment:
      return tableBuilder.specificType(name, 'attachment[]');
    case DataType.AutoNumber:
      return tableBuilder.bigIncrements(name, { primaryKey: false });
    case DataType.AutoDate:
      return tableBuilder.timestamp(name).defaultTo(pg.fn.now());
    case DataType.Formula:
      if (!formula) {
        throw new Error(`Formula metadata is required for column: ${name}`);
      }
      const strategy = formula.strategy || FormulaStrategy.Stored;
      if (strategy === FormulaStrategy.Virtual) {
        if (pgVersion! < 18) {
          throw new Error(
            `Virtual generated columns require PostgreSQL 18 or higher (current: ${pgVersion})`
          );
        }
      }
      return tableBuilder.specificType(
        name,
        `${
          formula.resultType
        } GENERATED ALWAYS AS (${formula.expression}) ${strategy.toUpperCase()}`
      );
    default:
      throw new Error(`Unsupported column type: ${dataType}`);
  }
};

/**
 * Updates the expression of a formula (generated) column.
 * Uses PostgreSQL 17's SET EXPRESSION syntax.
 * @throws Error if PostgreSQL version is below 17
 */
export const updateFormulaExpression = async (
  pg: Knex,
  schemaName: string,
  tableName: string,
  columnName: string,
  expression: string
) => {
  const pgVersion = await getPostgresVersion();
  if (pgVersion < 17) {
    throw new Error(
      `Updating formula expressions requires PostgreSQL 17 or higher (current: ${pgVersion}). ` +
        'Please delete and recreate the column, or upgrade your PostgreSQL version.'
    );
  }

  await pg.raw(
    `ALTER TABLE "${schemaName}"."${tableName}" 
     ALTER COLUMN "${columnName}" SET EXPRESSION AS (${expression})`
  );
};

export const LENGTH_CHECK_SUFFIX = '_length_check';
export const VALUE_RANGE_CHECK_SUFFIX = '_value_range_check';
export const DATE_RANGE_CHECK_SUFFIX = '_date_range_check';
export const SIZE_CHECK_SUFFIX = '_size_check';
export const EMAIL_DOMAIN_CHECK_SUFFIX = '_email_domain_check';
export const FILE_COUNT_CHECK_SUFFIX = '_file_count_check';
export const OPTIONS_CHECK_SUFFIX = '_options_check';

export const getConstraintName = (
  tableName: string,
  columnName: string,
  type:
    | 'length'
    | 'value-range'
    | 'date-range'
    | 'size'
    | 'file-count'
    | 'email-domain'
    | 'options'
): string => {
  const prefix = `${tableName}_${columnName}`;
  switch (type) {
    case 'length':
      return prefix + LENGTH_CHECK_SUFFIX;
    case 'value-range':
      return prefix + VALUE_RANGE_CHECK_SUFFIX;
    case 'date-range':
      return prefix + DATE_RANGE_CHECK_SUFFIX;
    case 'size':
      return prefix + SIZE_CHECK_SUFFIX;
    case 'file-count':
      return prefix + FILE_COUNT_CHECK_SUFFIX;
    case 'email-domain':
      return prefix + EMAIL_DOMAIN_CHECK_SUFFIX;
    case 'options':
      return prefix + OPTIONS_CHECK_SUFFIX;
  }
};

export const addLengthCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minLength: number | null,
  maxLength: number | null
) => {
  if (
    (minLength === null || minLength === undefined) &&
    (maxLength === null || maxLength === undefined)
  ) {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(tableName, columnName, 'length');
  const checks: string[] = [];

  if (typeof minLength === 'number' && minLength > 0) {
    checks.push(`char_length(${quotedColumn}) >= ${minLength}`);
  }
  if (typeof maxLength === 'number' && maxLength > 0) {
    checks.push(`char_length(${quotedColumn}) <= ${maxLength}`);
  }

  if (checks.length > 0) {
    tableBuilder.check(checks.join(' AND '), [], `"${constraintName}"`);
  }
};

export const removeLengthCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(tableName, columnName, 'length');
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addRangeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minValue: number | null,
  maxValue: number | null
) => {
  if (
    (minValue === undefined || minValue === null) &&
    (maxValue === undefined || maxValue === null)
  ) {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(
    tableName,
    columnName,
    'value-range'
  );
  const checks: string[] = [];

  if (typeof minValue === 'number') {
    checks.push(`${quotedColumn} >= ${minValue}`);
  }
  if (typeof maxValue === 'number') {
    checks.push(`${quotedColumn} <= ${maxValue}`);
  }

  if (checks.length > 0) {
    tableBuilder.check(checks.join(' AND '), [], `"${constraintName}"`);
  }
};

export const removeRangeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(
    tableName,
    columnName,
    'value-range'
  );
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addDateRangeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minDate: string | null,
  maxDate: string | null
) => {
  if (
    (minDate === undefined || minDate === null) &&
    (maxDate === undefined || maxDate === null)
  ) {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(tableName, columnName, 'date-range');
  const checks: string[] = [];

  if (typeof minDate === 'string') {
    checks.push(
      `${quotedColumn} >= TO_TIMESTAMP('${minDate}', 'YYYY-MM-DD HH24:MI')`
    );
  }

  if (typeof maxDate === 'string') {
    checks.push(
      `${quotedColumn} <= TO_TIMESTAMP('${maxDate}', 'YYYY-MM-DD HH24:MI')`
    );
  }

  if (checks.length > 0) {
    tableBuilder.check(checks.join(' AND '), [], `"${constraintName}"`);
  }
};

export const removeDateRangeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(tableName, columnName, 'date-range');
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addSizeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  maxSize: number | null
) => {
  if (maxSize === undefined || maxSize === null || maxSize <= 0) {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(tableName, columnName, 'size');
  const checks: string[] = [];

  if (typeof maxSize === 'number') {
    checks.push(`pg_column_size(${quotedColumn}) <= ${maxSize}`);
  }

  if (checks.length > 0) {
    tableBuilder.check(checks.join(''), [], `"${constraintName}"`);
  }
};

export const removeSizeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(tableName, columnName, 'size');
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addFileCountCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  maxFiles: number | null
) => {
  if (maxFiles === undefined || maxFiles === null || maxFiles <= 0) {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = `${tableName}_${columnName}${FILE_COUNT_CHECK_SUFFIX}`;

  tableBuilder.check(
    `cardinality(${quotedColumn}) <= ${maxFiles}`,
    [],
    `"${constraintName}"`
  );
};

export const removeFileCountCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = `${tableName}_${columnName}${FILE_COUNT_CHECK_SUFFIX}`;
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addEmailDomainCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  allowedDomains: string
) => {
  if (!allowedDomains || allowedDomains.trim() === '') {
    return;
  }

  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(
    tableName,
    columnName,
    'email-domain'
  );
  const escapedDomains = allowedDomains
    .split(',')
    .map((dom) => `'${dom.trim().replace(/'/g, "''")}'`)
    .join(', ');
  const sql = `split_part(${quotedColumn}, '@', 2) IN (${escapedDomains})`;
  tableBuilder.check(sql, [], `"${constraintName}"`);
};

export const removeEmailDomainCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(
    tableName,
    columnName,
    'email-domain'
  );
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addOptionsCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  options: string[],
  isMulti: boolean
) => {
  if (!options || options.length === 0) {
    return;
  }

  const constraintName = getConstraintName(tableName, columnName, 'options');
  const quotedColumn = `"${columnName}"`;
  const escapedOptions = options
    .map((opt) => `'${opt.replace(/'/g, "''")}'`)
    .join(', ');

  let sql = '';
  if (isMulti) {
    sql = `${quotedColumn} <@ ARRAY[${escapedOptions}]::text[]`;
  } else {
    sql = `${quotedColumn} IN (${escapedOptions})`;
  }

  tableBuilder.check(sql, [], `"${constraintName}"`);
};

export const removeOptionsCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const constraintName = getConstraintName(tableName, columnName, 'options');
  tableBuilder.dropChecks(`"${constraintName}"`);
};
