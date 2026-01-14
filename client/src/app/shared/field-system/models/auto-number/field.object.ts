import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { AutoNumberData } from './field.interface';

export class AutoNumberField extends Field<AutoNumberData> {
  static readonly dataType: DataType = DataType.AutoNumber;

  readonly dataType: DataType = DataType.AutoNumber;
  readonly icon: string = FIELD_ICON_MAP[DataType.AutoNumber];
}
