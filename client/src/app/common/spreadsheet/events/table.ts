import { TableColumn } from '../models/table-column';
import { TableRow } from '../models/table-row';

export interface TableSearchInfo {
  results: [TableRow, TableColumn][];
  current: number;
}

export const TableActionType = {
  Search: 'search',
  Freeze: 'freeze',
} as const;
export type TableActionType = (typeof TableActionType)[keyof typeof TableActionType];

export interface TableActionPayload {
  [TableActionType.Search]: TableSearchInfo;
  [TableActionType.Freeze]: number;
}

export interface TableAction<T extends TableActionType = TableActionType> {
  type: T;
  payload: TableActionPayload[T];
}
