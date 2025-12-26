import _ from 'lodash';
import dayjs from 'dayjs';

import { environment } from '@environments/environment';
import { DateData, DateFieldConfig } from '../interfaces/date-field.interface';
import { DataType, FIELD_ICON_MAP } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class DateField extends Field<DateData> {
  static readonly dataType: DataType = DataType.Date;

  readonly dataType: DataType = DataType.Date;
  readonly icon: string = FIELD_ICON_MAP[DataType.Date];

  min?: string;
  max?: string;

  constructor(config: DateFieldConfig) {
    super(config);

    this.min = config.min;
    this.max = config.max;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      const date = dayjs(data);

      if (!_.isNil(this.min)) {
        const minDate = dayjs(this.min);
        if (date.isBefore(minDate)) {
          errors = {
            ...errors,
            [FieldValidationKey.Min]: {
              field: this,
              data,
              min: minDate,
            },
          };
        }
      }

      if (!_.isNil(this.max)) {
        const maxDate = dayjs(this.max);
        if (date.isAfter(maxDate)) {
          errors = {
            ...errors,
            [FieldValidationKey.Max]: {
              field: this,
              data,
              max: maxDate,
            },
          };
        }
      }
    }

    return errors;
  }

  override compareData(source: DateData, destination = this.data) {
    if (_.isNil(source) && _.isNil(destination)) {
      return super.compareData(source, destination);
    }

    return dayjs(source).isSame(destination);
  }

  override toString(data: DateData = this.data) {
    return data ? dayjs(data).format(environment.dateTimeFormat ?? 'YYYY-MM-DD HH:mm') : '';
  }
}
