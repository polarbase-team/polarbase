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

export type TableConfig = {
  sideSpacing?: number;
  streamData?: boolean;
  calculateBy?: [TableColumn | TableColumn['id'], CalculateType][];
  groupBy?: [TableColumn | TableColumn['id'], SortType][];
  sortBy?: [TableColumn | TableColumn['id'], SortType][];
  column?: {
    frozenIndex?: number | null;
    maxFrozenRatio?: number;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    arrangeable?: boolean;
    calculable?: boolean;
    creatable?: boolean;
    editable?: boolean;
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
    arrangeable?: boolean;
    expandable?: boolean;
    creatable?: boolean;
    insertable?: boolean;
    editable?: boolean;
    deletable?: boolean;
  };
  cell?: {
    fillable?: boolean;
  };
};
