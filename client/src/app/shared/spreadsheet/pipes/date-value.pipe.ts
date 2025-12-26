import dayjs from 'dayjs';
import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '@environments/environment';
import { DateData } from '../field/interfaces/date-field.interface';

@Pipe({
  name: 'dateValue',
  standalone: true,
})
export class DateValuePipe implements PipeTransform {
  transform(value: DateData) {
    return dayjs(value).format(environment.dateTimeFormat ?? 'YYYY-MM-DD HH:mm');
  }
}
