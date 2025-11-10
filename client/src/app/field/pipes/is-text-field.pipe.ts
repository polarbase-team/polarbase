import { Pipe, PipeTransform } from '@angular/core';

// import { Memoize } from '@core';

import { Field } from '../objects/field.object';
import { EDataType } from '../interfaces/field.interface';

@Pipe({
  name: 'isTextField',
  standalone: true,
})
export class IsTextFieldPipe implements PipeTransform {
  // @Memoize(function (field: Field | EDataType) {
  //   return field instanceof Field ? field.dataType : field;
  // })
  transform(field: Field | EDataType) {
    return field instanceof Field ? field.dataType === EDataType.Text : field === EDataType.Text;
  }
}
