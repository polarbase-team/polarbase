import { EDataType, EOperator } from '../interfaces';

export const OPERATORS_TRANSLATE = {
  [EOperator.NotApply]: 'NOT_APPLY',
  [EOperator.CountAll]: 'COUNT_ALL',
  [EOperator.CountEmpty]: 'COUNT_EMPTY',
  [EOperator.CountNotEmpty]: 'COUNT_NOT_EMPTY',
  [EOperator.CountUnique]: 'COUNT_UNIQUE',
  [EOperator.CountValues]: 'COUNT_VALUES',
  [EOperator.Sum]: 'SUM',
  [EOperator.Average]: 'AVERAGE',
  [EOperator.Max]: 'MAX',
  [EOperator.Min]: 'MIN',
  [EOperator.Med]: 'MED',
  [EOperator.Range]: 'RANGE',
  [EOperator.CountChecked]: 'COUNT_CHECKED',
  [EOperator.CountUnchecked]: 'COUNT_UN_CHECKED',
  [EOperator.DayRange]: 'DAY_RANGE',
  [EOperator.MonthRange]: 'MONTH_RANGE',
  [EOperator.EarliestDate]: 'EARLIEST_DATE',
  [EOperator.LatestDate]: 'LATEST_DATE',
};

export const COMMON_OPERATORS: EOperator[] = [EOperator.CountAll, EOperator.NotApply];

export const DATA_TYPE_OPERATORS: Record<string, EOperator[]> = {
  text: [
    EOperator.CountValues,
    EOperator.CountUnique,
    EOperator.CountEmpty,
    EOperator.CountNotEmpty,
  ],
  number: [
    EOperator.CountValues,
    EOperator.CountUnique,
    EOperator.CountEmpty,
    EOperator.CountNotEmpty,
    EOperator.Sum,
    EOperator.Average,
    EOperator.Min,
    EOperator.Max,
    EOperator.Med,
    EOperator.Range,
  ],
  date: [
    EOperator.CountValues,
    EOperator.CountUnique,
    EOperator.CountEmpty,
    EOperator.CountNotEmpty,
    EOperator.DayRange,
    EOperator.MonthRange,
    EOperator.EarliestDate,
    EOperator.LatestDate,
  ],
  checkbox: [EOperator.CountChecked, EOperator.CountUnchecked],
};

export const DATA_TYPE_GROUPS: Partial<Record<EDataType, string>> = {
  [EDataType.Text]: 'text',
  [EDataType.Dropdown]: 'text',
  [EDataType.Number]: 'number',
  [EDataType.Date]: 'date',
  [EDataType.Checkbox]: 'checkbox',
};

export const operatorOfDate: ReadonlySet<EOperator> = new Set([
  EOperator.EarliestDate,
  EOperator.LatestDate,
]);
