export const DataType = {
  Text: 'text',
  LongText: 'long-text',
  Integer: 'integer',
  Number: 'number',
  Date: 'date',
  Checkbox: 'checkbox',
  Dropdown: 'dropdown',
  JSON: 'json',
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export interface FieldConfig<T = any> {
  name: string;
  data?: T;
  description?: string;
  required?: boolean;
  initialData?: T;
  params?: any;
}
