import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { MultiSelectData, MultiSelectFieldConfig, MultiSelectOption } from './field.interface';

export class MultiSelectField extends Field<MultiSelectData> {
  static readonly dataType: DataType = DataType.MultiSelect;

  readonly dataType: DataType = DataType.MultiSelect;
  readonly icon: string = FIELD_ICON_MAP[DataType.MultiSelect];

  options?: MultiSelectOption[];

  constructor(config: MultiSelectFieldConfig) {
    super(config);

    this.options = config.options;
  }

  override toJson() {
    return {
      ...super.toJson(),
      options: this.options,
    };
  }

  override toString(data?: MultiSelectData) {
    return data?.join(', ') || '';
  }
}
