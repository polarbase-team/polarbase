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
import { AutoDateField } from './auto-date/field.object';
import { FormulaField } from './formula/field.object';
import { FormulaResultType } from './formula/field.interface';

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
  [DataType.AutoDate, AutoDateField],
  [DataType.Formula, FormulaField],
]);

export function buildField<T = Field>(dataType: DataType, config: FieldConfig<T>) {
  const fieldType = FIELD_MAP.get(dataType);
  return new fieldType(config) as Field;
}

export function getEffectiveDataType(field: Field): DataType {
  if (field.dataType === DataType.Formula) {
    const resultType = (field as FormulaField).resultType;
    switch (resultType) {
      case FormulaResultType.Number:
        return DataType.Number;
      case FormulaResultType.Integer:
        return DataType.Integer;
      case FormulaResultType.Date:
        return DataType.Date;
      case FormulaResultType.Boolean:
        return DataType.Checkbox;
      case FormulaResultType.Text:
        return DataType.Text;
      default:
        return DataType.Text;
    }
  }

  if (field.dataType === DataType.AutoDate) {
    return DataType.Date;
  }

  if (field.dataType === DataType.AutoNumber) {
    return DataType.Integer;
  }

  return field.dataType;
}
