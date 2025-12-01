import _ from 'lodash';
import {
  Injectable,
  DestroyRef,
  inject,
  signal,
  effect,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragStart, CdkDragMove, CdkDragEnd, Point } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, filter, map, pairwise } from 'rxjs';
import { MenuItem } from 'primeng/api';

import { EmitEventController } from '../utils/emit-event-controller';
import { Dimension } from './table.service';
import type { CellIndex } from './table-cell.service';
import { TableBaseService } from './table-base.service';
import { TableRow } from '../models/table-row';
import { TableGroup } from '../models/table-group';
import { TableCell } from '../models/table-cell';
import { TableRowAction, TableRowActionType, TableRowAddedEvent } from '../events/table-row';
import { TableCellAction, TableCellActionType } from '../events/table-cell';

export const RowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type RowSize = keyof typeof RowSize;

@Injectable()
export class TableRowService extends TableBaseService {
  rows = signal<TableRow[]>([]);
  rowSize = signal<RowSize>('S');
  pendingRow: TableRow;
  selectedRows = new Set<TableRow>();

  rowHeight = computed(() => {
    return RowSize[this.rowSize()];
  });

  canAddRow = computed(() => {
    return this.tableService.config().row.addable;
  });

  private cdRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private draggingRows = new Set<TableRow>();
  private rowById = new Map<TableRow['id'], TableRow>();
  private rowAddedController = new EmitEventController<TableRow['id'], TableRowAddedEvent>({
    autoEmit: false,
    onEmitted: (events) => {
      this.host.rowAction.emit({ type: TableRowActionType.Add, payload: events });
    },
  });

  constructor() {
    super();

    effect(() => {
      this.rowSize.set(this.tableService.config().row.size);
    });

    effect(() => {
      const rows = this.host.sourceRows();
      for (const row of rows) {
        if (!this.rowById.has(row.id)) {
          row.id ??= _.uniqueId();
        }
        if (row.selected) this.selectedRows.add(row);
        this.rowById.set(row.id, row);
      }

      this.tableService.refreshView();
      this.rows.set(rows);
    });
  }

  override onInit() {
    outputToObservable(this.host.rowAction)
      .pipe(
        filter(
          (event): event is Extract<TableRowAction, { type: typeof TableRowActionType.Add }> =>
            event.type === TableRowActionType.Add,
        ),
        map(({ payload }) => {
          return _.map(payload as { row: TableRow }[], 'row');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => {
        for (const row of rows) {
          if (this.isPendingRow(row)) {
            this.pendingRow = null;
            break;
          }
        }
        this.tableService.refreshView();
      });

    outputToObservable(this.host.cellAction)
      .pipe(
        filter(
          (event): event is Extract<TableCellAction, { type: typeof TableCellActionType.Select }> =>
            event.type === TableCellActionType.Select,
        ),
        map(({ payload }: { payload: TableCell[] }) => payload?.[0].row || null),
        distinctUntilChanged(),
        pairwise(),
        debounceTime(0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([_oldRow, newRow]) => {
        if (newRow == null) {
          this.rowAddedController.flush();
        } else {
          const keys = [];

          for (const event of this.rowAddedController.getEvents()) {
            const rowID = event.row.id;
            if (rowID === newRow.id) continue;

            keys.push(rowID);
          }

          if (keys.length) this.rowAddedController.emit(keys);
        }
      });
  }

  override onDestroy() {
    this.rowAddedController.flush();
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
  //     this.rowById.set(row.id, row);
  //   }

  //   this.tableService.refreshView();
  //   this.cdr.markForCheck();
  // }

  // updateRows(rows: TableRow[], shouldCheckSelectedState?: boolean) {
  //   if (shouldCheckSelectedState) {
  //     for (const row of rows) {
  //       row.selected ? this.selectedRows.add(row) : this.selectedRows.delete(row);
  //     }
  //   }
  //   this.tableService.refreshView();
  //   this.cdr.markForCheck();
  // }

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
    const foundRow = this.findRowAtPoint(e.pointerPosition);
    let group: TableGroup;
    let rowIndex: number;
    let rowOffset: number;
    if (foundRow) {
      group = foundRow.group;
      rowIndex = foundRow.rowIndex;
      rowOffset =
        foundRow.rowOffset +
        Dimension.HeaderHeight +
        Dimension.BodyVerticalPadding -
        this.host.virtualScroll.scrollTop() -
        2;
    }
    this.tableService.layout.row.dragTargetGroup = group;
    this.tableService.layout.row.dragTargetIndex = rowIndex;
    this.tableService.layout.row.dragTargetOffsetY = rowOffset;
  }

  onRowDragEnded(e: CdkDragEnd<TableRow>) {
    const { dragTargetIndex } = this.tableService.layout.row;
    if (dragTargetIndex === null) return;
    const currentIndex = dragTargetIndex;

    if (_.isFinite(currentIndex)) {
      const droppedRows = [...this.draggingRows];
      this.moveRows(droppedRows, currentIndex);
      if (this.tableGroupService.isGrouped()) {
        const targetGroup = this.tableService.layout.row.dragTargetGroup;
        this.tableGroupService.moveRowsInGroup(droppedRows, currentIndex, targetGroup);
      }
    }

    e.source.reset();

    this.tableService.layout.row.dragTargetIndex = this.tableService.layout.row.dragTargetGroup =
      null;
    this.draggingRows.clear();
  }

  setRowSize(size: RowSize) {
    this.rowSize.set(size);
    if (this.tableGroupService.isGrouped()) {
      this.tableGroupService.updateGroupState();
    }
    setTimeout(() => {
      this.tableService.positionFillHandle();
    }, 200);
  }

  expandRow(row: TableRow) {
    this.host.rowAction.emit({ type: TableRowActionType.Expand, payload: row });
  }

  expandSelectingRow() {
    const selecting = this.tableService.layout.cell.selection?.anchor;
    if (!selecting) return;
    this.expandRow(this.rowAt(selecting.rowIndex));
  }

  addNewRow(group?: TableGroup) {
    if (!this.canAddRow()) return;

    this.tableGroupService.isGrouped()
      ? this.tableGroupService.insertRowInGroup(group)
      : this.insertRow();
  }

  insertRow(
    data?: any,
    position = this.rows()?.length,
    onBeforeInsert?: (r: TableRow, p: number) => void,
  ) {
    const newRow = {
      id: _.uniqueId(),
      data: _.cloneDeep(data),
    } as TableRow;

    onBeforeInsert?.(newRow, position);

    this.pendingRow = newRow;
    this.rows.update((arr) => {
      arr.splice(position, 0, newRow);
      return [...arr];
    });

    this.selectAndFocusInsertedRow(position);
    this.rowAddedController.addEvent(newRow.id, { row: newRow, insertedIndex: position });
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

    this.removeRows(canDeleteRows);
    this.host.rowAction.emit({ type: TableRowActionType.Delete, payload: canDeleteRows });
    this.tableService.calculate();
  }

  deleteRow(row: TableRow) {
    this.tableCellService.deselectAllCells();
    this.removeRows([row]);
    this.host.rowAction.emit({ type: TableRowActionType.Delete, payload: [row] });
    this.tableService.calculate();
  }

  toggleSelectRow(row: TableRow) {
    this.tableCellService.deselectAllCells();
    this.tableColumnService.deselectAllColumns();

    row.selected = !row.selected;
    this.selectedRows.has(row) ? this.selectedRows.delete(row) : this.selectedRows.add(row);
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: [...this.selectedRows] });
  }

  flushDraftRow() {
    if (!this.pendingRow) return;

    this.tableCellService.deselectAllCells();

    this.rowAddedController.emitEvent(this.pendingRow.id);
    this.pendingRow = null;
  }

  cancelPendingRow() {
    if (!this.pendingRow) return;

    this.tableCellService.deselectAllCells();

    this.removeRows([this.pendingRow]);
    this.rowAddedController.removeEvent(this.pendingRow.id);
    this.pendingRow = null;
  }

  selectAllRows() {
    this.tableCellService.deselectAllCells();
    this.tableColumnService.deselectAllColumns();

    this.selectedRows.clear();
    for (const row of this.rows()) {
      row.selected = true;
      this.selectedRows.add(row);
    }
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: [...this.selectedRows] });
  }

  deselectAllRows() {
    this.host.menu.hide();
    this.host.contextMenu.hide();

    if (!this.selectedRows.size) return;

    for (const row of this.selectedRows) {
      row.selected = false;
    }
    this.selectedRows.clear();
    this.host.rowAction.emit({ type: TableRowActionType.Select, payload: null });
  }

  moveRows(movedRows: TableRow[], movedIndex: number) {
    let newMovedIndex = movedIndex;
    for (const movedRow of movedRows) {
      const idx = this.findRowIndex(movedRow);
      if (idx < 0 || idx >= movedIndex) continue;
      newMovedIndex--;
    }

    const rows = this.rows();
    _.pull(rows, ...movedRows);
    rows.splice(newMovedIndex, 0, ...movedRows);
    this.rows.update(() => [...rows]);
    this.cdRef.detectChanges();

    this.host.rowAction.emit({
      type: TableRowActionType.Move,
      payload: _.map(movedRows, (movedRow) => ({ row: movedRow, movedIndex })),
    });
  }

  getSelectedRows() {
    const selectedRows = [...this.selectedRows];

    if (!selectedRows.length) {
      const { selection } = this.tableService.layout.cell;
      const startIndex = selection.start.rowIndex;
      const endIndex = startIndex + selection.rowCount;

      for (let i = startIndex; i < endIndex; i++) {
        selectedRows.push(this.rowAt(i));
      }
    }

    return selectedRows;
  }

  rowAt(index: number) {
    return this.tableGroupService.isGrouped()
      ? this.tableGroupService.findRowInGroupByIndex(index)
      : this.rows()[index];
  }

  findRowAtPoint(point: Point) {
    if (this.tableGroupService.isGrouped()) {
      return this.tableGroupService.findRowAtPoint(point);
    }

    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(point);
    pointerOffsetY -= Dimension.BodyVerticalPadding;

    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) {
      return null;
    }

    const startOffset = 0;
    const endOffset = startOffset + this.rows().length * this.rowHeight();

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) {
      return null;
    }

    const index = Math.round((pointerOffsetY - startOffset) / this.rowHeight());

    return {
      group: null,
      rowIndex: index,
      rowOffset: startOffset + index * this.rowHeight(),
    };
  }

  findRowByID(id: TableRow['id']) {
    return this.rowById.has(id) ? this.rowById.get(id) : _.find(this.rows(), { id });
  }

  findRowIndex(row: TableRow) {
    return this.tableGroupService.isGrouped()
      ? this.tableGroupService.findRowIndexInGroup(this.tableGroupService.rootGroup(), row)
      : _.indexOf(this.rows(), row);
  }

  findRowIndexByID(id: TableRow['id']) {
    return this.tableGroupService.isGrouped()
      ? this.tableGroupService.findRowIndexInGroupByID(id)
      : _.findIndex(this.rows(), { id });
  }

  findLastRowIndex() {
    return this.tableGroupService.isGrouped()
      ? this.tableGroupService.findLastRowIndexInGroup()
      : this.rows().length - 1;
  }

  markRowsAsStreamed(rows: TableRow[]) {
    for (const row of rows) {
      (row as any)._isStreamed = true;
    }
  }

  isPendingRow(row: TableRow) {
    return this.pendingRow === row;
  }

  openContextMenu(
    e: Event,
    row: TableRow,
    rowIndex: number,
    group: TableGroup,
    rowGroupIndex: number,
  ) {
    const items: MenuItem[] = [];

    if (this.selectedRows?.size > 1) {
      items.push({
        label: 'Delete selected rows',
        icon: 'pi pi-trash',
        command: () => {
          this.host.deleteConfirmation(
            'Do you want to delete the selected rows?',
            'Delete rows',
            () => this.deleteSelectedRows(),
            void 0,
          );
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
              this.tableGroupService.isGrouped()
                ? this.tableGroupService.insertRowInGroup(group, rowGroupIndex)
                : this.insertRow(null, rowIndex);
            },
          },
          {
            label: 'Insert row below',
            icon: 'pi pi-arrow-down',
            command: () => {
              this.tableGroupService.isGrouped()
                ? this.tableGroupService.insertRowInGroup(group, rowGroupIndex + 1)
                : this.insertRow(null, rowIndex + 1);
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
            this.host.deleteConfirmation(
              'Do you want to delete this row?',
              'Delete row',
              () => this.deleteRow(row),
              void 0,
            );
          },
        });
      }
    }

    this.host.menuItems = items;
    this.host.contextMenu.show(e);
  }

  private removeRows(rows: TableRow[]) {
    this.rows.update((arr) => _.without(arr, ...rows));

    if (this.tableGroupService.isGrouped()) {
      this.tableGroupService.deleteRowsInGroup(rows);
    }
  }

  private selectAndFocusInsertedRow(insertedIndex: number) {
    this.tableService.layout.cell.selection = null;

    queueMicrotask(() => {
      const cellIndex: CellIndex = {
        rowIndex: insertedIndex,
        columnIndex: 0,
      };
      this.tableCellService.selectCells(cellIndex, cellIndex);
      this.cdRef.detectChanges();

      setTimeout(() => {
        this.tableCellService.scrollToFocusedCell();
      });
      setTimeout(() => {
        this.focusFirstCellOfNewRow(true);
      }, 17);
    });
  }

  private focusFirstCellOfNewRow(retry = false) {
    if (!this.tableService.layout.cell.selection) return;

    const fieldCell = this.tableCellService.cellElementAt(
      this.tableService.layout.cell.selection.anchor,
    )?.firstElementChild;
    if (fieldCell) {
      fieldCell.dispatchEvent(new Event('dblclick'));
      return;
    }

    if (!retry) return;

    setTimeout(() => {
      this.focusFirstCellOfNewRow();
    }, 500);
  }
}
