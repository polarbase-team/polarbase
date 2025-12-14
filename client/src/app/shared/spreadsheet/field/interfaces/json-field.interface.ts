import { FieldConfig } from './field.interface';

export type JSONData = Record<any, any>;
export interface JSONFieldConfig extends FieldConfig<JSONData> {}
