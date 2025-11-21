import { DataType, Operator } from '../interfaces';

export const OPERATORS_TRANSLATE = {
  [Operator.NotApply]: 'NOT_APPLY',
  [Operator.CountAll]: 'COUNT_ALL',
  [Operator.CountEmpty]: 'COUNT_EMPTY',
  [Operator.CountNotEmpty]: 'COUNT_NOT_EMPTY',
  [Operator.CountUnique]: 'COUNT_UNIQUE',
  [Operator.CountValues]: 'COUNT_VALUES',
  [Operator.Sum]: 'SUM',
  [Operator.Average]: 'AVERAGE',
  [Operator.Max]: 'MAX',
  [Operator.Min]: 'MIN',
  [Operator.Med]: 'MED',
  [Operator.Range]: 'RANGE',
  [Operator.CountChecked]: 'COUNT_CHECKED',
  [Operator.CountUnchecked]: 'COUNT_UN_CHECKED',
  [Operator.DayRange]: 'DAY_RANGE',
  [Operator.MonthRange]: 'MONTH_RANGE',
  [Operator.EarliestDate]: 'EARLIEST_DATE',
  [Operator.LatestDate]: 'LATEST_DATE',
};

export const COMMON_OPERATORS: Operator[] = [Operator.CountAll, Operator.NotApply];

export const DATA_TYPE_OPERATORS: Record<string, Operator[]> = {
  text: [Operator.CountValues, Operator.CountUnique, Operator.CountEmpty, Operator.CountNotEmpty],
  number: [
    Operator.CountValues,
    Operator.CountUnique,
    Operator.CountEmpty,
    Operator.CountNotEmpty,
    Operator.Sum,
    Operator.Average,
    Operator.Min,
    Operator.Max,
    Operator.Med,
    Operator.Range,
  ],
  date: [
    Operator.CountValues,
    Operator.CountUnique,
    Operator.CountEmpty,
    Operator.CountNotEmpty,
    Operator.DayRange,
    Operator.MonthRange,
    Operator.EarliestDate,
    Operator.LatestDate,
  ],
  checkbox: [Operator.CountChecked, Operator.CountUnchecked],
};

export const DATA_TYPE_GROUPS: Partial<Record<DataType, string>> = {
  [DataType.Text]: 'text',
  [DataType.Dropdown]: 'text',
  [DataType.Number]: 'number',
  [DataType.Date]: 'date',
  [DataType.Checkbox]: 'checkbox',
};

export const operatorOfDate: ReadonlySet<Operator> = new Set([
  Operator.EarliestDate,
  Operator.LatestDate,
]);
