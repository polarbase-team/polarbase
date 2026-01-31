import { FieldConfig } from '../field.interface';

export const NumberFormat = {
  Comma: 'comma',
  Percentage: 'percentage',
  Currency: 'currency',
} as const;
export type NumberFormat = (typeof NumberFormat)[keyof typeof NumberFormat];

export type NumberData = number;
export interface NumberFieldConfig extends FieldConfig<NumberData> {
  minValue?: number;
  maxValue?: number;
}
