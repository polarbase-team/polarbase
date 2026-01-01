import { FieldConfig } from './field.interface';

export const UrlPattern = /^https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(\/.*)?$/i;
export type UrlData = string;
export interface UrlFieldConfig extends FieldConfig<UrlData> {}
