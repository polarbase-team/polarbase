import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { AutoDateData } from './field.interface';

export class AutoDateField extends Field<AutoDateData> {
  static readonly dataType: DataType = DataType.AutoDate;

  readonly dataType: DataType = DataType.AutoDate;
  readonly icon: string = FIELD_ICON_MAP[DataType.AutoDate];
}
