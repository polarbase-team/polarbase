import {
  TDropdownData,
  TDropdownOption,
  IDropdownField,
} from '../interfaces/dropdown-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DropdownField extends Field<TDropdownData> implements IDropdownField {
  static readonly dataType = EDataType.Dropdown;

  options: TDropdownOption[] | undefined;

  get dataType() {
    return DropdownField.dataType;
  }

  constructor(
    name: string,
    data?: TDropdownData,
    options?: TDropdownOption[],
    description?: string,
    required?: boolean,
    initialData?: TDropdownData,
    params?: any
  ) {
    super(name, data, description, required, initialData, params);

    this.options = options;
  }

  override toJson() {
    return {
      ...super.toJson(),
      options: this.options,
    };
  }
}
