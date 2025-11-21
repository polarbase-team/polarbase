import { Observable } from 'rxjs';

export const DataType = {
  Text: 1,
  Checkbox: 2,
  Dropdown: 3,
  Number: 4,
  Date: 5,
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export interface FieldConfig<T = any> {
  name: string;
  data?: T;
  description?: string;
  required?: boolean;
  initialData?: T;
  params?: any;
}

export const Operator = {
  NotApply: 'not-apply',
  CountAll: 'count-all',
  CountValues: 'count-values',
  CountUnique: 'count-unique',
  CountEmpty: 'count-empty',
  CountNotEmpty: 'count-not-empty',
  Sum: 'sum',
  Average: 'average',
  Min: 'min',
  Max: 'max',
  Med: 'med',
  Range: 'range',
  CountChecked: 'count-checked',
  CountUnchecked: 'count-unchecked',
  DayRange: 'day-range',
  MonthRange: 'month-range',
  EarliestDate: 'earliest-date',
  LatestDate: 'latest-date',
} as const;
export type Operator = (typeof Operator)[keyof typeof Operator];
