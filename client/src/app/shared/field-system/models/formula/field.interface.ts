import { FieldConfig } from '../field.interface';

export type FormulaData = any;

export interface FormulaFieldConfig extends FieldConfig<FormulaData> {
  expression?: string;
}
