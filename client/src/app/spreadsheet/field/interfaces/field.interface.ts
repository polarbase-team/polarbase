export const DataType = {
  Text: 1,
  Checkbox: 2,
  Dropdown: 3,
  Number: 4,
  Date: 5,
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
