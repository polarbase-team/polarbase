import { FieldConfig } from '../field.interface';

export const EmailPattern = /^[A-Za-z0-9._%\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]+$/;
export type EmailData = string;
export interface EmailFieldConfig extends FieldConfig<EmailData> {}
