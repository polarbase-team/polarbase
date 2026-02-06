import { FieldConfig } from '../field.interface';

export const FormulaResultType = {
  Text: 'text',
  Integer: 'integer',
  Number: 'numeric',
  Date: 'date',
  Boolean: 'boolean',
  Jsonb: 'jsonb',
} as const;
export type FormulaResultType = (typeof FormulaResultType)[keyof typeof FormulaResultType];

export const FormulaStrategy = {
  Stored: 'stored',
  Virtual: 'virtual',
} as const;
export type FormulaStrategy = (typeof FormulaStrategy)[keyof typeof FormulaStrategy];

export type FormulaData = any;

export interface FormulaFieldConfig extends FieldConfig<FormulaData> {
  resultType?: FormulaResultType;
  expression?: string;
  strategy?: FormulaStrategy;
}
