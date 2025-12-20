import { Knex } from 'knex';

export const DataType = {
  Text: 'text',
  LongText: 'long-text',
  Integer: 'integer',
  Number: 'number',
  Date: 'date',
  Checkbox: 'checkbox',
  Select: 'select',
  JSON: 'json',
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export interface Column {
  name: string;
  dataType: DataType;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string;
  comment: string;
  options: string[];
  foreignKey: any;
  validation: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    minDate?: string;
    maxDate?: string;
    maxSize?: number;
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

  // JSON
  json: DataType.JSON,
  jsonb: DataType.JSON,
};

export const mapDataType = (column: Column, pgDataType: string) => {
  let dataType: DataType = DataType.Text;
  if (column.options) {
    dataType = DataType.Select;
  } else {
    const normalizedType = pgDataType
      .toLowerCase()
      .split('(')[0]
      .trim()
      .split(' without')[0]
      .split(' with')[0];
    dataType = PG_TYPE_MAPPING[normalizedType] || dataType;
  }
  return dataType;
};

export const specificType = (
  tableBuilder: Knex.TableBuilder,
  {
    name,
    dataType,
    options,
  }: {
    name: string;
    dataType: DataType;
    options?: string[] | null;
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
      if (!options?.length) {
        throw new Error(`options is required for Select column "${name}"`);
      }
      return tableBuilder.enum(name, options, {
        useNative: true,
        enumName: `${name}_enum_${+new Date()}`,
        existingType: false,
      });

    case DataType.JSON:
      return tableBuilder.jsonb(name);

    default:
      throw new Error(`Unsupported column type: ${dataType}`);
  }
};

export const LENGTH_CHECK_SUFFIX = '_length_check';
export const RANGE_CHECK_SUFFIX = '_range_check';
export const DATE_RANGE_CHECK_SUFFIX = '_date_range_check';
export const SIZE_CHECK_SUFFIX = '_size_check';

export const getConstraintName = (
  tableName: string,
  columnName: string,
  type: 'length' | 'range' | 'date-range' | 'size'
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
