import dayjs from 'dayjs';

import { DateData } from '../interfaces/date-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DateField extends Field<DateData> {
  static readonly dataType = DataType.Date;

  get dataType() {
    return DateField.dataType;
  }

  override compareData(source: DateData, destination: DateData = this.data!) {
    if (
      (source === undefined || source === null) &&
      (destination === undefined || destination === null)
    ) {
      return super.compareData(source, destination);
    }

    return dayjs(source).isSame(destination);
  }

  override toString(data: DateData = this.data!) {
    return dayjs(data).format();
  }
}
