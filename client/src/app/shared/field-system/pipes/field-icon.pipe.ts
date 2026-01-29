import { Pipe, PipeTransform } from '@angular/core';

import { DataType } from '../models/field.interface';
import { FIELD_ICON_MAP } from '../models/field.interface';

@Pipe({ name: 'fieldIcon' })
export class FieldIconPipe implements PipeTransform {
  transform(dataType: DataType) {
    return FIELD_ICON_MAP[dataType];
  }
}
