import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';

import { Field } from '../../objects';
import { ECalculateType, checkValidDate } from '../helpers';

@Pipe({
  name: 'calculatingResult',
  standalone: true,
})
export class CalculatingResultPipe implements PipeTransform {
  transform(data: any, type: ECalculateType, field: Field) {
    if (data === Infinity) return '∞';

    if (_.isString(data) && data === '#N/A') return data;

    switch (type) {
      case ECalculateType.PercentEmpty:
      case ECalculateType.PercentEmptyCheckBox:
      case ECalculateType.PercentFilled:
      case ECalculateType.PercentFilledCheckBox:
      case ECalculateType.PercentUnique:
        data = _.round(data, 2) + '%';
        break;
      default:
        if (!_.isString(data) || checkValidDate(data)) {
          data = field.toString(data);
        }
    }

    return data;
  }
}
