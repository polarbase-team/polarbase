import { DataType, FieldConfig } from './interfaces/field.interface';
import { Field } from './objects/field.object';
import { TextField } from './objects/text-field.object';
import { NumberField } from './objects/number-field.object';
import { CheckboxField } from './objects/checkbox-field.object';
import { DropdownField } from './objects/dropdown-field.object';
import { DateField } from './objects/date-field.object';

export const FIELD_MAP = new Map([
  [DataType.Text, TextField as any],
  [DataType.Number, NumberField],
  [DataType.Checkbox, CheckboxField],
  [DataType.Dropdown, DropdownField],
  [DataType.Date, DateField],
]);

export function buildField<T = Field>(dataType: DataType, config: FieldConfig<T>) {
  const fieldType = FIELD_MAP.get(dataType);
  return new fieldType(config) as Field;
}
