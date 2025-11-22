import { Pipe, PipeTransform } from '@angular/core';

import { DataType } from '../field/interfaces';
import { CalculateType } from '../utils/calculate';

@Pipe({
  name: 'calculateTypes',
  standalone: true,
})
export class CalculateTypesPipe implements PipeTransform {
  transform(dataType: DataType) {
    switch (dataType) {
      case DataType.Checkbox:
        return [
          CalculateType.EmptyCheckBox,
          CalculateType.FilledCheckBox,
          CalculateType.PercentEmptyCheckBox,
          CalculateType.PercentFilledCheckBox,
        ];
      case DataType.Date:
        return [
          CalculateType.Empty,
          CalculateType.Filled,
          CalculateType.Unique,
          CalculateType.PercentEmpty,
          CalculateType.PercentFilled,
          CalculateType.PercentUnique,
          CalculateType.DayRange,
          CalculateType.MonthRange,
          CalculateType.Min,
          CalculateType.Max,
        ];
      case DataType.Number:
        return [
          CalculateType.Empty,
          CalculateType.Filled,
          CalculateType.Unique,
          CalculateType.PercentEmpty,
          CalculateType.PercentFilled,
          CalculateType.PercentUnique,
          CalculateType.Sum,
          CalculateType.Average,
          CalculateType.Median,
          CalculateType.Min,
          CalculateType.Max,
          CalculateType.Range,
        ];
      default:
        return [
          CalculateType.Empty,
          CalculateType.Filled,
          CalculateType.Unique,
          CalculateType.PercentEmpty,
          CalculateType.PercentFilled,
          CalculateType.PercentUnique,
        ];
    }
  }
}
