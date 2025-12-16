import _ from 'lodash';
import dayjs from 'dayjs';

import { DateData } from '../interfaces/date-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DateField extends Field<DateData> {
  static readonly dataType: DataType = DataType.Date;

  readonly dataType: DataType = DataType.Date;
  readonly icon: string = 'icon icon-calendar';

  override compareData(source: DateData, destination = this.data!) {
    if (_.isNil(source) && _.isNil(destination)) {
      return super.compareData(source, destination);
    }

    return dayjs(source).isSame(destination);
  }

  override toString(data: DateData = this.data!) {
    return dayjs(data).format();
  }
}
