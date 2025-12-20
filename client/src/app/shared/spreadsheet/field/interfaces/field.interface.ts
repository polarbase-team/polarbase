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

export const FIELD_ICON_MAP: Record<DataType, string> = {
  [DataType.Text]: 'icon icon-case-sensitive',
  [DataType.LongText]: 'icon icon-text-initial',
  [DataType.Integer]: 'icon icon-hash',
  [DataType.Number]: 'icon icon-decimals-arrow-right',
  [DataType.Date]: 'icon icon-calendar',
  [DataType.Checkbox]: 'icon icon-circle-check-big',
  [DataType.Select]: 'icon icon-square-check',
  [DataType.JSON]: 'icon icon-braces',
} as const;

export interface FieldConfig<T = any> {
  name: string;
  data?: T;
  description?: string;
  required?: boolean;
  initialData?: T;
  params?: any;
}
