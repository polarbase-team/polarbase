import { EmitEventController } from '../../helpers/emit-event-controller';
import type { Column } from './column';
import type { Group } from './group';

export function flushEEC(
  controller: EmitEventController<any, any>,
  row: Row,
  predicate: (event: any) => Row['id'],
) {
  if (!controller?.getLength()) return;

  if (row == null) {
    controller.flush();
  } else {
    const keys = [];

    for (const event of controller.getEvents()) {
      const rowID = predicate(event);
      if (rowID === row.id) continue;
      keys.push(rowID);
    }

    if (keys.length) controller.emit(keys);
  }
}

export const RowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type RowSize = keyof typeof RowSize;

export type Row = {
  id: string | number;
  name: string;
  data: RowCellData;
  editable?: boolean | Record<Column['id'], boolean>;
  deletable?: boolean;
  selected?: boolean;
};

export type RowCellData = Record<Column['id'], any>;

export type FoundRow = {
  rowIndex: number;
  rowOffset: number;
  group?: Group;
};

export interface RowExtra extends Row {
  _isInit?: boolean;
  _isStreamed?: boolean;
}

export interface TableRowAddedEvent {
  row: Row;
  insertedIndex: number;
}
export interface TableRowMovedEvent {
  row: Row;
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
  [TableRowActionType.Delete]: Row[];
  [TableRowActionType.Expand]: Row;
  [TableRowActionType.Move]: TableRowMovedEvent[];
  [TableRowActionType.Select]: Row[] | null;
}

export interface TableRowAction<T extends TableRowActionType = TableRowActionType> {
  type: T;
  payload: TableRowActionPayload[T];
}
