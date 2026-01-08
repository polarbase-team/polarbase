import { FieldConfig } from '../field.interface';

export type ReferenceData = string | number;
export interface ReferenceFieldConfig extends FieldConfig<ReferenceData> {
  referenceTo: string;
}
