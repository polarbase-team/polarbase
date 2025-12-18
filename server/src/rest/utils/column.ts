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

export const LENGTH_CHECK_SUFFIX = '_length_check';
export const VALUE_CHECK_SUFFIX = '_value_check';
export const SIZE_CHECK_SUFFIX = '_size_check';
