import _ from 'lodash';
import { Injectable, ChangeDetectorRef, DestroyRef, inject, signal, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragStart, CdkDragMove, CdkDragEnd, type Point } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, filter, map, pairwise } from 'rxjs';
import { MenuItem } from 'primeng/api';

import { EmitEventController } from '../utils/emit-event-controller';
import { Dimension } from './table.service';
import type { CellIndex } from './table-cell.service';
import { TableBaseService } from './table-base.service';
import { TableRow } from '../models/table-row';
import { TableGroup } from '../models/table-group';
import { TableRowAction, TableRowActionType, TableRowAddedEvent } from '../events/table-row';
import { TableCellAction, TableCellActionType } from '../events/table-cell';

function flushEEC(
  controller: EmitEventController<any, any>,
  row: TableRow,
  predicate: (event: any) => TableRow['id'],
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

type FoundRow = {
  rowIndex: number;
  rowOffset: number;
  group?: TableGroup;
};

@Injectable()
export class TableRowService extends TableBaseService {
  rows = signal<TableRow[]>([]);
  draftRow: TableRow;
  selectedRows = new Set<TableRow>();
  rowActionItems: MenuItem[] | undefined;

  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private draggingRows = new Set<TableRow>();
  private rowLookup = new Map<TableRow['id'], TableRow>();
  private addedEEC: EmitEventController<TableRow['id'], TableRowAddedEvent> =
    new EmitEventController({
      autoEmit: false,
      onEmitted: (events) => {
        this.host.rowAction.emit({ type: TableRowActionType.Add, payload: events });
      },
    });

  get rowHeight(): number {
    return RowSize[this.tableService.config().row.size];
  }

  get canAddRow(): boolean {
    return (
      this.tableService.config().row.creatable &&
      (!this.tableGroupService.isGrouping || !this.tableGroupService.disableAddRowInGroup)
    );
  }

  get canDeleteSelectedRows(): boolean {
    return !Array.from(this.selectedRows).find((row) => !!row.deletable === false);
  }

  constructor() {
    super();

    effect(() => {
      const rows = this.host.sourceRows();
      for (const row of rows) {
        if (!this.rowLookup.has(row.id)) {
          row.id ||= _.uniqueId();
        }
        if (row.selected) this.selectedRows.add(row);
        this.rowLookup.set(row.id, row);
      }

      this.tableService.handleDataUpdate();
      this.rows.update(() => rows);
    });
  }

  override onInit() {
    this.host.cellAction
      .pipe(
        filter(
          (event): event is Extract<TableCellAction, { type: typeof TableCellActionType.Select }> =>
            event.type === TableCellActionType.Select,
        ),
        map(({ payload }: { payload: TableRow[] }) => payload?.[0] || null),
        distinctUntilChanged(),
        pairwise(),
        debounceTime(0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([_oldRow, newRow]) => {
        flushEEC(this.addedEEC, newRow, ({ row }) => row.id);
      });

    this.host.rowAction
      .pipe(
        filter(
          (event): event is Extract<TableRowAction, { type: typeof TableRowActionType.Add }> =>
            event.type === TableRowActionType.Add,
        ),
        map(({ payload }) => {
          return (payload as { row: TableRow }[]).map((e) => e.row);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => {
        for (const row of rows) {
          if (this.checkRowIsDraft(row)) {
            this.draftRow = null;
            break;
          }
        }
        // this.markRowsAsChanged();
        this.tableService.handleDataUpdate();
      });
  }

  override onDestroy() {
    this.addedEEC.flush();
  }

  override updateStates() {
    this.state.rowHeight = this.rowHeight;
    this.state.canAddRow = this.canAddRow;
    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
  }

  // pushRows(rows: TableRow[]) {
  //   this.host.rawRows = this.host.rawRows ? [...this.host.rawRows, ...rows] : rows;
  //   this.rows() = [...this.host.rawRows];

  //   for (const row of rows) {
  //     if (!('_isInit' in row && (row as any)._isInit)) {
  //       (row as any)._isInit = true;
  //       row.id ||= _.uniqueId();
  //     }
  //     if (row.selected) this.selectedRows.add(row);
  //     this.rowLookup.set(row.id, row);
  //   }

  //   this.tableService.handleDataUpdate();
  //   this.cdr.markForCheck();
  // }

  // updateRows(rows: TableRow[], shouldCheckSelectedState?: boolean) {
  //   if (shouldCheckSelectedState) {
  //     for (const row of rows) {
  //       row.selected ? this.selectedRows.add(row) : this.selectedRows.delete(row);
  //     }
  //   }
  //   this.tableService.handleDataUpdate();
  //   this.cdr.markForCheck();
  // }

  flushAddedEEC() {
    this.addedEEC.flush();
  }

  onRowDragStarted(e: CdkDragStart<TableRow>) {
    this.tableCellService.deselectAllCells();
    const draggingRow = e.source.data;
    this.draggingRows.add(draggingRow);

    if (!draggingRow.selected) return;

    for (const row of this.selectedRows) {
      this.draggingRows.add(row);
    }
  }

  onRowDragMoved(e: CdkDragMove<TableRow>) {
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

  onRowDragEnded(e: CdkDragEnd<TableRow>) {
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

  setRowSize(size: RowSize) {
    this.tableService.config().row.size = size;
    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.markGroupAsChanged();
    }
  }

  expandRow(row: TableRow) {
    this.host.rowAction.emit({ type: TableRowActionType.Expand, payload: row });
  }

  expandSelectingRow() {
    const selecting = this.tableService.layoutProps.cell.selection?.primary;
    if (!selecting) return;
    this.expandRow(this.findRowByIndex(selecting.rowIndex));
  }

  addRow(group?: TableGroup) {
    if (!this.canAddRow) return;
    this.tableGroupService.isGrouping
      ? this.tableGroupService.createRowInGroup(group)
      : this.createRow();
    this.cdr.markForCheck();
  }

  createRow(data?: any, position?: number, onBeforeInsert?: (r: TableRow, p: number) => void) {
    const newRow = this._generateRow({ data });
    onBeforeInsert?.(newRow, position);

    this._insertRow(newRow, position, true);
    this.addedEEC.addEvent(newRow.id, { row: newRow, insertedIndex: position });
    return newRow;
  }

  deleteSelectedRows() {
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

  deleteRow(row: TableRow) {
    this.tableCellService.deselectAllCells();
    this._removeRows([row]);
    this.host.rowAction.emit({ type: TableRowActionType.Delete, payload: [row] });
    this.tableService.calculate();
  }

  toggleRow(row: TableRow) {
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

    this.addedEEC.emitEvent(this.draftRow.id);

    this.draftRow = null;
  }

  cancelDraftRow() {
    if (!this.draftRow) return;

    this.tableCellService.deselectAllCells();

    this._removeRows([this.draftRow]);

    this.addedEEC.removeEvent(this.draftRow.id);

    this.draftRow = null;
  }

  selectAllRows() {
    this.tableCellService.deselectAllCells();
    this.tableColumnService.deselectAllColumns();

    this.selectedRows.clear();

    for (const row of this.rows()) {
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

  moveRows(movedRows: TableRow[], movedIndex: number) {
    let newMovedIndex = movedIndex;
    for (const movedRow of movedRows) {
      const idx = this.findRowIndex(movedRow);
      if (idx < 0 || idx >= movedIndex) {
        continue;
      }
      newMovedIndex--;
    }

    _.pull(this.rows(), ...movedRows);
    this.rows().splice(newMovedIndex, 0, ...movedRows);

    // this.markRowsAsChanged();

    this.host.rowAction.emit({
      type: TableRowActionType.Move,
      payload: movedRows.map((movedRow) => ({ row: movedRow, movedIndex })),
    });
  }

  getSelectedRows(): TableRow[] {
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
      : this.rows().length - 1;
  }

  findRowAtPointerPosition(pointerPosition: Point): FoundRow {
    if (this.tableGroupService.isGrouping) {
      return this.tableGroupService.findRowInGroupAtPointerPosition(pointerPosition);
    }

    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;

    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) {
      return null;
    }

    const startOffset = 0;
    const endOffset = startOffset + this.rows().length * this.rowHeight;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) {
      return null;
    }

    const index = Math.round((pointerOffsetY - startOffset) / this.rowHeight);

    return {
      rowIndex: index,
      rowOffset: startOffset + index * this.rowHeight,
    };
  }

  findRowByIndex(index: number): TableRow {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowInGroupByIndex(index)
      : this.rows()[index];
  }

  findRowByID(id: TableRow['id']): TableRow {
    return this.rowLookup.has(id) ? this.rowLookup.get(id) : _.find(this.rows(), { id });
  }

  findRowIndex(row: TableRow): number {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowIndexInGroup(row)
      : _.indexOf(this.rows(), row);
  }

  findRowIndexByID(id: TableRow['id']): number {
    return this.tableGroupService.isGrouping
      ? this.tableGroupService.findRowIndexInGroupByID(id)
      : _.findIndex(this.rows(), { id });
  }

  markRowsAsStreamed(rows: TableRow[]) {
    for (const row of rows) {
      (row as any)._isStreamed = true;
    }
  }

  checkRowIsDraft(row: TableRow): boolean {
    return this.draftRow === row;
  }

  openRowActionMenu(e: Event, row: TableRow, rowIndex: number) {
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
      items.push(
        {
          label: 'Change row size',
          icon: 'pi pi-bars',
          items: [
            {
              label: 'Small',
              command: () => {
                this.setRowSize('S');
              },
            },
            {
              label: 'Medium',
              command: () => {
                this.setRowSize('M');
              },
            },
            {
              label: 'Large',
              command: () => {
                this.setRowSize('L');
              },
            },
            {
              label: 'X-Large',
              command: () => {
                this.setRowSize('XL');
              },
            },
          ],
        },
        { separator: true },
      );
      if (this.tableService.config().row.expandable) {
        items.push(
          {
            label: 'Expand',
            icon: 'pi pi-external-link',
            command: () => {
              this.expandRow(row);
            },
          },
          { separator: true },
        );
      }
      if (this.tableService.config().row.insertable) {
        items.push(
          {
            label: 'Insert row above',
            icon: 'pi pi-arrow-up',
            command: () => {
              this.createRow(null, rowIndex);
            },
          },
          {
            label: 'Insert row below',
            icon: 'pi pi-arrow-down',
            command: () => {
              this.createRow(null, rowIndex + 1);
            },
          },
          { separator: true },
        );
      }
      if (this.tableService.config().row.deletable) {
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

  private _generateRow(extra?: Partial<TableRow>) {
    return _.cloneDeep({
      ...extra,
      id: _.uniqueId(),
      selected: false,
    }) as TableRow;
  }

  private _insertRow(row: any, position = this.rows()?.length, slient = false) {
    this.draftRow = row;

    this.rows().splice(position, 0, row);
    // this.markRowsAsChanged(this.rows(), slient);

    // Resets the current selecting state
    // before select the inserted row.
    this.tableService.layoutProps.cell.selection = null;

    setTimeout(() => {
      const cellIndex: CellIndex = {
        rowIndex: this.findRowIndex(row),
        columnIndex: 0,
      };

      this.tableCellService.selectCells(cellIndex, cellIndex, true);

      this.cdr.detectChanges();

      setTimeout(() => {
        this._focusToFieldCellTouchable(true);
      }, 17);
    });
  }

  private _removeRows(rows: TableRow[]) {
    this.rows.update((arr) => _.pull(arr, ...rows));

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
