import { Pipe, PipeTransform } from '@angular/core';

import { NumberFormat } from '../models/number/field.interface';
import { formatNumber } from '../models/number/field.object';

@Pipe({ name: 'numberFormat' })
export class NumberFormatPipe implements PipeTransform {
  transform(value: number, format?: NumberFormat, currency?: string) {
    return formatNumber(value, format, currency);
  }
}
