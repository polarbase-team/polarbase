import { TableColumn } from '../models/table-column';

export type TableColumnMovedEvent = {
  column: TableColumn;
  position: number;
};

export const TableColumnActionType = {
  Add: 'add',
  Edit: 'edit',
  Clear: 'clear',
  Delete: 'delete',
  Move: 'move',
  Resize: 'resize',
  Hide: 'hide',
  Unhide: 'unhide',
  Calculate: 'calculate',
  Uncalculate: 'uncalculate',
  Group: 'group',
  Ungroup: 'ungroup',
  Sort: 'sort',
  Unsort: 'unsort',
  Select: 'select',
} as const;
export type TableColumnActionType =
  (typeof TableColumnActionType)[keyof typeof TableColumnActionType];

export interface TableColumnActionPayload {
  [TableColumnActionType.Add]: null;
  [TableColumnActionType.Edit]: TableColumn;
  [TableColumnActionType.Clear]: TableColumn;
  [TableColumnActionType.Delete]: TableColumn[];
  [TableColumnActionType.Move]: TableColumnMovedEvent;
  [TableColumnActionType.Resize]: TableColumn;
  [TableColumnActionType.Hide]: TableColumn[];
  [TableColumnActionType.Unhide]: TableColumn[];
  [TableColumnActionType.Calculate]: TableColumn;
  [TableColumnActionType.Uncalculate]: TableColumn;
  [TableColumnActionType.Group]: TableColumn;
  [TableColumnActionType.Ungroup]: TableColumn;
  [TableColumnActionType.Sort]: TableColumn;
  [TableColumnActionType.Unsort]: TableColumn;
  [TableColumnActionType.Select]: TableColumn[] | null;
}

export interface TableColumnAction<T extends TableColumnActionType = TableColumnActionType> {
  type: T;
  payload: TableColumnActionPayload[T];
}
