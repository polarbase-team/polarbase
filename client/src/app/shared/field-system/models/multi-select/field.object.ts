import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { MultiSelectData, MultiSelectFieldConfig, MultiSelectOption } from './field.interface';

export class MultiSelectField extends Field<MultiSelectData> {
  static readonly dataType: DataType = DataType.MultiSelect;

  readonly dataType: DataType = DataType.MultiSelect;
  readonly icon: string = FIELD_ICON_MAP[DataType.MultiSelect];

  options?: MultiSelectOption[] | undefined;

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
    if (data?.length > 0) {
      if (typeof data === 'string') {
        const str = (data as string).replace(/\{|\}/g, '').trim();
        if (str.length > 0) return str.split(',').join(', ');
      } else {
        return data.join(', ');
      }
    }

    return '';
  }
}
