export const DataType = {
  Text: 1,
  Integer: 2,
  Number: 3,
  Date: 4,
  Checkbox: 5,
  Dropdown: 6,
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
