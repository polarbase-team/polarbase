import dayjs from 'dayjs';
import _ from 'lodash';

import { Field } from '../../objects/field.object';
import { EDataType } from '../../interfaces/field.interface';
import { ECalculateType } from '../helpers/calculate';

export const EMPTY_GROUP_VALUE: any = Infinity;

export function calculateFieldPredicate(field: Field, calculateType: ECalculateType) {
  let data = field.data;

  if (_.isNil(data)) {
    data = null;
  } else {
    switch (field.dataType) {
      case EDataType.Checkbox:
        data ||= null;
        break;
      case EDataType.Date:
        switch (calculateType) {
          case ECalculateType.DayRange:
            data = dayjs(data).startOf('day');
            break;
          case ECalculateType.MonthRange:
            data = dayjs(data).startOf('month');
            break;
          case ECalculateType.Unique:
          case ECalculateType.PercentUnique:
            data = dayjs(data).format();
            break;
        }
        break;
    }
  }

  return data;
}

export function parseGroupFieldData(field: Field) {
  let data: any = field.data;

  if (data) {
    switch (field.dataType) {
      case EDataType.Checkbox:
        data = !!data;
        break;
      case EDataType.Dropdown:
        data = _.sortBy(data.value);
        break;
    }
  }

  return !_.isNaN(data) && !_.isError(data) && !_.isEmpty(data) ? data : EMPTY_GROUP_VALUE;
}
