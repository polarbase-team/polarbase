import { CalculateType } from '../utils/calculate';
import { SortType } from '../utils/sort';
import { TableColumn } from './table-column';

export const TableRowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type TableRowSize = keyof typeof TableRowSize;

export interface TableConfig {
  sideSpacing?: number;
  dataStream?: boolean;
  aggregations?: [TableColumn | TableColumn['id'], CalculateType][];
  grouping?: [TableColumn | TableColumn['id'], SortType][];
  sorting?: [TableColumn | TableColumn['id'], SortType][];
  column?: {
    frozenCount?: number | null;
    maxFrozenRatio?: number;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    reorderable?: boolean;
    calculable?: boolean;
    addable?: boolean;
    deletable?: boolean;
    freezable?: boolean;
    groupable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    sortable?: boolean;
  };
  row?: {
    size?: TableRowSize;
    selectable?: boolean;
    reorderable?: boolean;
    expandable?: boolean;
    addable?: boolean;
    insertable?: boolean;
    deletable?: boolean;
  };
  cell?: {
    fillable?: boolean;
    editable?: boolean;
    clearable?: boolean;
  };
}
