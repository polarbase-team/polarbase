import { TableRow } from '../models/table-row';

export interface TableRowAddedEvent {
  row: TableRow;
  insertedIndex: number;
}
export interface TableRowMovedEvent {
  row: TableRow;
  movedIndex: number;
}

export const TableRowActionType = {
  Add: 'add',
  Delete: 'delete',
  Expand: 'expand',
  Move: 'move',
  Select: 'select',
} as const;
export type TableRowActionType = (typeof TableRowActionType)[keyof typeof TableRowActionType];

export interface TableRowActionPayload {
  [TableRowActionType.Add]: TableRowAddedEvent[];
  [TableRowActionType.Delete]: TableRow[];
  [TableRowActionType.Expand]: TableRow;
  [TableRowActionType.Move]: TableRowMovedEvent[];
  [TableRowActionType.Select]: TableRow[] | null;
}

export interface TableRowAction<T extends TableRowActionType = TableRowActionType> {
  type: T;
  payload: TableRowActionPayload[T];
}
