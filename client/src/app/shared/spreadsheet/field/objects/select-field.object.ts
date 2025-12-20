import { SelectData, SelectFieldConfig, SelectOption } from '../interfaces/select-field.interface';
import { DataType, FIELD_ICON_MAP } from '../interfaces/field.interface';
import { Field } from './field.object';

export class SelectField extends Field<SelectData> {
  static readonly dataType: DataType = DataType.Select;

  readonly dataType: DataType = DataType.Select;
  readonly icon: string = FIELD_ICON_MAP[DataType.Select];

  options?: SelectOption[] | undefined;

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
