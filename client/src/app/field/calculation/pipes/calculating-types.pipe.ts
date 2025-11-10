import { Pipe, PipeTransform } from '@angular/core';

// import { Memoize } from '@core';

import { EDataType } from '../../interfaces';
import { ECalculateType } from '../helpers';

@Pipe({
  name: 'calculateTypes',
  standalone: true,
})
export class CalculateTypesPipe implements PipeTransform {
  // @Memoize(function (field: Field | EDataType) {
  //   return typeof field === 'number' ? field : field.dataType;
  // })
  public transform(dataType: EDataType): ECalculateType[] {
    switch (dataType) {
      case EDataType.Checkbox:
        return [
          ECalculateType.EmptyCheckBox,
          ECalculateType.FilledCheckBox,
          ECalculateType.PercentEmptyCheckBox,
          ECalculateType.PercentFilledCheckBox,
        ];
      case EDataType.Date:
        return [
          ECalculateType.Empty,
          ECalculateType.Filled,
          ECalculateType.Unique,
          ECalculateType.PercentEmpty,
          ECalculateType.PercentFilled,
          ECalculateType.PercentUnique,
          ECalculateType.DayRange,
          ECalculateType.MonthRange,
          ECalculateType.Min,
          ECalculateType.Max,
        ];
      case EDataType.Number:
        return [
          ECalculateType.Empty,
          ECalculateType.Filled,
          ECalculateType.Unique,
          ECalculateType.PercentEmpty,
          ECalculateType.PercentFilled,
          ECalculateType.PercentUnique,
          ECalculateType.Sum,
          ECalculateType.Average,
          ECalculateType.Median,
          ECalculateType.Min,
          ECalculateType.Max,
          ECalculateType.Range,
        ];
      default:
        return [
          ECalculateType.Empty,
          ECalculateType.Filled,
          ECalculateType.Unique,
          ECalculateType.PercentEmpty,
          ECalculateType.PercentFilled,
          ECalculateType.PercentUnique,
        ];
    }
  }
}
