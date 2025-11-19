// import { COUNTUNIQUE, SUM, AVERAGE, MEDIAN } from '@formulajs/formulajs';
import { SUM, AVERAGE, MEDIAN } from '@formulajs/formulajs';
import dayjs from 'dayjs';
import _ from 'lodash';

import { Field } from '../field/objects/field.object';
import { EDataType } from '../field/interfaces/field.interface';

export const EMPTY_GROUP_VALUE: any = Infinity;

export enum ECalculateType {
  Empty = 'Empty',
  Filled = 'Filled',
  Unique = 'Unique',
  PercentEmpty = 'PercentEmpty',
  PercentFilled = 'PercentFilled',
  PercentUnique = 'PercentUnique',
  Sum = 'Sum',
  Average = 'Average',
  Median = 'Median',
  Min = 'Min',
  Max = 'Max',
  EarliestDate = 'EarliestDate',
  LatestDate = 'LatestDate',
  Range = 'Range',
  DayRange = 'DayRange',
  MonthRange = 'MonthRange',
  EmptyCheckBox = 'EmptyCheckBox',
  FilledCheckBox = 'FilledCheckBox',
  PercentEmptyCheckBox = 'PercentEmptyCheckBox',
  PercentFilledCheckBox = 'PercentFilledCheckBox',
}

export function calculateFieldPredicate(field: Field, calculateType: ECalculateType) {
  let data = field.data;

  if (_.isNil(data)) {
    data = null;
  } else {
    switch (field.dataType) {
      case EDataType.Checkbox:
        data ||= null;
        break;
      case EDataType.Date:
        switch (calculateType) {
          case ECalculateType.DayRange:
            data = dayjs(data).startOf('day');
            break;
          case ECalculateType.MonthRange:
            data = dayjs(data).startOf('month');
            break;
          case ECalculateType.Unique:
          case ECalculateType.PercentUnique:
            data = dayjs(data).format();
            break;
        }
        break;
    }
  }

  return data;
}

export function parseGroupFieldData(field: Field, data: any = field.data) {
  return data ?? EMPTY_GROUP_VALUE;
}

_.mixin({
  median: (arr: number[]): number => {
    if (arr.length === 0) return 0;

    arr.sort((a: number, b: number) => a - b);

    const midpoint: number = Math.floor(arr.length / 2);

    return arr.length % 2 === 1 ? arr[midpoint] : (arr[midpoint - 1] + arr[midpoint]) / 2;
  },
});

function countEmpty(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Empty,
): number {
  return _.reduce(
    data,
    (memo: number, d: any) => {
      d = predicate ? predicate(d, forwardType) : d;

      if (d?.isCheckbox) {
        // Handle checkbox loop in array
        // Count empty -> uncheck
        memo += countEmpty(d?.data);
      } else {
        memo = _.isEmpty(d) ? ++memo : memo;
      }

      return memo;
    },
    0,
  );
}

function countFilled(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Filled,
): number {
  return _.reduce(
    data,
    (memo: number, d: any) => {
      d = predicate ? predicate(d, forwardType) : d;

      if (d?.isCheckbox) {
        // Handle checkbox loop in array
        // Count empty -> uncheck
        memo += countFilled(d?.data);
      } else {
        memo = _.isEmpty(d) ? memo : ++memo;
      }

      return memo;
    },
    0,
  );
}

function countUnique(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Unique,
): number {
  const cellsData: any[] = mapCellsData(data, predicate, forwardType);

  // return COUNTUNIQUE(cellsData);
  return 0;
}

function countPercentEmpty(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.PercentEmpty,
): number {
  const length: number = data?.length;

  if (!length) return 0;

  return (countEmpty(data, predicate, forwardType) / (length || 1)) * 100;
}

function countPercentFilledLookupToCheckbox(
  data: any[],
  predicate?: (...args: any) => any,
): number {
  const emptyCheckbox: number = countEmpty(data, predicate, ECalculateType.Empty);

  const filledCheckbox: number = countFilled(data, predicate, ECalculateType.Filled);

  return (filledCheckbox / (emptyCheckbox + filledCheckbox)) * 100;
}

function countPercentEmptyLookupToCheckbox(data: any[], predicate?: (...args: any) => any): number {
  const emptyCheckbox: number = countEmpty(data, predicate, ECalculateType.Empty);

  const filledCheckbox: number = countFilled(data, predicate, ECalculateType.Filled);

  return (emptyCheckbox / (emptyCheckbox + filledCheckbox)) * 100;
}

function countPercentFilled(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.PercentFilled,
): number {
  const length: number = data?.length;

  if (!length) return 0;

  return (countFilled(data, predicate, forwardType) / (length || 1)) * 100;
}

function countPercentUnique(
  data: any[],
  predicate?: (...args: any) => any,
  _forwardType?: ECalculateType,
): number {
  const uniqueValue: number = countUnique(data, predicate, ECalculateType.Unique);

  const notEmpty: number = countFilled(data, predicate, ECalculateType.Filled);

  return (uniqueValue / notEmpty) * 100 || 0;
}

function sumFormula(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Sum,
): number | string {
  const values: any[] = mapCellsData(data, predicate, forwardType);

  return calculateNumber(values, SUM);
}

function averageFormula(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Average,
): number | string {
  const cellsData: any[] = mapCellsData(data, predicate, forwardType);

  return calculateNumber(cellsData, AVERAGE);
}

function medianFormula(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Median,
): number | string {
  const cellsData: any[] = mapCellsData(data, predicate, forwardType);

  return calculateNumber(cellsData, MEDIAN, 0);
}

function min(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Min,
): any {
  const cellsData: any[] = mapCellsData(data, predicate, forwardType);

  const condition: boolean = checkNumberArray(cellsData);

  if (!condition) return '#N/A';

  return _.min(_.flattenDeep(cellsData));
}

function max(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Max,
): any {
  const cellsData: any[] = mapCellsData(data, predicate, forwardType);

  const condition: boolean = checkNumberArray(cellsData);

  if (!condition) return '#N/A';

  return _.max(_.flattenDeep(cellsData));
}

function range(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.Range,
): number | string {
  let minNum: number | undefined;
  let maxNum: number | undefined;
  let resultRange: number | string | undefined;

  for (let d of data) {
    d = predicate ? predicate(d, forwardType) : d;

    if (!_.isEmpty(d)) {
      if (_.isString(d) || _.isBoolean(d) || !checkNumberArray(d)) {
        resultRange = '#N/A';

        break;
      }

      let minD: number = d;
      let maxD: number = d;

      if (_.isArray(d)) {
        minD = min(d);
        maxD = max(d);
      }

      if (minNum === undefined || minD < minNum) {
        minNum = minD;
      }

      if (maxNum === undefined || maxD > maxNum) {
        maxNum = maxD;
      }
    }
  }

  if (resultRange && _.isString(resultRange)) return resultRange;

  return maxNum! - minNum! || 0;
}

function dayRange(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.DayRange,
): number {
  const r: number = +range(data, predicate, forwardType);

  return r / 1000 / 60 / 60 / 24;
}

function monthRange(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType: ECalculateType = ECalculateType.MonthRange,
): number {
  const r: number = dayRange(data, predicate, forwardType);

  return r / 30;
}

export function calculateBy(
  data: any[],
  type: ECalculateType,
  predicate?: (...args: any) => any,
  field?: Field,
): any {
  let fn: Function;

  switch (type) {
    case ECalculateType.Empty:
    case ECalculateType.EmptyCheckBox:
      fn = countEmpty;
      break;
    case ECalculateType.Filled:
    case ECalculateType.FilledCheckBox:
      fn = countFilled;
      break;
    case ECalculateType.Unique:
      fn = countUnique;
      break;
    case ECalculateType.PercentEmpty:
      fn = countPercentEmpty;
      break;
    case ECalculateType.PercentEmptyCheckBox:
      fn = countPercentEmptyLookupToCheckbox;
      break;
    case ECalculateType.PercentFilled:
      fn = countPercentFilled;
      break;
    case ECalculateType.PercentFilledCheckBox:
      fn = countPercentFilledLookupToCheckbox;
      break;
    case ECalculateType.PercentUnique:
      fn = countPercentUnique;
      break;
    case ECalculateType.Sum:
      fn = sumFormula;
      break;
    case ECalculateType.Average:
      fn = averageFormula;
      break;
    case ECalculateType.Median:
      fn = medianFormula;
      break;
    case ECalculateType.Min:
    case ECalculateType.EarliestDate:
      fn = min;
      break;
    case ECalculateType.Max:
    case ECalculateType.LatestDate:
      fn = max;
      break;
    case ECalculateType.Range:
      fn = range;
      break;
    case ECalculateType.DayRange:
      fn = dayRange;
      break;
    case ECalculateType.MonthRange:
      fn = monthRange;
      break;
  }

  return fn?.(data, predicate);
}

function calculateNumber(
  array: any[],
  calculatorFn?: (array: any) => any,
  defaultValue: number = 0,
): number | string {
  const condition: boolean = checkNumberArray(array);

  return condition ? calculatorFn?.(array) || defaultValue : '#N/A';
}

export function checkValidDate(dateString: string): boolean {
  const date: Date = new Date(dateString);

  return !isNaN(date.getTime());
}

function mapCellsData(
  data: any[],
  predicate?: (...args: any) => any,
  forwardType?: ECalculateType,
): any[] {
  const cellsData: any[] = _.chain(data)
    .reduce((memo: number[], d: any) => {
      d = predicate ? predicate(d, forwardType) : d;

      if (!_.isEmpty(d)) memo.push(d);

      return memo;
    }, [])
    .value();

  return cellsData;
}

function checkNumberArray(cellsData: any[]): boolean {
  return (_.flattenDeep(cellsData) || []).every(
    (item: any) => _.isNumber(item) || checkValidDate(item),
  );
}
