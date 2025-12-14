import { CheckboxData } from '../interfaces/checkbox-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export function parseCheckboxToString(data: CheckboxData) {
  return data ? 'true' : 'false';
}

export class CheckboxField extends Field<CheckboxData> {
  static readonly dataType = DataType.Checkbox;

  readonly icon = 'icon icon-circle-check-big';

  get dataType() {
    return CheckboxField.dataType;
  }
}
