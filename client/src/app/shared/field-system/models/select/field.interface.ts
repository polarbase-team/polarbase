import { FieldConfig } from '../field.interface';

export type SelectData = string;
export type SelectOption = string;
export interface SelectFieldConfig extends FieldConfig<SelectData> {
  options?: SelectOption[];
}
