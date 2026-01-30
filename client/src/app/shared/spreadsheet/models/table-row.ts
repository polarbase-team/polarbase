import { TableColumn } from './table-column';

export const TableRowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type TableRowSize = keyof typeof TableRowSize;

export type TableRowCellData = Record<TableColumn['id'], any>;

export interface TableRow {
  id: string | number;
  data: TableRowCellData;
  editable?: boolean | Record<TableColumn['id'], boolean>;
  deletable?: boolean;
  selected?: boolean;
}
