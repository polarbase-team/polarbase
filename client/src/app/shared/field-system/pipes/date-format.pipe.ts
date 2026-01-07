import dayjs from 'dayjs';
import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '@environments/environment';

import { DateData } from '../../field-system/models/date/field.interface';

@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(value: DateData) {
    return dayjs(value).format(environment.dateTimeFormat ?? 'YYYY-MM-DD HH:mm');
  }
}
