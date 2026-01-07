import { FieldConfig } from '../field.interface';

export type IntegerData = number;
export interface IntegerFieldConfig extends FieldConfig<IntegerData> {
  min?: number;
  max?: number;
}
