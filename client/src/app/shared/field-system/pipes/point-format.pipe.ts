import { Pipe, PipeTransform } from '@angular/core';

import { GeoPointData } from '../../field-system/models/geo-point/field.interface';
import { formatPoint } from '../../field-system/models/geo-point/field.object';

@Pipe({ name: 'pointFormat' })
export class PointFormatPipe implements PipeTransform {
  transform(value: GeoPointData) {
    return formatPoint(value);
  }
}
