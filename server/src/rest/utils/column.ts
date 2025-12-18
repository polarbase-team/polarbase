import { Knex } from 'knex';

export const DataType = {
  Text: 'text',
  LongText: 'long-text',
  Integer: 'integer',
  Number: 'number',
  Date: 'date',
  Checkbox: 'checkbox',
  Select: 'dropdown',
  JSON: 'json',
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export interface Column {
  name: string;
  dataType: DataType;
  pgDataType: string;
  pgRawType: string;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string;
  hasSpecialDefault: boolean;
  comment: string;
  options: string[];
  foreignKey: any;
  minLength: number;
  maxLength: number;
  minValue: string | number;
  maxValue: string | number;
  maxSize: number;
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

export const mapDataType = (column: Column) => {
  let dataType: DataType = DataType.Text;
  if (column.options) {
    dataType = DataType.Select;
  } else {
    const normalizedType = column.pgDataType
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
  switch (dataType.toLowerCase()) {
    case DataType.Text:
      return tableBuilder.string(name);

    case DataType.LongText:
      return tableBuilder.text(name);

    case DataType.Integer:
      return tableBuilder.integer(name);

    case DataType.Checkbox:
      return tableBuilder.boolean(name);

    case DataType.Date:
      return tableBuilder.timestamp(name);

    case DataType.Select:
      if (!options?.length) {
        throw new Error(`options is required for Select column "${name}"`);
      }
      return tableBuilder.enum(name, options);

    case DataType.JSON:
      return tableBuilder.json(name);

    default:
      throw new Error(`Unsupported column type: ${dataType}`);
  }
};

export const LENGTH_CHECK_SUFFIX = '_length_check';
export const VALUE_CHECK_SUFFIX = '_value_check';
export const SIZE_CHECK_SUFFIX = '_size_check';

function getConstraintPrefix(tableName: string, columnName: string): string {
  return `${tableName}_${columnName}`;
}

export const addLengthCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minLength: number,
  maxLength: number
) => {
  const quotedColumn = `"${columnName}"`;
  const checks: string[] = [];

  if (typeof minLength === 'number' && minLength > 0) {
    checks.push(`char_length(${quotedColumn}) >= ${minLength}`);
  }
  if (typeof maxLength === 'number' && maxLength > 0) {
    checks.push(`char_length(${quotedColumn}) <= ${maxLength}`);
  }

  if (checks.length > 0) {
    const prefix = getConstraintPrefix(tableName, columnName);
    tableBuilder.check(
      checks.join(' AND '),
      [],
      `"${prefix}${LENGTH_CHECK_SUFFIX}"`
    );
  }
};

export function removeLengthCheck(
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) {
  const prefix = getConstraintPrefix(tableName, columnName);
  tableBuilder.dropChecks(`"${prefix}${LENGTH_CHECK_SUFFIX}"`);
}

export function addValueCheck(
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  minValue: number | string,
  maxValue: number | string
) {
  const quotedColumn = `"${columnName}"`;
  const checks: string[] = [];

  if (typeof minValue === 'number') {
    checks.push(`${quotedColumn} >= ${minValue}`);
  }
  if (typeof maxValue === 'number') {
    checks.push(`${quotedColumn} <= ${maxValue}`);
  }

  if (checks.length > 0) {
    const prefix = getConstraintPrefix(tableName, columnName);
    tableBuilder.check(
      checks.join(' AND '),
      [],
      `"${prefix}${VALUE_CHECK_SUFFIX}"`
    );
  }
}

export const removeValueCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const prefix = getConstraintPrefix(tableName, columnName);
  tableBuilder.dropChecks(`"${prefix}${VALUE_CHECK_SUFFIX}"`);
};

export const addSizeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string,
  maxSize: number | null
) => {
  const quotedColumn = `"${columnName}"`;
  const checks: string[] = [];

  if (typeof maxSize === 'number') {
    checks.push(`pg_column_size(${quotedColumn}) <= ${maxSize}`);
  }

  if (checks.length > 0) {
    const prefix = getConstraintPrefix(tableName, columnName);
    tableBuilder.check(checks.join(''), [], `"${prefix}${SIZE_CHECK_SUFFIX}"`);
  }
};

export const removeSizeCheck = (
  tableBuilder: Knex.TableBuilder,
  tableName: string,
  columnName: string
) => {
  const prefix = getConstraintPrefix(tableName, columnName);
  tableBuilder.dropChecks(`"${prefix}${SIZE_CHECK_SUFFIX}"`);
};
