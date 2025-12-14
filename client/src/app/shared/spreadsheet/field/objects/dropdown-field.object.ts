import {
  DropdownData,
  DropdownFieldConfig,
  DropdownOption,
} from '../interfaces/dropdown-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DropdownField extends Field<DropdownData> {
  static readonly dataType = DataType.Dropdown;

  readonly icon = 'icon icon-square-check';

  options: DropdownOption[] | undefined;

  get dataType() {
    return DropdownField.dataType;
  }

  constructor(config: DropdownFieldConfig) {
    super(config);

    this.options = config.options;
  }

  override toJson() {
    return {
      ...super.toJson(),
      options: this.options,
    };
  }
}
