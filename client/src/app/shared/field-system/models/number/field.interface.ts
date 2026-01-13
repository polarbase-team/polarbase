import { FieldConfig } from '../field.interface';

export type NumberData = number;
export interface NumberFieldConfig extends FieldConfig<NumberData> {
  minValue?: number;
  maxValue?: number;
}
