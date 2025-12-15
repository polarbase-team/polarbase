import { SelectData, SelectFieldConfig, SelectOption } from '../interfaces/select-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class SelectField extends Field<SelectData> {
  static readonly dataType = DataType.Select;

  readonly icon = 'icon icon-square-check';

  options: SelectOption[] | undefined;

  get dataType() {
    return SelectField.dataType;
  }

  constructor(config: SelectFieldConfig) {
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
