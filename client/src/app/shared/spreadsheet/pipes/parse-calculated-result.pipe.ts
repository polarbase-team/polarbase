import { Pipe, PipeTransform } from '@angular/core';

import { formatNumber } from '@app/shared/field-system/models/number/field.object';
import { formatDateTime } from '@app/shared/field-system/models/date/field.object';
import { CalculateType } from '../utils/calculate';

@Pipe({ name: 'parseCalculatedResult' })
export class ParseCalculatedResultPipe implements PipeTransform {
  transform(data: any, type: CalculateType, format?: any) {
    if (data === Infinity) return '∞';

    switch (type) {
      case CalculateType.PercentEmpty:
      case CalculateType.PercentFilled:
      case CalculateType.PercentUnique:
        data = (data * 100).toFixed(2) + '%';
        break;
      case CalculateType.EarliestDate:
      case CalculateType.LatestDate:
        data = format ? formatDateTime(data, format.dateFormat, format.showTime) : data;
        break;
      case CalculateType.DateRange:
        data = data / (1000 * 60 * 60 * 24);
        break;
      case CalculateType.Sum:
      case CalculateType.Average:
      case CalculateType.Median:
      case CalculateType.Min:
      case CalculateType.Max:
      case CalculateType.Range:
        data = format ? formatNumber(data, format.numberFormat, format.currency) : data;
        break;
    }

    return data;
  }
}
