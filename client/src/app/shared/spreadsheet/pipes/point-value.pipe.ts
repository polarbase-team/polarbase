import _ from 'lodash';

import { Pipe, PipeTransform } from '@angular/core';

import { GeoPointData } from '../field/interfaces/geo-point-field.interface';

@Pipe({
  name: 'pointValue',
  standalone: true,
})
export class PointValuePipe implements PipeTransform {
  transform(value: GeoPointData) {
    if (value) {
      if (_.isString(value)) return value.replace(/\(|\)/g, '');
      if (_.isFinite(value.x) && _.isFinite(value.y)) return `${value.x}, ${value.y}`;
    }
    return '';
  }
}
