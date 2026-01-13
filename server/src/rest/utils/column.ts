import { Knex } from 'knex';

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
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export const ReferentialAction = {
  NoAction: 'NO ACTION',
  SetNull: 'SET NULL',
  Cascade: 'CASCADE',
} as const;
export type ReferentialAction =
  (typeof ReferentialAction)[keyof typeof ReferentialAction];

export interface Column {
  name: string;
  dataType: DataType;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string;
  comment: string;
  options: string[];
  foreignKey: {
    table: string;
    column: { name: string; type: string };
    onUpdate: ReferentialAction;
    onDelete: ReferentialAction;
  };
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
  };
  metadata: any;
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
  const { pgDataType, pgRawType, pgDomainName } = column.metadata || {};

  // 1. Check for custom domains first
  if (pgDomainName === 'email_address') {
    return DataType.Email;
  } else if (pgDomainName === 'url_address') {
    return DataType.Url;
  }

  // 2. Handle Enums/Selects
  if (column.options) {
    if (pgDataType === 'ARRAY') {
      return DataType.MultiSelect;
    }
    return DataType.Select;
  }

  // 3. Handle foreign keys
  if (column.foreignKey) {
    return DataType.Reference;
  }

  // 4. Handle Attachment
  if (pgRawType === '_attachment') {
    return DataType.Attachment;
  }

  const normalizedType = pgDataType
    .toLowerCase()
    .split('(')[0]
    .trim()
    .split(' without')[0]
    .split(' with')[0];
  return PG_TYPE_MAPPING[normalizedType] || DataType.Text;
};

export const specificType = (
  tableBuilder: Knex.TableBuilder,
  {
    name,
    dataType,
    foreignKey,
  }: {
    name: string;
    dataType: DataType;
    foreignKey?: {
      table: string;
      column: { name: string; type: string };
      onUpdate: ReferentialAction;
      onDelete: ReferentialAction;
    } | null;
  }
) => {
  switch (dataType) {
    case DataType.Text:
      return tableBuilder.string(name);
    case DataType.LongText:
      return tableBuilder.text(name);
    case DataType.Integer:
      return tableBuilder.integer(name);
    case DataType.Number:
      return tableBuilder.decimal(name);
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
      return tableBuilder
        .specificType(name, foreignKey.column.type)
        .references(foreignKey.column.name)
        .inTable(foreignKey.table)
        .onUpdate(foreignKey.onUpdate)
        .onDelete(foreignKey.onDelete);
    case DataType.Attachment:
      return tableBuilder.specificType(name, 'attachment[]');
    default:
      throw new Error(`Unsupported column type: ${dataType}`);
  }
};

export const LENGTH_CHECK_SUFFIX = '_length_check';
export const RANGE_CHECK_SUFFIX = '_range_check';
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
    | 'range'
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
    case 'range':
      return prefix + RANGE_CHECK_SUFFIX;
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
  const quotedColumn = `"${columnName}"`;
  const constraintName = getConstraintName(tableName, columnName, 'range');
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
  const constraintName = getConstraintName(tableName, columnName, 'range');
  tableBuilder.dropChecks(`"${constraintName}"`);
};

export const addDateRangeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minDate: string | null,
  maxDate: string | null
) => {
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
  if (typeof maxFiles === 'number' && maxFiles > 0) {
    const quotedColumn = `"${columnName}"`;
    const constraintName = `${tableName}_${columnName}${FILE_COUNT_CHECK_SUFFIX}`;

    tableBuilder.check(
      `cardinality(${quotedColumn}) <= ${maxFiles}`,
      [],
      `"${constraintName}"`
    );
  }
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
