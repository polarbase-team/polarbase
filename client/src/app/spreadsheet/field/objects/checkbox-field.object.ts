import { TCheckboxData, ICheckboxField } from '../interfaces/checkbox-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export function parseCheckboxToString(data: TCheckboxData) {
  return data ? 'true' : 'false';
}

export class CheckboxField extends Field<TCheckboxData> implements ICheckboxField {
  static readonly dataType = EDataType.Checkbox;

  get dataType() {
    return CheckboxField.dataType;
  }
}
