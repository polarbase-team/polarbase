import { EmitEventController } from '../../helpers/emit-event-controller';
import type { Column } from './column';
import type { Group } from './group';

export enum RowSizeEnum {
  S = 32,
  M = 56,
  L = 92,
  XL = 128,
}

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

export const ROW_SIZES = ['S', 'M', 'L', 'XL'] as const;

export type RowSize = (typeof ROW_SIZES)[number];

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

export type RowInsertedEvent = {
  row: Row;
  position: number;
};

export type RowMovedEvent = {
  rows: Row[];
  position: number;
};

export interface RowExtra extends Row {
  _isInit?: boolean;
  _isStreamed?: boolean;
}
