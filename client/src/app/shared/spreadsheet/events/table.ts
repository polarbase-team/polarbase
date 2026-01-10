import { TableColumn } from '../models/table-column';
import { TableRow } from '../models/table-row';
import { ReferenceViewDetailEvent } from '../components/field-cell/reference/cell.component';

export interface TableSearchInfo {
  results: [TableRow, TableColumn][];
  current: number;
}

export const TableActionType = {
  Search: 'search',
  Freeze: 'freeze',
  ViewReferenceDetail: 'viewReferenceDetail',
} as const;
export type TableActionType = (typeof TableActionType)[keyof typeof TableActionType];

export interface TableActionPayload {
  [TableActionType.Search]: TableSearchInfo;
  [TableActionType.Freeze]: number;
  [TableActionType.ViewReferenceDetail]: ReferenceViewDetailEvent;
}

export interface TableAction<T extends TableActionType = TableActionType> {
  type: T;
  payload: TableActionPayload[T];
}
