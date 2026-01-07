import _ from 'lodash';
import dayjs from 'dayjs';

import { environment } from '@environments/environment';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { DateData, DateFieldConfig } from './field.interface';

export class DateField extends Field<DateData> {
  static readonly dataType: DataType = DataType.Date;

  readonly dataType: DataType = DataType.Date;
  readonly icon: string = FIELD_ICON_MAP[DataType.Date];

  minDate?: Date;
  maxDate?: Date;

  constructor(config: DateFieldConfig) {
    super(config);

    if (config.minDate) this.minDate = new Date(config.minDate);
    if (config.maxDate) this.maxDate = new Date(config.maxDate);
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      const date = dayjs(data);

      if (!_.isNil(this.minDate)) {
        const minDate = dayjs(this.minDate);
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

      if (!_.isNil(this.maxDate)) {
        const maxDate = dayjs(this.maxDate);
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
