import { DataType, FieldConfig } from './field.interface';
import { Field } from './field.object';
import { TextField } from './text/field.object';
import { LongTextField } from './long-text/field.object';
import { IntegerField } from './integer/field.object';
import { NumberField } from './number/field.object';
import { DateField } from './date/field.object';
import { CheckboxField } from './checkbox/field.object';
import { SelectField } from './select/field.object';
import { MultiSelectField } from './multi-select/field.object';
import { EmailField } from './email/field.object';
import { UrlField } from './url/field.object';
import { JSONField } from './json/field.object';
import { GeoPointField } from './geo-point/field.object';
import { ReferenceField } from './reference/field.object';
import { AttachmentField } from './attachment/field.object';
import { AutoNumberField } from './auto-number/field.object';

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
  [DataType.Reference, ReferenceField],
  [DataType.Attachment, AttachmentField],
  [DataType.AutoNumber, AutoNumberField],
]);

export function buildField<T = Field>(dataType: DataType, config: FieldConfig<T>) {
  const fieldType = FIELD_MAP.get(dataType);
  return new fieldType(config) as Field;
}
