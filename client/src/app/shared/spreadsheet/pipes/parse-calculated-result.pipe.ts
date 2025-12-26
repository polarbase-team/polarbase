import dayjs from 'dayjs';
import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '@environments/environment';
import { CalculateType } from '../utils/calculate';

@Pipe({
  name: 'parseCalculatedResult',
  standalone: true,
})
export class ParseCalculatedResultPipe implements PipeTransform {
  transform(data: any, type: CalculateType) {
    if (data === Infinity) return '∞';

    switch (type) {
      case CalculateType.PercentEmpty:
      case CalculateType.PercentFilled:
      case CalculateType.PercentUnique:
        data = (data * 100).toFixed(2) + '%';
        break;
      case CalculateType.EarliestDate:
      case CalculateType.LatestDate:
        data = dayjs(data).format(environment.dateFormat ?? 'YYYY-MM-DD');
        break;
      case CalculateType.DateRange:
        data = data / (1000 * 60 * 60 * 24);
        break;
    }

    return data;
  }
}
