import { DataType, FieldConfig } from './interfaces/field.interface';
import { Field } from './objects/field.object';
import { TextField } from './objects/text-field.object';
import { LongTextField } from './objects/long-text-field.object';
import { IntegerField } from './objects/integer-field.object';
import { NumberField } from './objects/number-field.object';
import { DateField } from './objects/date-field.object';
import { CheckboxField } from './objects/checkbox-field.object';
import { SelectField } from './objects/select-field.object';
import { MultiSelectField } from './objects/multi-select-field.object';
import { EmailField } from './objects/email-field.object';
import { UrlField } from './objects/url-field.object';
import { JSONField } from './objects/json-field.object';
import { GeoPointField } from './objects/geo-point-field.object';

export const FIELD_MAP = new Map([
  [DataType.Text, TextField as any],
  [DataType.LongText, LongTextField],
  [DataType.Integer, IntegerField],
  [DataType.Number, NumberField],
  [DataType.Date, DateField],
  [DataType.Checkbox, CheckboxField],
  [DataType.Select, SelectField],
  [DataType.MultiSelect, MultiSelectField],
  [DataType.Email, EmailField],
  [DataType.Url, UrlField],
  [DataType.JSON, JSONField],
  [DataType.GeoPoint, GeoPointField],
]);

export function buildField<T = Field>(dataType: DataType, config: FieldConfig<T>) {
  const fieldType = FIELD_MAP.get(dataType);
  return new fieldType(config) as Field;
}
