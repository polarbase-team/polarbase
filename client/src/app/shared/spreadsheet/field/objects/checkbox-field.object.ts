import { CheckboxData } from '../interfaces/checkbox-field.interface';
import { DataType, FIELD_ICON_MAP } from '../interfaces/field.interface';
import { Field } from './field.object';

export function parseCheckboxToString(data: CheckboxData) {
  return data ? 'true' : 'false';
}

export class CheckboxField extends Field<CheckboxData> {
  static readonly dataType: DataType = DataType.Checkbox;

  readonly dataType: DataType = DataType.Checkbox;
  readonly icon: string = FIELD_ICON_MAP[DataType.Checkbox];
}
