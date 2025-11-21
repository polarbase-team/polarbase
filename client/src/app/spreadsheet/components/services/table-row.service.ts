import _ from 'lodash';
import { MenuItem } from 'primeng/api';
import { ChangeDetectorRef, DestroyRef, inject, Injectable, SimpleChanges } from '@angular/core';
import { EmitEventController } from '../../helpers/emit-event-controller';
import { Dimension } from './table.service';
import type { Column } from './table-column.service';
import type { Group } from './table-group.service';
import { type CellIndex, type TableCellAction, TableCellActionType } from './table-cell.service';
import { debounceTime, distinctUntilChanged, filter, map, pairwise } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragEnd, CdkDragMove, CdkDragStart, Point } from '@angular/cdk/drag-drop';
import { TableBaseService } from './table-base.service';

function flushEEC(
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

type FoundRow = {
  rowIndex: number;
  rowOffset: number;
  group?: Group;
};

interface TableRowAddedEvent {
  row: Row;
  insertedIndex: number;
}
interface TableRowMovedEvent {
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

@Injectable()
export class TableRowService extends TableBaseService {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _cdRef = inject(ChangeDetectorRef);

  rowActionItems: MenuItem[] | undefined;
  draftRow: Row;
  bkRows: Row[];
  selectedRows = new Set<Row>();
  protected draggingRows = new Set<Row>();

  private _rowLookup = new Map<Row['id'], Row>();
  private _addedEEC: EmitEventController<Row['id'], TableRowAddedEvent> = new EmitEventController({
    autoEmit: false,
    onEmitted: (events) => {
      this.host.rowAction.emit({ type: TableRowActionType.Add, payload: events });
    },
  });

  get rowHeight(): number {
    return RowSize[this.host.config.row.size];
  }

  get canAddRow(): boolean {
    return (
      this.host.config.row.creatable &&
      (!this.tableGroupService.isGrouping || !this.tableGroupService.disableAddRowInGroup)
    );
  }

  get canDeleteSelectedRows(): boolean {
    return !Array.from(this.selectedRows).find((row) => !!row.deletable === false);
  }

  override onChanges(changes: SimpleChanges) {
    if ('rawRows' in changes) {
      this.host.rows = this.host.rawRows ? [...this.host.rawRows] : [];
      this.initRows(this.host.rows);
    }
  }

  override onInit() {
    this.host.cellAction
      .pipe(
        filter(
          (event): event is Extract<TableCellAction, { type: typeof TableCellActionType.Select }> =>
            event.type === TableCellActionType.Select,
        ),
        map(({ payload }: { payload: Row[] }) => payload?.[0] || null),
        distinctUntilChanged(),
        pairwise(),
        debounceTime(0),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(([_oldRow, newRow]) => {
        flushEEC(this._addedEEC, newRow, ({ row }) => row.id);
      });

    this.host.rowAction
      .pipe(
        filter(
          (event): event is Extract<TableRowAction, { type: typeof TableRowActionType.Add }> =>
            event.type === TableRowActionType.Add,
        ),
        map(({ payload }) => {
          return (payload as { row: Row }[]).map((e) => e.row);
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((rows) => {
        for (const row of rows) {
          if (this.checkRowIsDraft(row)) {
            this.draftRow = null;
            break;
          }
        }
        this.markRowsAsChanged();
        this.tableService.handleDataUpdate();
      });
  }

  override onDestroy() {
    this._addedEEC.flush();
  }

  override updateStates() {
    this.state.rowHeight = this.rowHeight;
    this.state.canAddRow = this.canAddRow;
    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
  }

  initRows(rows: Row[]) {
    this.selectedRows.clear();
    this._rowLookup.clear();

    for (const row of rows) {
      if (!('_isInit' in row && (row as any)._isInit)) {
        (row as any)._isInit = true;
        row.id ||= _.uniqueId();
      }
      if (row.selected) this.selectedRows.add(row);
      this._rowLookup.set(row.id, row);
    }

    this.tableService.handleDataUpdate();
    this._cdRef.markForCheck();
  }

  pushRows(rows: Row[]) {
    this.host.rawRows = this.host.rawRows ? [...this.host.rawRows, ...rows] : rows;
    this.host.rows = [...this.host.rawRows];

    for (const row of rows) {
      if (!('_isInit' in row && (row as any)._isInit)) {
        (row as any)._isInit = true;
        row.id ||= _.uniqueId();
      }
      if (row.selected) this.selectedRows.add(row);
      this._rowLookup.set(row.id, row);
    }

    this.tableService.handleDataUpdate();
    this._cdRef.markForCheck();
  }

  updateRows(rows: Row[], shouldCheckSelectedState?: boolean) {
    if (shouldCheckSelectedState) {
      for (const row of rows) {
        row.selected ? this.selectedRows.add(row) : this.selectedRows.delete(row);
      }
    }
    this.tableService.handleDataUpdate();
    this._cdRef.markForCheck();
  }

  setRowSize(size: RowSize) {
    this.host.config.row.size = size;
    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.markGroupAsChanged();
    }
    this.host.updateStates();
    this._cdRef.markForCheck();
  }

  addRow(group?: Group) {
    if (!this.canAddRow) return;
    this.tableGroupService.isGrouping
      ? this.tableGroupService.createRowInGroup(group)
      : this.createRow();
    this._cdRef.markForCheck();
  }

  flushAddedEEC() {
    this._addedEEC.flush();
  }

  openRowActionMenu(e: Event, row: Row, rowIndex: number) {
    const items: MenuItem[] = [];

    if (this.selectedRows?.size > 1) {
      items.push({
        label: 'Delete selected rows',
        icon: 'pi pi-trash',
        command: () => {
          this.deleteSelectedRows();
        },
      });
    } else {
      if (this.host.config.row.expandable) {
        items.push({
          label: 'Expand',
          icon: 'pi pi-external-link',
          command: () => {
            this.expandRow(row);
          },
        });
        items.push({ separator: true });
      }
      if (this.host.config.row.insertable) {
        items.push({
          label: 'Insert row above',
          icon: 'pi pi-arrow-up',
          command: () => {
            this.createRow(null, rowIndex);
          },
        });
        items.push({
          label: 'Insert row below',
          icon: 'pi pi-arrow-down',
          command: () => {
            this.createRow(null, rowIndex + 1);
          },
        });
        items.push({ separator: true });
      }
      if (this.host.config.row.deletable) {
        items.push({
          label: 'Delete',
          icon: 'pi pi-trash',
          command: () => {
            this.deleteRow(row);
          },
        });
      }
    }

    this.rowActionItems = items;
    this.host.rowActionMenu.show(e);
  }

  onRowDragStarted(e: CdkDragStart<Row>) {
    this.tableCellService.deselectAllCells();
    const draggingRow = e.source.data;
    this.draggingRows.add(draggingRow);

    if (!draggingRow.selected) return;

    for (const row of this.selectedRows) {
      this.draggingRows.add(row);
    }
  }

  onRowDragMoved(e: CdkDragMove<Row>) {
    const foundRow = this.findRowAtPointerPosition(e.pointerPosition);
    let group;
    let rowIndex;
    let rowOffset;
    if (foundRow) {
      group = foundRow.group;
      rowIndex = foundRow.rowIndex;
      rowOffset =
        foundRow.rowOffset +
        Dimension.HeaderHeight +
        Dimension.BodyVerticalPadding -
        this.host.virtualScroll.scrollTop -
        2;
    }
    this.tableService.layoutProps.row.dragOverGroup = group;
    this.tableService.layoutProps.row.dragPlaceholderIndex = rowIndex;
    this.tableService.layoutProps.row.dragPlaceholderOffset = rowOffset;
  }

  onRowDragEnded(e: CdkDragEnd<Row>) {
    const { dragPlaceholderIndex } = this.tableService.layoutProps.row;
    if (dragPlaceholderIndex === null) return;
    const currentIndex = dragPlaceholderIndex;

    if (_.isFinite(currentIndex)) {
      const droppedRows = [...this.draggingRows];
      this.moveRows(droppedRows, currentIndex);
      if (this.tableGroupService.isGrouping) {
        const targetGroup = this.tableService.layoutProps.row.dragOverGroup;
        this.tableGroupService.moveRowsInGroup(droppedRows, currentIndex, targetGroup);
      }
    }

    e.source.reset();

    this.tableService.layoutProps.row.dragPlaceholderIndex =
      this.tableService.layoutProps.row.dragOverGroup = null;
    this.draggingRows.clear();
  }

  protected expandRow(row: Row) {
    this.host.rowAction.emit({ type: TableRowActionType.Expand, payload: row });
  }

  expandSelectingRow() {
    const selecting = this.tableService.layoutProps.cell.selection?.primary;
    if (!selecting) return;
    this.expandRow(this.findRowByIndex(selecting.rowIndex));
  }

  createRow(data?: any, position?: number, onBeforeInsert?: (r: Row, p: number) => void) {
    const newRow = this._generateRow({ data });
    onBeforeInsert?.(newRow, position);

    this._insertRow(newRow, position, true);
    this._addedEEC.addEvent(newRow.id, { row: newRow, insertedIndex: position });
    return newRow;
  }

  protected async deleteSelectedRows() {
    let canDeleteRows = this.getSelectedRows();
    if (!canDeleteRows.length) return;

    if (this.selectedRows.size) {
      this.selectedRows = new Set(_.pull([...this.selectedRows], ...canDeleteRows));
    } else {
      this.tableCellService.deselectAllCells();
    }

    this._removeRows(canDeleteRows);
    this.host.rowAction.emit({ type: TableRowActionType.Delete, payload: canDeleteRows });
    this.tableService.calculate();
  }

  protected async deleteRow(row: Row) {
    this.tableCellService.deselectAllCells();
    this._removeRows([row]);
    this.host.rowAction.emit({ type: TableRowActionType.Delete, payload: [row] });
    this.tableService.calculate();
  }

  toggleRow(row: Row) {
    this.tableCellService.deselectAllCells();
    this.tableColumnService.deselectAllColumns();

    row.selected = !row.selected;

    this.selectedRows.has(row) ? this.selectedRows.delete(row) : this.selectedRows.add(row);

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: [...this.selectedRows] });
  }

  flushDraftRow() {
    if (!this.draftRow) return;

    this.tableCellService.deselectAllCells();

    this._addedEEC.emitEvent(this.draftRow.id);

    this.draftRow = null;
  }

  cancelDraftRow() {
    if (!this.draftRow) return;

    this.tableCellService.deselectAllCells();

    this._removeRows([this.draftRow], true);

    this._addedEEC.removeEvent(this.draftRow.id);

    this.draftRow = null;
  }

  selectAllRows() {
    this.tableCellService.deselectAllCells();
    this.tableColumnService.deselectAllColumns();

    this.selectedRows.clear();

    for (const row of this.host.rows) {
      row.selected = true;
      this.selectedRows.add(row);
    }

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: [...this.selectedRows] });
  }

  deselectAllRows() {
    this.host.rowActionMenu.hide();

    if (!this.selectedRows.size) return;

    for (const row of this.selectedRows) {
      row.selected = false;
    }

    this.selectedRows.clear();

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: null });
  }

  protected moveRows(movedRows: Row[], movedIndex: number) {
    let newMovedIndex = movedIndex;
    for (const movedRow of movedRows) {
      const idx = this.findRowIndex(movedRow);
      if (idx < 0 || idx >= movedIndex) {
        continue;
      }
      newMovedIndex--;
    }

    _.pull(this.host.rows, ...movedRows);
    this.host.rows.splice(newMovedIndex, 0, ...movedRows);

    this.markRowsAsChanged();

    this.host.rowAction.emit({
      type: TableRowActionType.Move,
      payload: movedRows.map((movedRow) => ({ row: movedRow, movedIndex })),
    });
  }

  protected getSelectedRows(): Row[] {
    const selectedRows = [...this.selectedRows];

    if (!selectedRows.length) {
      const { selection } = this.tableService.layoutProps.cell;
      const startIndex = selection.start.rowIndex;
      const endIndex = startIndex + selection.rowCount;

      for (let i = startIndex; i < endIndex; i++) {
        selectedRows.push(this.findRowByIndex(i));
      }
    }

    return selectedRows;
  }

  getLastRowIndex(): number {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.getLastRowIndexInGroup()
      : this.host.rows.length - 1;
  }

  protected findRowAtPointerPosition(pointerPosition: Point): FoundRow {
    if (this.tableGroupService.isGrouping) {
      return this.tableGroupService.findRowInGroupAtPointerPosition(pointerPosition);
    }

    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;

    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) {
      return null;
    }

    const startOffset = 0;
    const endOffset = startOffset + this.host.rows.length * this.rowHeight;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) {
      return null;
    }

    const index = Math.round((pointerOffsetY - startOffset) / this.rowHeight);

    return {
      rowIndex: index,
      rowOffset: startOffset + index * this.rowHeight,
    };
  }

  findRowByIndex(index: number): Row {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowInGroupByIndex(index)
      : this.host.rows[index];
  }

  findRowByID(id: Row['id']): Row {
    return this._rowLookup.has(id) ? this._rowLookup.get(id) : _.find(this.host.rows, { id });
  }

  findRowIndex(row: Row): number {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowIndexInGroup(row)
      : _.indexOf(this.host.rows, row);
  }

  findRowIndexByID(id: Row['id']): number {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowIndexInGroupByID(id)
      : _.findIndex(this.host.rows, { id });
  }

  protected markRowsAsChanged(rows: Row[] = this.host.rows, slient: boolean = false) {
    this.host.rows = [...rows];

    if (slient) return;

    if (this.host.rawRows) {
      this.host.rawRows.length = 0;
      this.host.rawRows.push(...rows);
      rows = this.host.rawRows;
    } else {
      rows = this.host.rows;
    }
  }

  markRowsAsStreamed(rows: Row[]) {
    for (const row of rows) {
      (row as any)._isStreamed = true;
    }
  }

  checkRowIsDraft(row: Row): boolean {
    return this.draftRow === row;
  }

  private _generateRow(extra?: Partial<Row>): Row {
    return _.cloneDeep({
      ...extra,
      id: _.uniqueId(),
      selected: false,
    }) as Row;
  }

  private _insertRow(row: any, position = this.host.rows?.length, slient = false) {
    this.draftRow = row;

    this.host.rows.splice(position, 0, row);
    this.markRowsAsChanged(this.host.rows, slient);

    // Resets the current selecting state
    // before select the inserted row.
    this.tableService.layoutProps.cell.selection = null;

    setTimeout(() => {
      const cellIndex: CellIndex = {
        rowIndex: this.findRowIndex(row),
        columnIndex: 0,
      };

      this.tableCellService.selectCells(cellIndex, cellIndex, true);

      this._cdRef.detectChanges();

      setTimeout(() => {
        this._focusToFieldCellTouchable(true);
      }, 17);
    });
  }

  private _removeRows(rows: Row[], slient: boolean = false) {
    this.markRowsAsChanged(_.pull(this.host.rows, ...rows), slient);

    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.deleteRowsInGroup(rows);
    }
  }

  private _focusToFieldCellTouchable(retry: boolean = false) {
    if (!this.tableService.layoutProps.cell.selection) return;

    const fieldCell = this.tableCellService.findCellElementByIndex(
      this.tableService.layoutProps.cell.selection.primary,
    )?.firstElementChild;

    if (fieldCell) {
      fieldCell.dispatchEvent(new Event('dblclick'));
      return;
    }

    if (!retry) return;

    setTimeout(() => {
      this._focusToFieldCellTouchable();
    }, 500);
  }
}
