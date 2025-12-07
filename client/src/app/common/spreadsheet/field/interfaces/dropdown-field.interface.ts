import { FieldConfig } from './field.interface';

export type DropdownData = string;
export type DropdownOption = string;
export interface DropdownFieldConfig extends FieldConfig<DropdownData> {
  options?: DropdownOption[];
}
