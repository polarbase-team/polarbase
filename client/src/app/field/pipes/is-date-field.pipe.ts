import { Pipe, PipeTransform } from '@angular/core';

// import { Memoize } from '@core';

import { Field } from '../objects/field.object';
import { EDataType } from '../interfaces/field.interface';

@Pipe({
  name: 'isDateField',
  standalone: true,
})
export class IsDateFieldPipe implements PipeTransform {
  // @Memoize(function (field: Field | EDataType) {
  //   return field instanceof Field ? field.dataType : field;
  // })
  transform(field: Field | EDataType) {
    return field instanceof Field ? field.dataType === EDataType.Date : field === EDataType.Date;
  }
}
