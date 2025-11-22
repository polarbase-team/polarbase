import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';

import { Field } from '../field/objects';
import { CalculateType, checkValidDate } from '../utils/calculate';

@Pipe({
  name: 'calculatingResult',
  standalone: true,
})
export class CalculatingResultPipe implements PipeTransform {
  transform(data: any, type: CalculateType, field: Field) {
    if (data === Infinity) return '∞';

    if (_.isString(data) && data === '#N/A') return data;

    switch (type) {
      case CalculateType.PercentEmpty:
      case CalculateType.PercentEmptyCheckBox:
      case CalculateType.PercentFilled:
      case CalculateType.PercentFilledCheckBox:
      case CalculateType.PercentUnique:
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
