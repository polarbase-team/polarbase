import { Pipe, PipeTransform } from '@angular/core';

// import { Memoize } from '@core';

import { Field } from '../objects/field.object';
import { EDataType } from '../interfaces/field.interface';

@Pipe({
  name: 'isDropdownField',
  standalone: true,
})
export class IsDropdownFieldPipe implements PipeTransform {
  // @Memoize(function (field: Field | EDataType): EDataType {
  //   return field instanceof Field ? field.dataType : field;
  // })
  public transform(field: Field | EDataType): boolean {
    return field instanceof Field
      ? field.dataType === EDataType.Dropdown
      : field === EDataType.Dropdown;
  }
}
