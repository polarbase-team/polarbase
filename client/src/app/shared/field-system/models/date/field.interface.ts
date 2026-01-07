import { FieldConfig } from '../field.interface';

export type DateData = string;
export interface DateFieldConfig extends FieldConfig<DateData> {
  minDate?: string | Date;
  maxDate?: string | Date;
}
