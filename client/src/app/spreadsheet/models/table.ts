import { CalculateType } from '../utils/calculate';
import { GroupType } from '../utils/group';
import { SortType } from '../utils/sort';
import { TableColumn } from './table-column';

export const TableRowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type TableRowSize = keyof typeof TableRowSize;

export type TableConfig = Partial<{
  sideSpacing?: number;
  streamData: boolean;
  calculating: [TableColumn | TableColumn['id'], CalculateType][];
  grouping: [TableColumn | TableColumn['id'], GroupType][];
  sorting: [TableColumn | TableColumn['id'], SortType][];
  column: {
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
  row: {
    size?: TableRowSize;
    selectable?: boolean;
    arrangeable?: boolean;
    expandable?: boolean;
    creatable?: boolean;
    insertable?: boolean;
    deletable?: boolean;
  };
  cell: {
    fillable?: boolean;
  };
}>;
