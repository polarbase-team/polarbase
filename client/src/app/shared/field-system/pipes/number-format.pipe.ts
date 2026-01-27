import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '@environments/environment';

export const NumberFormat = {
  Comma: 'comma',
  Percentage: 'percentage',
  Currency: 'currency',
} as const;
export type NumberFormat = (typeof NumberFormat)[keyof typeof NumberFormat];

@Pipe({ name: 'numberFormat' })
export class NumberFormatPipe implements PipeTransform {
  transform(value: number, format?: NumberFormat, currency?: string) {
    if (format === NumberFormat.Comma) {
      return value.toLocaleString();
    }

    if (format === NumberFormat.Percentage) {
      return `${value * 100}%`;
    }

    if (format === NumberFormat.Currency) {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: currency || environment.defaultCurrency,
      });
    }

    return value;
  }
}
