import { Observable } from 'rxjs';

export enum EDataType {
  Text = 1,
  Checkbox = 2,
  Dropdown = 3,
  Number = 4,
  Date = 5,
}

export interface IField<T = any> {
  name: string;
  dataType: EDataType;
  description?: string;
  required?: boolean;
  initialData?: T;
  params?: any;
}

export type TField<T = any> = IField<T>;
export type TFieldList = TField[] | Observable<TField[]>;

export enum EOperator {
  NotApply = 'not-apply',
  CountAll = 'count-all',
  CountValues = 'count-values',
  CountUnique = 'count-unique',
  CountEmpty = 'count-empty',
  CountNotEmpty = 'count-not-empty',
  Sum = 'sum',
  Average = 'average',
  Min = 'min',
  Max = 'max',
  Med = 'med',
  Range = 'range',
  CountChecked = 'count-checked',
  CountUnchecked = 'count-unchecked',
  DayRange = 'day-range',
  MonthRange = 'month-range',
  EarliestDate = 'earliest-date',
  LatestDate = 'latest-date',
}
