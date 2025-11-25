import { Pipe, PipeTransform } from '@angular/core';

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
    }

    return data;
  }
}
