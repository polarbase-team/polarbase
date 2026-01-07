import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { SelectData, SelectFieldConfig, SelectOption } from './field.interface';

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
