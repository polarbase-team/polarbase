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
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export const FIELD_ICON_MAP: Record<DataType, string> = {
  [DataType.Text]: 'icon icon-case-sensitive',
  [DataType.LongText]: 'icon icon-text-initial',
  [DataType.Integer]: 'icon icon-hash',
  [DataType.Number]: 'icon icon-decimals-arrow-right',
  [DataType.Date]: 'icon icon-calendar',
  [DataType.Checkbox]: 'icon icon-square-check',
  [DataType.Select]: 'icon icon-circle-chevron-down',
  [DataType.MultiSelect]: 'icon icon-list-checks',
  [DataType.Email]: 'icon icon-mail',
  [DataType.Url]: 'icon icon-link',
  [DataType.JSON]: 'icon icon-braces',
  [DataType.GeoPoint]: 'icon icon-map-pin',
  [DataType.Reference]: 'icon icon-send-to-back',
} as const;

export interface FieldConfig<T = any> {
  name: string;
  data?: T;
  description?: string;
  required?: boolean;
  initialData?: T;
  params?: any;
}
