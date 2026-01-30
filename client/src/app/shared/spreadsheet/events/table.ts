import { TableColumn } from '../models/table-column';
import { TableRow, TableRowSize } from '../models/table-row';

export interface TableSearchInfo {
  results: [TableRow, TableColumn][];
  current: number;
}

export const TableActionType = {
  Group: 'group',
  Sort: 'sort',
  Search: 'search',
  FreezeColumns: 'freezeColumns',
  ChangeRowSize: 'changeRowSize',
} as const;
export type TableActionType = (typeof TableActionType)[keyof typeof TableActionType];

export interface TableActionPayload {
  [TableActionType.Group]: TableColumn[] | null;
  [TableActionType.Sort]: TableColumn[] | null;
  [TableActionType.Search]: TableSearchInfo;
  [TableActionType.FreezeColumns]: number;
  [TableActionType.ChangeRowSize]: TableRowSize;
}

export interface TableAction<T extends TableActionType = TableActionType> {
  type: T;
  payload: TableActionPayload[T];
}
