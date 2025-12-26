import { FieldConfig } from './field.interface';

export type TextData = string;
export interface TextFieldConfig extends FieldConfig<TextData> {
  minLength?: number;
  maxLength?: number;
}
