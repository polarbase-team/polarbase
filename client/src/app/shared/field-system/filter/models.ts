import { DataType } from '../models/field.interface';

export const Conjunction = {
  AND: 'AND',
  OR: 'OR',
} as const;
export type Conjunction = (typeof Conjunction)[keyof typeof Conjunction];

export const SymOp = {
  Equal: '=',
  NotEqual: '!=',
  LessThan: '<',
  LessEqual: '<=',
  GreaterThan: '>',
  GreaterEqual: '>=',
  Empty: 'NULL',
  NotEmpty: 'NOT_NULL',
  Contains: 'LIKE',
  NotContains: 'NOT_LIKE',
  In: 'IN',
  NotIn: 'NOT_IN',
} as const;
export type SymOp = (typeof SymOp)[keyof typeof SymOp];

export const FilterType = {
  Rule: 'rule',
  Group: 'group',
} as const;
export type FilterType = (typeof FilterType)[keyof typeof FilterType];

export interface FilterRule {
  type: 'rule';
  field: string;
  operator: SymOp;
  value: any;
}

export interface FilterGroup {
  type: 'group';
  conjunction: Conjunction;
  children: (FilterRule | FilterGroup)[];
}

interface ConditionOp {
  label: string;
  value: SymOp;
}

const GENERIC_OPS: ConditionOp[] = [
  { label: 'Is empty', value: SymOp.Empty },
  { label: 'Is not empty', value: SymOp.NotEmpty },
];

const EQUALITY_OPS: ConditionOp[] = [
  { label: 'Equals', value: SymOp.Equal },
  { label: 'Does not equal', value: SymOp.NotEqual },
];

const COMPARISON_OPS: ConditionOp[] = [
  { label: 'Less than', value: SymOp.LessThan },
  { label: 'Less than or equals', value: SymOp.LessEqual },
  { label: 'Greater than', value: SymOp.GreaterThan },
  { label: 'Greater than or equals', value: SymOp.GreaterEqual },
];

const TEXT_OPS: ConditionOp[] = [
  { label: 'Contains', value: SymOp.Contains },
  { label: 'Not Contains', value: SymOp.NotContains },
];
const SET_OPS: ConditionOp[] = [
  { label: 'In', value: SymOp.In },
  { label: 'Not in', value: SymOp.NotIn },
];

/**
 * Maps the DataType to specific supported operators
 */
export const getOperatorsByDataType = (dataType: DataType) => {
  let ops = [...GENERIC_OPS];

  switch (dataType) {
    case DataType.Integer:
    case DataType.Number:
    case DataType.AutoNumber:
      ops = [...ops, ...EQUALITY_OPS, ...COMPARISON_OPS];
      break;

    case DataType.Text:
    case DataType.Email:
    case DataType.Url:
    case DataType.GeoPoint:
      ops = [...ops, ...EQUALITY_OPS, ...TEXT_OPS];
      break;

    case DataType.Select:
    case DataType.MultiSelect:
    case DataType.Reference:
      ops = [...ops, ...EQUALITY_OPS, ...SET_OPS];
      break;

    case DataType.LongText:
    case DataType.Checkbox:
    case DataType.Date:
    case DataType.AutoDate:
    case DataType.GeoPoint:
      ops = [...ops, ...EQUALITY_OPS];
      break;

    default:
      break;
  }

  return ops;
};
