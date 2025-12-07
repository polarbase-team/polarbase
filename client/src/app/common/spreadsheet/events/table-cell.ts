import { TableCell } from '../models/table-cell';
import { TableRow, TableRowCellData } from '../models/table-row';

export interface TableCellEditedEvent {
  row: TableRow;
  newData: TableRowCellData;
}

export const TableCellActionType = {
  Edit: 'edit',
  Paste: 'paste',
  Clear: 'clear',
  Fill: 'fill',
  Select: 'select',
} as const;
export type TableCellActionType = (typeof TableCellActionType)[keyof typeof TableCellActionType];

export interface TableCellActionPayload {
  [TableCellActionType.Edit]: TableCellEditedEvent[];
  [TableCellActionType.Paste]: TableCellEditedEvent[];
  [TableCellActionType.Clear]: TableCellEditedEvent[];
  [TableCellActionType.Fill]: TableCellEditedEvent[];
  [TableCellActionType.Select]: TableCell[] | null;
}
export interface TableCellAction<T extends TableCellActionType = TableCellActionType> {
  type: T;
  payload: TableCellActionPayload[T];
}
