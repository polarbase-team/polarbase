import { Pipe, PipeTransform } from '@angular/core';

import { DateData } from '../models/date/field.interface';
import { formatDateTime } from '../models/date/field.object';

@Pipe({ name: 'dateFormat' })
export class DateFormatPipe implements PipeTransform {
  transform(value: DateData, format?: string, showTime?: boolean) {
    return formatDateTime(value, format, showTime);
  }
}
