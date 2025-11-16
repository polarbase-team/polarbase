import { EDataType } from '../../field/interfaces';
import { ClipboardItem } from '../../helpers/clipboard';
import { parseClipboardExternal, parseClipboardInternal } from '../../helpers/paste';

import type { Column } from './column';
import type { Row, RowCellData } from './row';

export enum CellDataEditType {
  Default = 'default',
  Clear = 'clear',
  Paste = 'paste',
  Fill = 'fill',
}

export interface Cell {
  row: Row;
  column: Column;
}

export interface CellIndex {
  rowIndex: number;
  columnIndex: number;
}

export interface CellOffset {
  left: number;
  top: number;
}

export interface CellDataEditedEvent {
  row: Row;
  newData: RowCellData;
  type: CellDataEditType;
}

export enum ExcludeCellState {
  Required,
  Empty,
  NonEditable,
}

export type Direction = 'above' | 'below' | 'before' | 'after';

export const UNPASTEABLE_DATA_TYPES: EDataType[] = [];
export const UNCLEARABLE_DATA_TYPES: EDataType[] = [];
export const UNCUTABLE_DATA_TYPES: EDataType[] = [];

export function parseClipboardItemToData(column: Column, item: ClipboardItem<Cell>) {
  const { text, data, metadata } = item;

  if (data !== undefined && metadata !== undefined) {
    return parseClipboardInternal(column, { text, data, metadata });
  }
  if (text?.length) {
    return parseClipboardExternal(column.field, text);
  }
  return null;
}

export class MatrixCell {
  private _values: Cell[][] = [];

  get rowCount() {
    return this._values.length;
  }

  get columnCount() {
    return this._values.length ? this._values[0].length : 0;
  }

  get count() {
    return this.rowCount * this.columnCount;
  }

  constructor(cells?: Cell[]) {
    if (cells) {
      const map = new Map<Row['id'], Cell[]>();
      for (const cell of cells) {
        const rowId = cell.row.id;
        if (!map.has(rowId)) {
          map.set(rowId, []);
        }
        map.get(rowId)!.push(cell);
      }
      this._values = Array.from(map.values());
    }
  }

  values() {
    return this._values;
  }

  addRow(columns?: Cell[]) {
    const cells = columns || [];
    this._values.push(cells);
    return cells;
  }

  removeRow(idx: number) {
    this._values.splice(idx, 1);
  }
}
