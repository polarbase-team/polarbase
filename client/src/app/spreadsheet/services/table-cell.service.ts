import _ from 'lodash';
import dayjs, { isDayjs } from 'dayjs';
import { FORECAST } from '@formulajs/formulajs';
import { Injectable, ElementRef, Renderer2, inject, computed } from '@angular/core';
import { MessageService } from 'primeng/api';

import { isEmpty } from '../utils/is-empty';
import { Clipboard, ClipboardData, ClipboardItem } from '../utils/clipboard';
import { EmitEventController } from '../utils/emit-event-controller';
import { DataType } from '../field/interfaces/field.interface';
import { parseClipboardExternal, parseClipboardInternal } from '../utils/paste';
import { Dimension } from './table.service';
import { FieldCellService } from '../components/field-cell/field-cell.service';
import { FieldValidationErrors, FieldValidationKey } from '../field/objects/field.object';
import { DateField } from '../field/objects/date-field.object';
import { NumberField } from '../field/objects/number-field.object';
import { _getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { TableBaseService } from './table-base.service';
import { TableCell } from '../models/table-cell';
import { TableCellActionType, TableCellEditedEvent } from '../events/table-cell';
import { TableColumn } from '../models/table-column';
import { TableRow, TableRowCellData } from '../models/table-row';

export interface CellIndex {
  rowIndex: number;
  columnIndex: number;
}

export interface CellOffset {
  left: number;
  top: number;
}

export const ExcludeCellState = {
  Required: 0,
  Empty: 1,
  NonEditable: 2,
} as const;
export type ExcludeCellState = (typeof ExcludeCellState)[keyof typeof ExcludeCellState];

export const Direction = {
  Above: 'above',
  Below: 'below',
  Before: 'before',
  After: 'after',
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

const UNPASTEABLE_DATA_TYPES: DataType[] = [];
const UNCLEARABLE_DATA_TYPES: DataType[] = [];
const UNCUTABLE_DATA_TYPES: DataType[] = [];

function parseClipboardItemToData(column: TableColumn, item: ClipboardItem<TableCell>) {
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
  private _values: TableCell[][] = [];

  get rowCount() {
    return this._values.length;
  }

  get columnCount() {
    return this._values.length ? this._values[0].length : 0;
  }

  get count() {
    return this.rowCount * this.columnCount;
  }

  constructor(cells?: TableCell[]) {
    if (cells) {
      const map = new Map<TableRow['id'], TableCell[]>();
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

  addRow(columns?: TableCell[]) {
    const cells = columns || [];
    this._values.push(cells);
    return cells;
  }

  removeRow(idx: number) {
    this._values.splice(idx, 1);
  }
}

@Injectable()
export class TableCellService extends TableBaseService {
  cellError: { target: HTMLElement; message: string };

  private renderer = inject(Renderer2);
  private eleRef = inject(ElementRef);
  private toastService = inject(MessageService);
  private fieldCellService = inject(FieldCellService);
  private interactedColumns: Set<TableColumn>;
  private dataEditedEEC: EmitEventController<
    TableRow['id'],
    { type: TableCellActionType; payload: TableCellEditedEvent }
  > = new EmitEventController({
    autoEmit: false,
    onEmitted: (events) => {
      const editPayload: TableCellEditedEvent[] = [];
      const pastePayload: TableCellEditedEvent[] = [];
      const clearPayload: TableCellEditedEvent[] = [];
      const fillPayload: TableCellEditedEvent[] = [];

      for (const { type, payload } of events) {
        switch (type) {
          case TableCellActionType.Edit:
            editPayload.push(payload);
            break;
          case TableCellActionType.Paste:
            pastePayload.push(payload);
            break;
          case TableCellActionType.Clear:
            clearPayload.push(payload);
            break;
          case TableCellActionType.Fill:
            fillPayload.push(payload);
            break;
        }
      }

      if (editPayload.length) {
        this.host.cellAction.emit({
          type: TableCellActionType.Edit,
          payload: editPayload,
        });
      }

      if (pastePayload.length) {
        this.host.cellAction.emit({
          type: TableCellActionType.Paste,
          payload: editPayload,
        });
      }

      if (clearPayload.length) {
        this.host.cellAction.emit({
          type: TableCellActionType.Clear,
          payload: editPayload,
        });
      }

      if (fillPayload.length) {
        this.host.cellAction.emit({
          type: TableCellActionType.Fill,
          payload: editPayload,
        });
      }

      if (this.interactedColumns?.size) {
        let shouldReCalculate: boolean;
        let shouldReGroup: boolean;
        let shouldReSort: boolean;

        for (const column of this.interactedColumns) {
          if (column.calculateType) {
            shouldReCalculate = true;
          }
          if (column.groupSortType) {
            shouldReGroup = true;
          }
          if (column.sortType) {
            shouldReSort = true;
          }
        }

        if (shouldReCalculate) {
          this.tableService.calculate();
        }
        if (shouldReGroup) {
          this.tableService.group();
        }
        if (shouldReSort) {
          this.tableService.sort();
        }

        this.interactedColumns.clear();
      }
    },
  });

  canFillCell = computed(() => {
    return this.tableService.config().cell.fillable;
  });

  override onDestroy() {
    this.dataEditedEEC.flush();
  }

  scrollToCell({ row, column }: Partial<TableCell>) {
    const idx: CellIndex = { rowIndex: 0, columnIndex: 0 };

    if (row) {
      idx.rowIndex = this.tableRowService.findRowIndex(row);
    }

    if (column) {
      idx.columnIndex = this.tableColumnService.findColumnIndex(column);
    }

    this.scrollToCellByIndex(idx);
  }

  onCellHover(e: Event, index: CellIndex) {
    if (
      (this.host.isMouseHolding ||
        this.host.isMouseHiding ||
        !!this.tableService.layoutProps.cell.invalid ||
        !this.host.virtualScroll.isScrollCompleted ||
        this.fieldCellService.getSelectingState()?.isEditing) &&
      (e as PointerEvent).pointerType !== 'touch'
    ) {
      e.preventDefault();
      return;
    }

    this.tableService.layoutProps.cell.hovering = index;

    const unlisten = this.renderer.listen(e.target, 'pointerleave', () => {
      unlisten();
      this.tableService.layoutProps.cell.hovering = null;
    });
  }

  flushSelectingCellState(callback?: () => void) {
    const _callback = () => {
      this.fieldCellService.clearSelectingState();
      callback?.();
    };

    if (!this.tableService.layoutProps.cell.selection) {
      _callback();
      return;
    }

    const state = this.fieldCellService.getSelectingState();

    if (!state) {
      _callback();
      return;
    }

    state.flush(
      (data: any) => {
        if (data !== undefined) {
          const { row, column } = state.cell;
          const newData: TableRowCellData = { [column.id]: data };
          let rawData: TableRowCellData;

          this.markColumnAsInteracted(column);
          this.markCellDataAsEdited(row, newData, rawData);
          this.emitCellDataAsEdited();
        }

        _callback();
      },
      (errors: FieldValidationErrors | null) => {
        const cellIndex = this.findCellIndex(state.cell);

        if (!cellIndex) {
          state.reset();
          _callback();
          return;
        }

        const cellElement = this.findCellElementByIndex(cellIndex);

        if (!cellElement) {
          state.reset();
          _callback();
          return;
        }

        let invalid = null;

        if (errors !== null) {
          invalid = this.findCellIndex(state.cell);

          for (const key in errors) {
            if (!errors.hasOwnProperty(key)) {
              continue;
            }
            this.openErrorTooltip(cellElement, key);
          }

          this.tableService.layoutProps.fillHandler.hidden = true;
        } else {
          this.closeErrorTooltip();
          this.tableService.layoutProps.fillHandler.hidden = false;
        }

        this.tableService.layoutProps.cell.invalid = invalid;
      },
    );
  }

  revertSelectingCellState() {
    if (!this.tableService.layoutProps.cell.selection) return;

    const state = this.fieldCellService.getSelectingState();
    if (!state) return;

    const selectingCell = this.findCellByIndex(this.tableService.layoutProps.cell.selection.start);

    state.reset();

    if (this.tableRowService.isDraftRow(selectingCell.row)) {
      this.tableRowService.cancelDraftRow();
      this.deselectAllCells();
    }
  }

  scrollToFocusingCell() {
    const { rowIndex, columnIndex } = this.tableService.layoutProps.cell.focusing;
    this.scrollToCellByIndex({ rowIndex, columnIndex });
  }

  getCells(
    { rowIndex: startRowIdx, columnIndex: startColumnIdx }: CellIndex,
    { rowIndex: endRowIdx, columnIndex: endColumnIdx }: CellIndex,
    excludeDataTypes?: DataType[],
    excludeStates?: ExcludeCellState[],
  ): MatrixCell {
    const matrix = new MatrixCell();

    for (let i = startRowIdx; i <= endRowIdx; i++) {
      const cells = matrix.addRow();
      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        cells.push(
          this.findCellByIndex({
            rowIndex: i,
            columnIndex: j,
          }),
        );
      }
    }

    return excludeDataTypes?.length || excludeStates?.length
      ? this.filterExcludeCells(matrix, excludeDataTypes, excludeStates)
      : matrix;
  }

  selectCells(
    startIndex: CellIndex,
    endIndex: CellIndex = startIndex,
    scrollToLastCell = false,
    extend = false,
  ): MatrixCell {
    let { rowIndex: startRowIdx, columnIndex: startColumnIdx } = startIndex;
    let { rowIndex: endRowIdx, columnIndex: endColumnIdx } = endIndex;

    if (startRowIdx > endRowIdx) {
      const idx = startRowIdx;
      startRowIdx = endRowIdx;
      endRowIdx = idx;
    }

    if (startColumnIdx > endColumnIdx) {
      const idx = startColumnIdx;
      startColumnIdx = endColumnIdx;
      endColumnIdx = idx;
    }

    const selectedCells: TableCell[] = [];

    for (let i = startRowIdx; i <= endRowIdx; i++) {
      const rowIndex = Math.abs(i);
      const row = this.tableRowService.findRowByIndex(rowIndex);

      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        const columnIndex = Math.abs(j);
        const column = this.tableColumnService.findColumnByIndex(columnIndex);

        selectedCells.push({ row, column });
      }
    }

    const start = {
      rowIndex: startRowIdx,
      columnIndex: startColumnIdx,
    };
    const end = {
      rowIndex: endRowIdx,
      columnIndex: endColumnIdx,
    };

    this.flushSelectingCellState(() => {
      this.tableColumnService.deselectAllColumns();
      this.tableRowService.deselectAllRows();

      const rowCount = endRowIdx - startRowIdx + 1;
      const columnCount = endColumnIdx - startColumnIdx + 1;
      const primary =
        extend && this.tableService.layoutProps.cell.selection
          ? this.tableService.layoutProps.cell.selection.primary
          : start;

      this.tableService.layoutProps.cell.selection = {
        primary,
        start,
        end,
        rowCount,
        columnCount,
        count: rowCount * columnCount,
      };
      this.tableService.layoutProps.cell.focusing = primary;

      this.emitCellAsSelected(selectedCells);

      if (scrollToLastCell) {
        try {
          this.scrollToCellByIndex(end);
        } catch {}
      }

      if (this.canFillCell()) {
        this.tableService.updateFillHandlerPosition(end);
      }
    });

    return this.getCells(start, end);
  }

  deselectAllCells() {
    if (!this.tableService.layoutProps.cell.selection) return;

    this.flushSelectingCellState(() => {
      this.tableService.layoutProps.cell.selection =
        this.tableService.layoutProps.cell.focusing =
        this.tableService.layoutProps.cell.filling =
          null;

      this.tableService.layoutProps.fillHandler.index = null;
      this.tableService.layoutProps.fillHandler.hidden = true;

      this.host.cellAction.emit({
        type: TableCellActionType.Select,
        payload: null,
      });
    });
  }

  cutCells(clipboardData: ClipboardData<TableCell>) {
    const matrixCell = new MatrixCell();

    for (const items of clipboardData.matrix) {
      matrixCell.addRow(_.map(items, 'metadata'));
    }

    const [count, total] = this.clearMatrixCell(matrixCell);

    this.toastService.add({
      severity: 'info',
      summary: 'Cut complete',
      detail: `Cut complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  pasteCells(clipboardData: ClipboardData<TableCell>) {
    let matrix: MatrixCell;

    if (this.tableService.layoutProps.column.selection) {
      const columnSelection = this.tableService.layoutProps.column.selection;

      const itr = columnSelection.values();
      let currIdx = itr.next().value;
      let nextIdx = itr.next().value;
      let isSequence = true;

      while (nextIdx) {
        if (currIdx !== nextIdx - 1) {
          isSequence = false;
          break;
        }

        currIdx = itr.next().value;
        nextIdx = itr.next().value;
      }

      if (!isSequence) {
        this.toastService.add({
          severity: 'info',
          summary: 'Paste failed',
          detail: `Not support non-sequence column paste`,
          life: 3000,
        });
        return;
      }

      const arr = [...columnSelection];
      const startIdx = arr[0];
      const endIdx = arr[arr.length - 1];

      matrix = this.getCells(
        { rowIndex: 0, columnIndex: startIdx },
        { rowIndex: this.tableRowService.getLastRowIndex(), columnIndex: endIdx },
        UNPASTEABLE_DATA_TYPES,
        [ExcludeCellState.NonEditable],
      );
    } else {
      const cellSelection = this.tableService.layoutProps.cell.selection;

      if (!cellSelection) return;

      if (
        cellSelection.rowCount !== clipboardData.rowCount ||
        cellSelection.columnCount !== clipboardData.columnCount
      ) {
        const rowCount = Math.max(cellSelection.rowCount, clipboardData.rowCount);
        const columnCount = Math.max(cellSelection.columnCount, clipboardData.columnCount);
        const startIdx = { ...cellSelection.start };
        const endIdx = {
          rowIndex: startIdx.rowIndex + rowCount - 1,
          columnIndex: startIdx.columnIndex + columnCount - 1,
        };

        matrix = this.filterExcludeCells(
          this.selectCells(startIdx, endIdx),
          UNPASTEABLE_DATA_TYPES,
          [ExcludeCellState.NonEditable],
        );
      } else {
        matrix = this.getCells(cellSelection.start, cellSelection.end, UNPASTEABLE_DATA_TYPES, [
          ExcludeCellState.NonEditable,
        ]);
      }
    }

    if (!matrix) return;

    const values = matrix.values();
    let count = 0;
    let total = 0;

    for (let i = 0; i < matrix.rowCount; i++) {
      const cells = values[i];
      const clipboardItems = clipboardData.matrix[i % clipboardData.rowCount];
      const newData: any = {};

      let rawData: any;
      let row: TableRow;

      for (let j = 0; j < matrix.columnCount; j++) {
        const cell = cells[j];

        if (!cell) continue;

        const column = cell.column;
        const clipboardItem = clipboardItems[j % clipboardData.columnCount];

        if (!clipboardItem || (!clipboardItem?.text && column.field.required)) {
          continue;
        }

        const data = parseClipboardItemToData(column, clipboardItem);

        if (data === undefined) {
          rawData ||= {};
          rawData[column.id] = cell.row.data[column.id];
        }

        row = cell.row;

        newData[column.id] = data;

        count++;

        this.markColumnAsInteracted(column);
      }

      if (row) {
        this.markCellDataAsEdited(row, newData, rawData, TableCellActionType.Paste);
      }
    }

    total = matrix.count;

    this.emitCellDataAsEdited();

    this.toastService.add({
      severity: 'info',
      summary: 'Paste complete',
      detail: `Paste complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  clearCells(matrixCell: MatrixCell) {
    const [count, total] = this.clearMatrixCell(matrixCell);
    this.toastService.add({
      severity: 'info',
      summary: 'Clear complete',
      detail: `Clear complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  fillCells(source: [CellIndex, CellIndex], target: [CellIndex, CellIndex], isReverse: boolean) {
    const targetMatrixCell = this.filterExcludeCells(
      this.getCells(target[0], target[1]),
      undefined,
      [ExcludeCellState.NonEditable],
    );
    const sourceMatrixCell = this.getCells(source[0], source[1]);
    const sourceValues = sourceMatrixCell.values();
    const targetValues = targetMatrixCell.values();

    if (isReverse) {
      sourceValues.reverse();
      targetValues.reverse();
    }

    const sourceData = {};

    for (let i = 0; i < sourceMatrixCell.rowCount; i++) {
      const cells = sourceValues[i];

      sourceData[i] ||= {};

      for (let j = 0; j < sourceMatrixCell.columnCount; j++) {
        const { row, column } = cells[j];

        let data = row.data[column.id];

        try {
          if (isEmpty(data)) {
            data = null;
            throw new Error();
          }

          const dataType = column.field.dataType;

          switch (dataType) {
            case NumberField.dataType: {
              const prev = sourceData[i - 1]?.[j];

              let metadata = prev?.metadata;

              if (metadata) {
                metadata = { ...metadata };
                metadata.index += 1;
                metadata.data.push(data);
                metadata.range.push(metadata.index);
              } else {
                let step = isReverse ? -1 : 1;

                metadata = {
                  index: 0,
                  data: [data],
                  range: [0],
                  step,
                };
              }

              sourceData[i][j] = {
                data,
                metadata,
                isNumber: true,
              };

              break;
            }
            case DateField.dataType: {
              const prev = sourceData[i - 1]?.[j];

              let metadata: any;

              if (!isDayjs(data)) {
                data = dayjs(data);
              }

              if (prev) {
                metadata = prev.metadata;

                if (metadata) {
                  const prevStep = metadata.step;

                  if (prevStep !== undefined) {
                    metadata.step = Math.floor((data - prev.data) / 1000 / 60 / 60 / 24);

                    if (prevStep !== null && prevStep !== metadata.step) {
                      delete metadata.step;
                      delete metadata.last;
                    } else {
                      metadata.last = data;
                    }
                  }
                }
              } else {
                metadata = { step: null };
              }

              sourceData[i][j] = {
                data,
                metadata,
                isDate: true,
              };

              break;
            }
            default:
              throw new Error();
          }
        } catch {
          sourceData[i][j] = { data };
        }
      }
    }

    for (let i = 0; i < targetMatrixCell.rowCount; i++) {
      const targetCells = targetValues[i];
      const pos = i + 1;
      const page = Math.ceil(pos / sourceMatrixCell.rowCount);
      const fillData = sourceData[i % sourceMatrixCell.rowCount];
      const newData: any = {};

      let row: TableRow;

      for (let j = 0; j < targetMatrixCell.columnCount; j++) {
        const targetCell = targetCells[j];

        if (!targetCell) continue;

        row = targetCell.row;

        const column = targetCell.column;
        const fD = fillData[j % targetMatrixCell.columnCount];

        let data = fD.data;

        if (data !== null) {
          if (fD.isNumber) {
            if (fD.metadata.range.length > 1) {
              data = FORECAST(
                fD.metadata.index + page * fD.metadata.range.length,
                fD.metadata.data,
                fD.metadata.range,
              );
              data = parseFloat(data.toFixed(2));
            } else {
              data += page * fD.metadata.step;
            }
          } else if (fD.isDate) {
            if (fD.metadata && fD.metadata.step !== undefined && fD.metadata.last !== undefined) {
              data = fD.metadata.last.clone();
              data.add(pos * fD.metadata.step, 'd');
            } else {
              data = data.clone();
            }
          }
        }

        newData[column.id] = data;

        this.markColumnAsInteracted(column);
      }

      if (row) {
        this.markCellDataAsEdited(row, newData, undefined, TableCellActionType.Fill);
      }
    }

    this.emitCellDataAsEdited();

    this.toastService.add({
      severity: 'info',
      summary: 'Fill complete',
      life: 3000,
    });
  }

  moveToCell(direction: Direction) {
    const selectingIdx = this.tableService.layoutProps.cell.selection?.primary;

    if (!selectingIdx) return;

    let { rowIndex, columnIndex } = selectingIdx;

    switch (direction) {
      case 'above':
        rowIndex--;
        break;
      case 'below':
        rowIndex++;
        break;
      case 'before':
        columnIndex--;
        break;
      case 'after':
        columnIndex++;
        break;
    }

    const index = { rowIndex, columnIndex };

    if (!this.checkCellIndexValid(index)) {
      return;
    }

    this.selectCells(index, index, true);
  }

  extendSelectedCells(direction: Direction, step = 1) {
    const selectingIdx = this.tableService.layoutProps.cell.selection?.primary;

    if (!selectingIdx) return;

    let startIdx = { ...selectingIdx };
    let endIdx = { ...selectingIdx };

    const selection = this.tableService.layoutProps.cell.selection;

    if (selection) {
      startIdx = { ...selection.start };
      endIdx = { ...selection.end };
    }

    switch (direction) {
      case 'above':
        if (startIdx.rowIndex < selectingIdx.rowIndex) {
          startIdx.rowIndex -= step;
        } else {
          endIdx.rowIndex -= step;
        }
        break;
      case 'below':
        if (startIdx.rowIndex < selectingIdx.rowIndex) {
          startIdx.rowIndex += step;
        } else {
          endIdx.rowIndex += step;
        }
        break;
      case 'before':
        if (startIdx.columnIndex < selectingIdx.columnIndex) {
          startIdx.columnIndex -= step;
        } else {
          endIdx.columnIndex -= step;
        }
        break;
      case 'after':
        if (startIdx.columnIndex < selectingIdx.columnIndex) {
          startIdx.columnIndex += step;
        } else {
          endIdx.columnIndex += step;
        }
        break;
    }

    if (!this.checkCellIndexValid(startIdx) || !this.checkCellIndexValid(endIdx)) {
      return;
    }

    this.selectCells(startIdx, endIdx, true, true);
  }

  getCellOffset(index: CellIndex): CellOffset {
    if (this.tableGroupService.isGrouping()) {
      return this.tableGroupService.getRowCellOffsetInGroup(index);
    }

    const left = _getColumnOffset(this.tableColumnService.findColumnByIndex(index.columnIndex));
    const top = index.rowIndex * this.tableRowService.rowHeight();

    return { left, top };
  }

  findCellIndex(cell: TableCell): CellIndex {
    return {
      rowIndex: this.tableRowService.findRowIndex(cell.row),
      columnIndex: this.tableColumnService.findColumnIndex(cell.column),
    };
  }

  findCellByIndex(index: CellIndex): TableCell {
    return {
      row: this.tableRowService.findRowByIndex(index.rowIndex),
      column: this.tableColumnService.findColumnByIndex(index.columnIndex),
    };
  }

  findCellElementByIndex(index: CellIndex): HTMLElement {
    const rowIdxAttr = `[data-row-index="${index.rowIndex}"]`;
    const columnIdxAttr = `[data-column-index="${index.columnIndex}"]`;

    return this.eleRef.nativeElement.querySelector(`${rowIdxAttr}${columnIdxAttr}`);
  }

  findCellByElement(element: HTMLElement, cellType?: string): CellIndex {
    const cell = element.closest(cellType ? `[cell-type="${cellType}"]` : '[cell-type]');
    if (!cell) return null;
    const rowIndex = parseFloat(cell.getAttribute('data-row-index'));
    const columnIndex = parseFloat(cell.getAttribute('data-column-index'));
    return { rowIndex, columnIndex };
  }

  compareCell(source: TableCell, destination: TableCell): boolean {
    return source.row.id === destination.row.id && source.column.id === source.column.id;
  }

  compareCellIndex(
    { rowIndex: sRIdx, columnIndex: sCIdx }: CellIndex,
    { rowIndex: dRIdx, columnIndex: dCIdx }: CellIndex,
  ): -1 | 0 | 1 {
    if (sRIdx < dRIdx) {
      return -1;
    } else if (sRIdx > dRIdx) {
      return 1;
    }

    if (sCIdx < dCIdx) {
      return -1;
    } else if (sCIdx > dCIdx) {
      return 1;
    }

    return 0;
  }

  protected getInteractiveCells(
    excludeDataTypes?: DataType[],
    excludeStates?: ExcludeCellState[],
  ): MatrixCell | null {
    let matrix: MatrixCell;

    if (this.tableRowService.selectedRows.size) {
      const cells: TableCell[] = [];
      for (const row of this.tableRowService.selectedRows) {
        for (const column of this.tableColumnService.columns()) {
          cells.push({ row, column });
        }
      }
      matrix = new MatrixCell(cells);
    } else if (this.tableService.layoutProps.column.selection) {
      const cells: TableCell[] = [];
      for (const row of this.tableRowService.rows()) {
        for (const columnIdx of this.tableService.layoutProps.column.selection) {
          const column = this.tableColumnService.findColumnByIndex(columnIdx);
          cells.push({ row, column });
        }
      }
      matrix = new MatrixCell(cells);
    } else if (this.tableService.layoutProps.cell.selection) {
      matrix = this.getCells(
        this.tableService.layoutProps.cell.selection.start,
        this.tableService.layoutProps.cell.selection.end,
      );
    }

    if (!matrix) return null;

    return excludeDataTypes?.length || excludeStates?.length
      ? this.filterExcludeCells(matrix, excludeDataTypes, excludeStates)
      : matrix;
  }

  copyInteractiveCells(clipboard: Clipboard) {
    const matrixCell = this.getInteractiveCells(clipboard.isCutAction && UNCUTABLE_DATA_TYPES);

    if (!matrixCell?.count) return;

    const matrix: ClipboardItem[][] = [];
    let count = 0;

    for (const cells of matrixCell.values()) {
      const items = [];

      for (const cell of cells) {
        if (!cell) continue;

        const { row, column } = cell;

        let data = row.data?.[column.id];
        let text = '';

        if (!isEmpty(data)) {
          data = _.cloneDeep(data);
          text = column.field.toString(data);
        }

        items.push({
          text,
          data,
          metadata: cell,
        });

        count++;
      }

      matrix.push(items);
    }

    clipboard.write(matrix as any);

    this.toastService.add({
      severity: 'success',
      summary: clipboard.isCutAction ? 'Cut Success' : 'Copy Success',
      detail: `Copied ${count} of ${matrixCell.count} cells`,
      life: 3000,
    });
  }

  clearInteractiveCells() {
    const matrix = this.getInteractiveCells();

    if (!matrix?.count) return;

    this.clearCells(matrix);
  }

  updateCellsData(rows: TableRow[], newData: TableRowCellData) {
    for (const columnID in newData) {
      this.markColumnAsInteracted(this.tableColumnService.findColumnByID(columnID));
    }

    for (const row of rows) {
      this.markCellDataAsEdited(row, newData);
    }

    this.emitCellDataAsEdited();
  }

  searchCellPredicate(row: TableRow, column: TableColumn): string {
    return row.data?.[column.id] ?? '';
  }

  private clearMatrixCell(matrixCell: MatrixCell): [number, number] {
    matrixCell = this.filterExcludeCells(matrixCell, UNCLEARABLE_DATA_TYPES, [
      ExcludeCellState.Required,
      ExcludeCellState.Empty,
      ExcludeCellState.NonEditable,
    ]);

    let count = 0;

    for (const cells of matrixCell.values()) {
      const newData: TableRowCellData = {};

      let row: TableRow;

      for (const cell of cells) {
        if (!cell) continue;

        row = cell.row;

        const column = cell.column;

        let data = null;

        switch (column.field.dataType) {
          case DataType.Checkbox:
            data ||= false;
            break;
        }

        newData[column.id] = data;

        this.markColumnAsInteracted(column);

        count++;
      }

      if (row) {
        this.markCellDataAsEdited(row, newData, undefined, TableCellActionType.Clear);
      }
    }

    this.emitCellDataAsEdited();

    return [count, matrixCell.count];
  }

  private scrollToCellByIndex(index: CellIndex) {
    const { rowIndex, columnIndex } = index;

    if (rowIndex === -1 || columnIndex === -1 || _.isNil(rowIndex) || _.isNil(columnIndex)) {
      return;
    }

    const { left: cellOffsetLeft, top: cellOffsetTop } = this.getCellOffset(index);
    const { scrollLayout, scrollLeft, scrollTop, viewport } = this.host.virtualScroll;

    const horizontalTrackOffsetX = scrollLayout.horizontal.track.offset.x;
    const { width: cellWidth } = this.tableColumnService.findColumnByIndex(columnIndex);
    let left = scrollLeft;

    if (cellOffsetLeft >= horizontalTrackOffsetX) {
      if (cellOffsetLeft - horizontalTrackOffsetX < scrollLeft) {
        left -= scrollLeft - cellOffsetLeft + horizontalTrackOffsetX;
      } else if (cellOffsetLeft + cellWidth > scrollLeft + viewport.width) {
        left += cellOffsetLeft + cellWidth - (scrollLeft + viewport.width);
      }
    }

    const verticalTrackOffsetY = scrollLayout.vertical.track.offset.y;
    const cellHeight = this.tableRowService.rowHeight();
    let top = scrollTop;

    if (cellOffsetTop >= verticalTrackOffsetY) {
      if (cellOffsetTop - verticalTrackOffsetY < scrollTop) {
        top -= scrollTop - cellOffsetTop + verticalTrackOffsetY - Dimension.BodyVerticalPadding;
      } else if (cellOffsetTop + cellHeight > scrollTop + viewport.height) {
        top +=
          cellOffsetTop +
          cellHeight -
          (scrollTop + viewport.height) +
          Dimension.BodyVerticalPadding;
      }
    }

    this.host.virtualScroll.scrollTo({ left, top });
  }

  private checkCellIndexValid({ rowIndex, columnIndex }: CellIndex): boolean {
    if (rowIndex < 0) {
      return false;
    } else {
      const lastRowIndex = this.tableRowService.getLastRowIndex();

      if (rowIndex > lastRowIndex) {
        return false;
      }
    }

    if (columnIndex < 0) {
      return false;
    } else {
      const lastColumnIndex = this.tableColumnService.getLastColumnIndex();

      if (columnIndex > lastColumnIndex) {
        return false;
      }
    }

    return true;
  }

  private markColumnAsInteracted(column: TableColumn) {
    this.interactedColumns ||= new Set();

    if (this.interactedColumns.has(column)) {
      return;
    }

    this.interactedColumns.add(column);
  }

  private markCellDataAsEdited(
    row: TableRow,
    newData: TableRowCellData,
    rawData: TableRowCellData = newData,
    type: TableCellActionType = TableCellActionType.Edit,
  ) {
    row.data = { ...row.data, ...rawData };

    if (this.tableRowService.isDraftRow(row)) {
      this.interactedColumns?.clear();
      return;
    }

    let event = this.dataEditedEEC.getEvent(row.id);

    if (event) {
      event.payload.newData = { ...event.payload.newData, ...newData };
    } else {
      event = { type, payload: { row, newData } };
    }

    this.dataEditedEEC.addEvent(row.id, event);
  }

  private emitCellDataAsEdited() {
    this.dataEditedEEC.emit();
  }

  private emitCellAsSelected = _.debounce((selectedCells: TableCell[]) => {
    this.host.cellAction.emit({
      type: TableCellActionType.Select,
      payload: selectedCells,
    });
  }, 200);

  private filterExcludeCells(
    matrix: MatrixCell,
    excludeDataTypes: DataType[],
    excludeStates: ExcludeCellState[],
  ): MatrixCell {
    const excludeDataTypeSet = new Set<DataType>(excludeDataTypes);
    const excludeRequired = _.includes(excludeStates, ExcludeCellState.Required);
    const excludeEmpty = _.includes(excludeStates, ExcludeCellState.Empty);
    const excludeNonEditable = _.includes(excludeStates, ExcludeCellState.NonEditable);

    for (const cells of matrix.values()) {
      for (let i = 0; i < cells.length; i++) {
        const { row, column } = cells[i];

        if (
          (!excludeDataTypeSet.size || !excludeDataTypeSet.has(column.field.dataType)) &&
          (!excludeRequired || !column.field.required) &&
          (!excludeEmpty ||
            (column.field.dataType === DataType.Checkbox
              ? row.data?.[column.id] === true
              : !isEmpty(row.data?.[column.id]))) &&
          (!excludeNonEditable ||
            this.tableService.config().column.editable ||
            this.tableService.config().row.editable ||
            column.editable ||
            row.editable === true ||
            row.editable?.[column.id] === true)
        ) {
          continue;
        }

        cells[i] = null;
      }
    }

    return matrix;
  }

  private openErrorTooltip(target: HTMLElement, key: string) {
    let message: string;
    switch (key) {
      case FieldValidationKey.Required:
        message = 'This field is required.';
        break;
      case FieldValidationKey.Pattern:
        message = 'The value does not match the required format.';
        break;
      case FieldValidationKey.Min:
        message = 'The value is too small.';
        break;
      case FieldValidationKey.Max:
        message = 'The value is too large.';
        break;
      default:
        message = 'An error has occurred.';
    }
    this.cellError = { target, message };
  }

  private closeErrorTooltip() {
    this.cellError = null;
  }
}
