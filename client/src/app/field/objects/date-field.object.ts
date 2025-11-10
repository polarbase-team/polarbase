import dayjs from 'dayjs';
import _ from 'lodash';

import { TDateData, IDateField } from '../interfaces/date-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class DateField extends Field<TDateData> implements IDateField {
  public static readonly dataType: EDataType = EDataType.Date;

  get dataType(): EDataType {
    return DateField.dataType;
  }

  public override compareData(source: TDateData, destination: TDateData = this.data!): boolean {
    if (_.isEmpty(source) && _.isEmpty(destination)) {
      return super.compareData(source, destination);
    }

    return dayjs(source).isSame(destination);
  }

  public override toString(data: TDateData = this.data!): string {
    return dayjs(data).format();
  }
}
