import { FieldConfig } from '../field.interface';

export type IntegerData = number;
export interface IntegerFieldConfig extends FieldConfig<IntegerData> {
  minValue?: number;
  maxValue?: number;
}
