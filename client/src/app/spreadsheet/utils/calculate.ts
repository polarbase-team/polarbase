import * as formula from '@formulajs/formulajs';

export const CalculateType = {
  Empty: 'Empty',
  Filled: 'Filled',
  Unique: 'Unique',
  PercentEmpty: 'PercentEmpty',
  PercentFilled: 'PercentFilled',
  PercentUnique: 'PercentUnique',
  Sum: 'Sum',
  Average: 'Average',
  Median: 'Median',
  Min: 'Min',
  Max: 'Max',
  Range: 'Range',
} as const;
export type CalculateType = (typeof CalculateType)[keyof typeof CalculateType];

function countEmpty(data: any[]) {
  return formula.COUNTBLANK(data);
}

function countFilled(data: any[]) {
  return formula.COUNTA(data);
}

function countUnique(data: any[]) {
  const uniqueValues = formula.UNIQUE(data);
  return formula.COUNT(uniqueValues);
}

function countPercentEmpty(data: any[]) {
  const total = data.length;
  const blanks = formula.COUNTBLANK(data);
  return total === 0 ? 0 : blanks / total;
}

function countPercentFilled(data: any[]) {
  const total = data.length;
  const filled = formula.COUNTA(data);
  return total === 0 ? 0 : filled / total;
}

function countPercentUnique(data: any[]) {
  const total = data.length;
  if (total === 0) return 0;
  return countUnique(data) / total;
}

function sum(data: any[]) {
  return formula.SUM(data);
}

function average(data: any[]) {
  return formula.AVERAGE(data);
}

function median(data: any[]) {
  return formula.MEDIAN(data);
}

function min(data: any[]) {
  const result = formula.MIN(data);
  return result === null ? 0 : result;
}

function max(data: any[]) {
  const result = formula.MAX(data);
  return result === null ? 0 : result;
}

function range(data: any[]) {
  const maxVal = formula.MAX(data);
  const minVal = formula.MIN(data);
  if (maxVal === null || minVal === null) return 0;
  return maxVal - minVal;
}

export function calculateBy(data: any[], type: CalculateType) {
  let fn: Function;
  switch (type) {
    case CalculateType.Empty:
      fn = countEmpty;
      break;
    case CalculateType.Filled:
      fn = countFilled;
      break;
    case CalculateType.Unique:
      fn = countUnique;
      break;
    case CalculateType.PercentEmpty:
      fn = countPercentEmpty;
      break;
    case CalculateType.PercentFilled:
      fn = countPercentFilled;
      break;
    case CalculateType.PercentUnique:
      fn = countPercentUnique;
      break;
    case CalculateType.Sum:
      fn = sum;
      break;
    case CalculateType.Average:
      fn = average;
      break;
    case CalculateType.Median:
      fn = median;
      break;
    case CalculateType.Min:
      fn = min;
      break;
    case CalculateType.Max:
      fn = max;
      break;
    case CalculateType.Range:
      fn = range;
      break;
  }

  return fn?.(data);
}
