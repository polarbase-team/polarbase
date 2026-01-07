import { FieldConfig } from '../field.interface';

export type MultiSelectData = string[];
export type MultiSelectOption = string;
export interface MultiSelectFieldConfig extends FieldConfig<MultiSelectData> {
  options?: MultiSelectOption[];
}
