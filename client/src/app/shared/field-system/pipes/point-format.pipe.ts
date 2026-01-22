import { Pipe, PipeTransform } from '@angular/core';

import { GeoPointData } from '../models/geo-point/field.interface';
import { formatPoint } from '../models/geo-point/field.object';

@Pipe({ name: 'pointFormat' })
export class PointFormatPipe implements PipeTransform {
  transform(value: GeoPointData) {
    return formatPoint(value);
  }
}
