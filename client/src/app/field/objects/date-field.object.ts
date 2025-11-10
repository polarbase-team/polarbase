import dayjs from 'dayjs';
import _ from 'lodash';

import { TDateData, IDateField } from '../interfaces/date-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DateField extends Field<TDateData> implements IDateField {
  static readonly dataType = EDataType.Date;

  get dataType() {
    return DateField.dataType;
  }

  override compareData(source: TDateData, destination: TDateData = this.data!) {
    if (_.isEmpty(source) && _.isEmpty(destination)) {
      return super.compareData(source, destination);
    }

    return dayjs(source).isSame(destination);
  }

  override toString(data: TDateData = this.data!) {
    return dayjs(data).format();
  }
}
