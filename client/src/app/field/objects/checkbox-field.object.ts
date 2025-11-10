import { TCheckboxData, ICheckboxField } from '../interfaces/checkbox-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export function parseCheckboxToString(data: TCheckboxData): string {
  return data ? 'true' : 'false';
}

export class CheckboxField extends Field<TCheckboxData> implements ICheckboxField {
  public static readonly dataType: EDataType = EDataType.Checkbox;

  get dataType(): EDataType {
    return CheckboxField.dataType;
  }
}
