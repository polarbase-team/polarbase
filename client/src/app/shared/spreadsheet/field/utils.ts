import { DataType, FieldConfig } from './interfaces/field.interface';
import { Field } from './objects/field.object';
import { TextField } from './objects/text-field.object';
import { LongTextField } from './objects/long-text-field.object';
import { IntegerField } from './objects/integer-field.object';
import { NumberField } from './objects/number-field.object';
import { DateField } from './objects/date-field.object';
import { CheckboxField } from './objects/checkbox-field.object';
import { SelectField } from './objects/select-field.object';
import { JSONField } from './objects/json-field.object';

export const FIELD_MAP = new Map([
  [DataType.Text, TextField as any],
  [DataType.LongText, LongTextField],
  [DataType.Integer, IntegerField],
  [DataType.Number, NumberField],
  [DataType.Date, DateField],
  [DataType.Checkbox, CheckboxField],
  [DataType.Select, SelectField],
  [DataType.JSON, JSONField],
]);

export function buildField<T = Field>(dataType: DataType, config: FieldConfig<T>) {
  const fieldType = FIELD_MAP.get(dataType);
  return new fieldType(config) as Field;
}
