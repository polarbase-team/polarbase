import _ from 'lodash';
import { Injectable, ChangeDetectorRef, inject, SimpleChanges } from '@angular/core';
import {
  CdkDragDrop,
  CdkDragEnd,
  CdkDragMove,
  CdkDragStart,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MenuItem } from 'primeng/api';

import { DataType } from '../field/interfaces';
import { CalculateType } from '../utils/calculate';
import { GroupType } from '../utils/group';
import { SortType } from '../utils/sort';
import { _getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { Dimension } from './table.service';
import { ResizeEvent } from 'angular-resizable-element';
import { TableBaseService } from './table-base.service';
import { TableColumn } from '../models/table-column';
import { TableColumnActionType } from '../events/table-column';
import { TableActionType } from '../events/table';

interface TableColumnExtra extends TableColumn {
  _bkWidth?: number;
  _isDragging?: boolean;
  _isResizing?: boolean;
}

const UNGROUPABLE_FIELD_DATA_TYPES: ReadonlySet<DataType> = new Set();
const UNSORTABLE_FIELD_DATA_TYPES: ReadonlySet<DataType> = new Set();

function calculateColumnDragPlaceholderIndex(
  columns: TableColumn[],
  offsetX: number,
  scrollLeft: number,
  frozenIndex: number,
): number {
  let dragPlaceholderIndex = 0;
  const length = columns.length;

  for (let i = 0; i <= length; i++) {
    const curr = columns[i];
    const next = columns[i + 1];

    if (!curr && !next) {
      return length;
    }

    let a = _getColumnOffset(curr);
    let b = _getColumnOffset(next) || (curr ? a + curr.width : a);

    if (i <= frozenIndex) {
      a += scrollLeft;
      b += scrollLeft;
    }

    if (offsetX < a) {
      break;
    }

    if (offsetX >= a && offsetX <= b) {
      const compared = (a + b) / 2;
      if (offsetX < compared) {
        dragPlaceholderIndex = i;
      } else {
        dragPlaceholderIndex = i + 1;
      }
      break;
    }

    dragPlaceholderIndex = i;
  }

  return dragPlaceholderIndex;
}

function calculateFreezeDividerDragPlaceholderIndex(
  columns: TableColumn[],
  offsetX: number,
  scrollLeft: number,
  frozenIndex: number,
): number {
  let dragPlaceholderIndex = 0;

  for (let i = 0; i < columns.length; i++) {
    let a = _getColumnOffset(columns[i]);
    let b = _getColumnOffset(columns[i + 1]) || a;

    if (i <= frozenIndex) {
      a += scrollLeft;
      b += scrollLeft;
    }

    if (offsetX < a) {
      break;
    }

    if (offsetX >= a && offsetX <= b) {
      const compared = (a + b) / 2;
      if (offsetX < compared) {
        dragPlaceholderIndex = i;
      } else {
        dragPlaceholderIndex = i + 1;
      }
      break;
    }

    dragPlaceholderIndex = i;
  }

  return dragPlaceholderIndex;
}

@Injectable()
export class TableColumnService extends TableBaseService {
  columnActionItems: MenuItem[] | undefined;
  leftColumns: TableColumn[];
  rightColumns: TableColumn[];
  calculatingColumns = new Map<TableColumn['id'], TableColumn>();
  groupingColumns = new Map<TableColumn['id'], TableColumn>();
  sortingColumns = new Map<TableColumn['id'], TableColumn>();

  private readonly _cdRef = inject(ChangeDetectorRef);
  private _displayingColumns: TableColumn[];
  private _columnLookup: Map<TableColumn['id'], TableColumn>;

  get frozenIndex(): number {
    let frozenIndex = this.host.config.column.frozenIndex;
    if (this.displayingColumns && frozenIndex > this.displayingColumns.length - 1) {
      frozenIndex = this.displayingColumns.length - 1;
    }
    return frozenIndex;
  }

  get displayingColumns(): TableColumn[] {
    return this._displayingColumns;
  }
  set displayingColumns(columns: TableColumn[]) {
    this._displayingColumns = columns;
    this.leftColumns = columns.slice(0, this.frozenIndex + 1);
    this.rightColumns = columns.slice(this.frozenIndex + 1);
  }

  get canHideSelectedColumns(): boolean {
    return true;
  }

  get canDeleteSelectedColumns(): boolean {
    return !_.find(this.getSelectedColumns(), (column) => !column.deletable);
  }

  override onChanges(changes: SimpleChanges) {
    if ('config' in changes && changes['config'].isFirstChange) {
      if (this.host.config.calculating) {
        for (const [c, t] of this.host.config.calculating) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.calculateType = t;
          this.calculatingColumns.set(column.id, column);
        }
      }
      if (this.host.config.grouping) {
        for (const [c, t] of this.host.config.grouping) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.groupingType = t;
          this.groupingColumns.set(column.id, column);
        }
      }
      if (this.host.config.sorting) {
        for (const [c, t] of this.host.config.sorting) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.sortingType = t;
          this.sortingColumns.set(column.id, column);
        }
      }
    }
    if ('columns' in changes) {
      this.updateColumns(this.host.columns);
    }
  }

  override updateStates() {
    this.state.frozenIndex = this.frozenIndex;
    this.state.displayingColumns = this.displayingColumns;
    this.state.canHideSelectedColumns = this.canHideSelectedColumns;
    this.state.canDeleteSelectedColumns = this.canDeleteSelectedColumns;
  }

  updateColumns(columns: TableColumn[]) {
    if (!columns) return;

    const displayingColumns = new Set(this.displayingColumns);
    let shouldUpdateDisplayingColumns: boolean;
    this._columnLookup ||= new Map();
    for (const column of columns) {
      if (!this._columnLookup.has(column.id)) {
        column.id ||= _.uniqueId();
        column.width ||= this.host.config.column.defaultWidth;
        this._columnLookup.set(column.id, column);
      }
      const isColumnDisplaying = displayingColumns.has(column);
      shouldUpdateDisplayingColumns ||=
        (column.hidden && isColumnDisplaying) || (!column.hidden && !isColumnDisplaying);
    }
    if (shouldUpdateDisplayingColumns) {
      this.markDisplayingColumnsAsChanged(_.filter(this.host.columns, (c) => !c.hidden));
    }
    this._cdRef.markForCheck();
  }

  getGroupableColumns(includeColumn?: TableColumn): TableColumn[] {
    return _.filter(
      this.host.columns,
      (column) =>
        !UNGROUPABLE_FIELD_DATA_TYPES.has(column.field.dataType) &&
        (includeColumn === column || !this.groupingColumns.has(column.id)),
    );
  }

  getSortableColumns(includeColumn?: TableColumn): TableColumn[] {
    return _.filter(
      this.host.columns,
      (column) =>
        !UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType) &&
        (includeColumn === column || !this.sortingColumns.has(column.id)),
    );
  }

  setColumnWidth(column: TableColumn, width: number) {
    if (!column) return;
    column.width = width;
    this._cdRef.markForCheck();
  }

  moveColumn(column: TableColumn, newIndex: number) {
    const currentIndex = this.findColumnRawIndex(column);
    moveItemInArray(this.host.columns, currentIndex, newIndex);
    if (column.hidden) return;
    this.markDisplayingColumnsAsChanged(_.filter(this.host.columns, (c) => !c.hidden));
    this._cdRef.markForCheck();
  }

  hideColumn(column: TableColumn) {
    if (!column) return;

    column.hidden = true;
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, column));
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Hide,
      payload: [column],
    });
  }

  unhideColumn(column: TableColumn) {
    if (!column) return;

    column.hidden = false;
    this.markDisplayingColumnsAsChanged(_.filter(this.host.columns, (c) => !c.hidden));
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Unhide,
      payload: [column],
    });
  }

  calculateByColumn(column: TableColumn, calculateType: CalculateType) {
    if (!column || !calculateType || column.calculateType === calculateType) return;

    column.calculateType = calculateType;
    this.calculatingColumns.set(column.id, column);
    this.tableService.calculate();
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Calculate,
      payload: column,
    });
  }

  uncalculateByColumn(column: TableColumn) {
    if (!column || !this.calculatingColumns.has(column.id)) return;

    delete column.calculateType;
    this.calculatingColumns.delete(column.id);
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Uncalculate,
      payload: column,
    });
  }

  groupByColumn(column: TableColumn, groupingType: GroupType = 'asc', replaceColumn?: TableColumn) {
    if (!column?.id || !groupingType || column.groupingType === groupingType) return;

    column.groupingType = groupingType;
    if (replaceColumn) {
      delete replaceColumn.groupingType;
      const groupingColumns = new Map<TableColumn['id'], TableColumn>();
      for (const [key, value] of this.groupingColumns) {
        if (key === replaceColumn.id) {
          groupingColumns.set(column.id, column);
          continue;
        }
        groupingColumns.set(key, value);
      }
      this.groupingColumns = groupingColumns;
    } else {
      this.groupingColumns.set(column.id, column);
    }
    this.tableService.group();
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Group,
      payload: column,
    });
  }

  ungroupByColumn(column: TableColumn) {
    if (!column?.id || !this.groupingColumns.has(column.id)) return;

    delete column.groupingType;
    this.groupingColumns.delete(column.id);
    this.groupingColumns.size ? this.tableService.group() : this.tableService.ungroup();
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Ungroup,
      payload: column,
    });
  }

  sortByColumn(column: TableColumn, sortingType: SortType = 'asc', replaceColumn?: TableColumn) {
    if (!column?.id || !sortingType || column.sortingType === sortingType) return;

    column.sortingType = sortingType;
    if (replaceColumn) {
      delete replaceColumn.sortingType;
      const sortingColumns = new Map<TableColumn['id'], TableColumn>();
      for (const [key, value] of this.sortingColumns) {
        if (key === replaceColumn.id) {
          sortingColumns.set(column.id, column);
          continue;
        }
        sortingColumns.set(key, value);
      }
      this.sortingColumns = sortingColumns;
    } else {
      this.sortingColumns.set(column.id, column);
    }
    this.tableService.sort();
    this._cdRef.markForCheck();
    this.host.columnAction.emit({
      type: TableColumnActionType.Sort,
      payload: column,
    });
  }

  unsortByColumn(column: TableColumn) {
    if (!column?.id || !this.sortingColumns.has(column.id)) return;

    delete column.sortingType;
    this.sortingColumns.delete(column.id);
    this._cdRef.markForCheck();
    this.sortingColumns.size ? this.tableService.sort() : this.tableService.unsort();
    this.host.columnAction.emit({
      type: TableColumnActionType.Unsort,
      payload: column,
    });
  }

  clearColumn(column: TableColumn) {
    for (const row of this.host.rows) {
      row.data ||= {};
      row.data[column.id] = null;
    }
    if (this.tableService.shouldGroup) {
      if (column.groupingType) {
        this.tableService.group();
      }
    } else {
      if (column.calculateType) {
        this.tableService.calculate();
      }
      if (column.sortingType) {
        this.tableService.sort();
      }
    }
    this.host.columnAction.emit({
      type: TableColumnActionType.Clear,
      payload: column,
    });
  }

  openColumnActionMenu(e: Event, column: TableColumn, columnIndex: number) {
    const items: MenuItem[] = [];

    if (this.tableService.layoutProps.column.selection?.size > 1) {
      items.push(
        {
          label: 'Hide selected columns',
          icon: 'pi pi-eye-slash',
          command: () => {
            this.hideSelectedColumns();
          },
        },
        {
          label: 'Delete selected columns',
          icon: 'pi pi-trash',
          command: () => {
            this.deleteSelectedColumns();
          },
        },
      );
    } else {
      if (this.host.config.column.freezable) {
        items.push({
          label: 'Freeze up to This Column',
          icon: 'pi pi-sign-in',
          command: () => {
            this.freezeUpToColumnIndex(columnIndex);
          },
        });
      }
      if (this.host.config.column.sortable) {
        items.push(
          { separator: true },
          {
            label: 'Sort up',
            icon: 'pi pi-sort-amount-up',
            disabled: UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.sortByColumn(column, 'asc');
            },
          },
          {
            label: 'Sort down',
            icon: 'pi pi-sort-amount-down',
            disabled: UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.sortByColumn(column, 'desc');
            },
          },
        );
      }
      if (this.host.config.column.groupable) {
        items.push(
          { separator: true },
          {
            label: 'Group (ASC)',
            icon: 'pi pi-list',
            disabled: UNGROUPABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.groupByColumn(column, 'asc');
            },
          },
          {
            label: 'Group (DESC)',
            icon: 'pi pi-list',
            disabled: UNGROUPABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.groupByColumn(column, 'desc');
            },
          },
        );
      }
      if (this.host.config.column.hideable) {
        items.push(
          { separator: true },
          {
            label: 'Hide',
            icon: 'pi pi-eye-slash',
            command: () => {
              this.hideColumn(column);
            },
          },
        );
      }
      if (this.host.config.column.deletable) {
        items.push(
          { separator: true },
          {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => {
              this.deleteColumn(column);
            },
          },
        );
      }
    }

    this.columnActionItems = items;
    this.host.columnActionMenu.show(e);
  }

  onFreezeDividerMousemove(e: MouseEvent) {
    this.tableService.layoutProps.frozenDivider.isHover = true;
    this.tableService.layoutProps.frozenDivider.dragHandleOffset =
      e.offsetY - Dimension.FreezeDividerDragHandleHeight / 2;
  }

  onFreezeDividerMouseleave() {
    this.tableService.layoutProps.frozenDivider.isHover = false;
  }

  onFreezeDividerDragStarted() {
    this.host.virtualScroll.scrollToLeft();
    this.tableService.layoutProps.frozenDivider.dragging = {} as any;
  }

  onFreezeDividerDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.host.virtualScroll.measurePointerOffset(e.pointerPosition);
    const index = calculateFreezeDividerDragPlaceholderIndex(
      this.displayingColumns,
      pointerOffsetX,
      this.host.virtualScroll.scrollLeft,
      this.frozenIndex,
    );
    const offset = _getColumnOffset(this.findColumnByIndex(index));
    if (offset / this.host.virtualScroll.viewport.width > this.host.config.column.maxFrozenRatio) {
      return;
    }
    this.tableService.layoutProps.frozenDivider.dragging.index = index;
    this.tableService.layoutProps.frozenDivider.dragging.offset =
      offset + this.host.config.sideSpacing;
  }

  onFreezeDividerDragEnded(e: CdkDragEnd) {
    const { index } = this.tableService.layoutProps.frozenDivider.dragging;
    if (index === null) return;
    this.freezeUpToColumnIndex(index - 1);
    this.tableService.layoutProps.frozenDivider.dragging = null;
    e.source._dragRef.reset();
    this.host.updateStates();
  }

  onColumnDragStarted(_e: CdkDragStart, column: TableColumnExtra) {
    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();
    column._isDragging = true;
  }

  onColumnDragEnded(_e: CdkDragEnd, column: TableColumnExtra) {
    column._isDragging = false;
  }

  onColumnDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.host.virtualScroll.measurePointerOffset(e.pointerPosition);
    let index =
      pointerOffsetX === null
        ? null
        : calculateColumnDragPlaceholderIndex(
            this.displayingColumns,
            pointerOffsetX,
            this.host.virtualScroll.scrollLeft,
            this.frozenIndex,
          );
    let offset = null;
    if (index !== null) {
      const length = this.displayingColumns.length;
      const isOutRange = index === length;
      let column;
      if (isOutRange) {
        column = this.findColumnByIndex(index - 1);
      } else {
        column = this.findColumnByIndex(index);
      }
      if (column) {
        offset = _getColumnOffset(column);
        if (isOutRange) {
          offset += column.width;
        }
        if (index - 1 > this.frozenIndex) {
          offset -= this.host.virtualScroll.scrollLeft;
        }
      } else {
        index = null;
      }
    }
    this.tableService.layoutProps.column.dragPlaceholderIndex = index;
    this.tableService.layoutProps.column.dragPlaceholderOffset =
      offset + this.host.config.sideSpacing;
  }

  onColumnDropped(e: CdkDragDrop<TableColumn[]>) {
    const { dragPlaceholderIndex } = this.tableService.layoutProps.column;
    if (dragPlaceholderIndex === null) return;
    const previousIndex = e.previousIndex;
    const currentIndex =
      dragPlaceholderIndex > previousIndex ? dragPlaceholderIndex - 1 : dragPlaceholderIndex;
    this.tableService.layoutProps.column.dragPlaceholderIndex =
      this.tableService.layoutProps.column.dragPlaceholderOffset = null;
    if (previousIndex === currentIndex) return;
    moveItemInArray(this.displayingColumns, previousIndex, currentIndex);
    const column = this.findColumnByIndex(currentIndex);
    const cIdx = _.indexOf(this.host.columns, column);
    const indexColumnBefore = _.indexOf(
      this.host.columns,
      this.displayingColumns[currentIndex - 1],
    );
    moveItemInArray(
      this.host.columns,
      cIdx,
      cIdx < indexColumnBefore ? indexColumnBefore : indexColumnBefore + 1,
    );
    this.markDisplayingColumnsAsChanged();
    this.host.columnAction.emit({
      type: TableColumnActionType.Move,
      payload: {
        column,
        position: currentIndex,
      },
    });
  }

  onColumnResizing(event: ResizeEvent, column: TableColumnExtra, _idx: number) {
    let newWidth = event.rectangle.width;

    const minWidth = this.host.config.column.minWidth;
    if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    const maxWidth = this.host.config.column.maxWidth;
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    if (!column._bkWidth) {
      column._bkWidth = column.width;
    }

    column.width = newWidth;
    column._isResizing = true;
    this.markDisplayingColumnsAsChanged();

    if (
      this.tableService.layoutProps.fillHandler.index &&
      !this.tableService.layoutProps.fillHandler.hidden
    ) {
      this.tableService.updateFillHandlerPosition();
    }
  }

  onColumnResized(event: ResizeEvent, column: TableColumnExtra) {
    let newWidth = event.rectangle.width;

    const minWidth = this.host.config.column.minWidth;
    if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    const maxWidth = this.host.config.column.maxWidth;
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    column._bkWidth = undefined;
    setTimeout(() => (column._isResizing = false));
    this.host.columnAction.emit({
      type: TableColumnActionType.Resize,
      payload: column,
    });
  }

  protected freezeUpToColumnIndex(columnIndex: number) {
    if (columnIndex === this.frozenIndex) return;
    this.host.config.column.frozenIndex = columnIndex;
    this.markDisplayingColumnsAsChanged();
    this.host.action.emit({
      type: TableActionType.Freeze,
      payload: columnIndex,
    });
  }

  selectColumn(e: MouseEvent, columnIndex: number) {
    this.tableCellService.deselectAllCells();
    this.tableRowService.deselectAllRows();
    const selection = this.tableService.layoutProps.column.selection || new Set();
    if (e.shiftKey) {
      let startIdx = selection.values().next().value ?? columnIndex;
      let endIdx = columnIndex;
      if (columnIndex < startIdx) {
        endIdx = startIdx;
        startIdx = columnIndex;
      } else {
        endIdx = columnIndex;
      }
      for (let i = startIdx; i <= endIdx; i++) {
        selection.add(i);
      }
      // } else if (_.isCmdKey(e as unknown as KeyboardEvent)) {
      // selection.add(columnIndex);
    } else {
      selection.clear();
      selection.add(columnIndex);
    }
    this.tableService.layoutProps.column.selection = selection;
    this.host.columnAction.emit({
      type: TableColumnActionType.Select,
      payload: this.getSelectedColumns(),
    });
  }

  deselectAllColumns() {
    this.host.columnActionMenu.hide();
    if (!this.tableService.layoutProps.column.selection) return;
    this.tableService.layoutProps.column.selection = null;
    this.host.columnAction.emit({
      type: TableColumnActionType.Select,
      payload: [],
    });
  }

  protected async deleteColumn(column: TableColumn) {
    _.remove(this.host.columns, column);
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, column));
    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();
    this.host.columnAction.emit({
      type: TableColumnActionType.Delete,
      payload: [column],
    });
  }

  protected async deleteSelectedColumns() {
    let canDeleteColumns = this.getSelectedColumns();
    if (!canDeleteColumns.length) return;
    _.pull(this.host.columns, ...canDeleteColumns);
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, ...canDeleteColumns));
    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();
    this.host.columnAction.emit({
      type: TableColumnActionType.Delete,
      payload: canDeleteColumns,
    });
  }

  protected hideSelectedColumns() {
    const columns = this.getSelectedColumns();
    for (const c of columns) {
      c.hidden = true;
    }
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, ...columns));
    this.host.columnAction.emit({
      type: TableColumnActionType.Hide,
      payload: columns,
    });
  }

  getLastColumnIndex(): number {
    return this.displayingColumns.length - 1;
  }

  protected getSelectedColumns(): TableColumn[] {
    const { selection } = this.tableService.layoutProps.column;
    const columns: TableColumn[] = [];
    if (selection) {
      for (const idx of selection) {
        columns.push(this.findColumnByIndex(idx));
      }
    }
    return columns;
  }

  findColumnByIndex(index: number): TableColumn {
    return this.displayingColumns[index];
  }

  findColumnByRawIndex(index: number): TableColumn {
    return this.host.columns[index];
  }

  findColumnByID(id: TableColumn['id']): TableColumn {
    return this._columnLookup?.has(id)
      ? this._columnLookup.get(id)
      : _.find(this.host.columns, { id });
  }

  findColumnIndex(column: TableColumn): number {
    const idx = _.indexOf(this.displayingColumns, column);
    return idx === -1 ? this.findColumnIndexByID(column.id) : idx;
  }

  findColumnIndexByID(id: TableColumn['id']): number {
    return _.findIndex(this.displayingColumns, { id });
  }

  findColumnRawIndex(column: TableColumn): number {
    const idx = _.indexOf(this.host.columns, column);
    return idx === -1 ? this.findColumnRawIndexByID(column.id) : idx;
  }

  findColumnRawIndexByID(id: TableColumn['id']): number {
    return _.findIndex(this.host.columns, { id });
  }

  markDisplayingColumnsAsChanged(columns: TableColumn[] = this.displayingColumns) {
    this.displayingColumns = [...columns];
  }
}
