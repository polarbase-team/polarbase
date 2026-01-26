import dayjs from 'dayjs';
import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '@environments/environment';

import { DateData } from '../models/date/field.interface';

@Pipe({ name: 'dateFormat' })
export class DateFormatPipe implements PipeTransform {
  transform(value: DateData, format?: string, showTime: boolean = true) {
    if (showTime) {
      format = format ?? environment.dateTimeFormat ?? 'YYYY-MM-DD HH:mm';
      return dayjs(value).format(format.includes('HH:mm') ? format : `${format} HH:mm`);
    }

    return dayjs(value).format(format ?? environment.dateFormat ?? 'YYYY-MM-DD');
  }
}
