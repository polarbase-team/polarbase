import _ from 'lodash';
import { Injectable, effect, signal } from '@angular/core';
import { CdkDragDrop, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { ResizeEvent } from 'angular-resizable-element';
import { MenuItem } from 'primeng/api';

import { CalculateType } from '../utils/calculate';
import { SortType } from '../utils/sort';
import { getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { TableBaseService } from './table-base.service';
import { TableColumn } from '../models/table-column';
import { TableColumnActionType } from '../events/table-column';
import { DataType } from '../../field-system/models/field.interface';
import { getEffectiveDataType } from '../../field-system/models/utils';

const LABELS: Record<CalculateType, string> = {
  [CalculateType.Empty]: 'Count Empty',
  [CalculateType.Filled]: 'Count Filled',
  [CalculateType.Unique]: 'Count Unique',
  [CalculateType.PercentEmpty]: '% Empty',
  [CalculateType.PercentFilled]: '% Filled',
  [CalculateType.PercentUnique]: '% Unique',
  [CalculateType.Sum]: 'Sum',
  [CalculateType.Average]: 'Average',
  [CalculateType.Median]: 'Median',
  [CalculateType.Min]: 'Min',
  [CalculateType.Max]: 'Max',
  [CalculateType.Range]: 'Range',
  [CalculateType.EarliestDate]: 'Earliest Date',
  [CalculateType.LatestDate]: 'Latest Date',
  [CalculateType.DateRange]: 'Date Range',
};

export function getAggregateMenuItems(
  column: TableColumn,
  onCalculate: (column: TableColumn, type: CalculateType) => void,
): MenuItem[] {
  const allowed = new Set<CalculateType>();

  const common = [
    CalculateType.Empty,
    CalculateType.Filled,
    CalculateType.Unique,
    CalculateType.PercentEmpty,
    CalculateType.PercentFilled,
    CalculateType.PercentUnique,
  ];
  common.forEach((t) => allowed.add(t));

  const dataType = getEffectiveDataType(column.field);
  switch (dataType) {
    case DataType.Date:
      allowed.add(CalculateType.EarliestDate);
      allowed.add(CalculateType.LatestDate);
      allowed.add(CalculateType.DateRange);
      break;
    case DataType.Integer:
    case DataType.Number:
      allowed.add(CalculateType.Sum);
      allowed.add(CalculateType.Average);
      allowed.add(CalculateType.Median);
      allowed.add(CalculateType.Min);
      allowed.add(CalculateType.Max);
      allowed.add(CalculateType.Range);
      break;
  }

  return Array.from(allowed).map((type) => ({
    label: LABELS[type],
    command: () => onCalculate(column, type),
  }));
}

function calculateColumnDragPlaceholderIndex(
  columns: TableColumn[],
  offsetX: number,
  scrollLeft: number,
  frozenCount: number,
) {
  const length = columns.length;
  let dragTargetIndex = 0;

  for (let i = 0; i <= length; i++) {
    const curr = columns[i];
    const next = columns[i + 1];
    if (!curr && !next) return length;

    let a = getColumnOffset(curr);
    let b = getColumnOffset(next) || (curr ? a + curr.width : a);

    if (i <= frozenCount) {
      a += scrollLeft;
      b += scrollLeft;
    }

    if (offsetX < a) break;

    if (offsetX >= a && offsetX <= b) {
      const compared = (a + b) / 2;
      if (offsetX < compared) {
        dragTargetIndex = i;
      } else {
        dragTargetIndex = i + 1;
      }
      break;
    }

    dragTargetIndex = i;
  }

  return dragTargetIndex;
}

@Injectable()
export class TableColumnService extends TableBaseService {
  columns = signal<TableColumn[]>([]);
  frozenColumns = signal<TableColumn[]>([]);
  scrollableColumns = signal<TableColumn[]>([]);
  calculatedColumns = signal<TableColumn[]>([]);
  groupedColumns = signal<TableColumn[]>([]);
  sortedColumns = signal<TableColumn[]>([]);

  private columnById = new Map<TableColumn['id'], TableColumn>();

  constructor() {
    super();

    effect(() => {
      const columns = this.host.sourceColumns() || [];
      const calculatedColumns: TableColumn[] = [];
      const groupedColumns: TableColumn[] = [];
      const sortedColumns: TableColumn[] = [];
      for (const column of columns) {
        column.id ??= _.uniqueId();
        column.width ??= this.tableService.config().column.defaultWidth;
        this.columnById.set(column.id, column);

        if (column.calculateType) {
          calculatedColumns.push(column);
        }
        if (column.groupRule) {
          groupedColumns.splice(column.groupRule.priority, 0, column);
        }
        if (column.sortRule) {
          sortedColumns.splice(column.sortRule.priority, 0, column);
        }
      }
      this.columns.set(_.filter(columns, (c) => !c.hidden));
      this.calculatedColumns.set(calculatedColumns);
      this.groupedColumns.set(groupedColumns);
      this.sortedColumns.set(sortedColumns);
    });

    effect(() => {
      const columns = this.columns();
      const frozenCount = this.tableService.frozenCount();
      this.frozenColumns.set(columns.slice(0, frozenCount + 1));
      this.scrollableColumns.set(columns.slice(frozenCount + 1));
    });
  }

  setColumns(columns: TableColumn[]) {
    this.columns.set(columns);
  }

  addColumn() {
    this.host.columnAction.emit({
      type: TableColumnActionType.Add,
      payload: null,
    });
  }

  editColumn(column: TableColumn) {
    this.host.columnAction.emit({
      type: TableColumnActionType.Edit,
      payload: column,
    });
  }

  showColumn(column: TableColumn) {
    if (!column) return;

    column.hidden = false;
    this.columns.set(_.filter(this.host.sourceColumns(), (c) => !c.hidden));
    this.host.columnAction.emit({
      type: TableColumnActionType.Unhide,
      payload: [column],
    });
  }

  hideColumn(column: TableColumn) {
    if (!column) return;

    column.hidden = true;
    this.columns.update((arr) => _.without(arr, column));
    this.host.columnAction.emit({
      type: TableColumnActionType.Hide,
      payload: [column],
    });
  }

  calculateByColumn(column: TableColumn, calculateType: CalculateType) {
    if (column.calculateType === calculateType) return;

    column.calculateType = calculateType;
    if (!this.calculatedColumns().find((c) => c.id === column.id)) {
      this.calculatedColumns.update((arr) => [...arr, column]);
    }
    this.tableService.calculate();
    this.host.columnAction.emit({
      type: TableColumnActionType.Calculate,
      payload: column,
    });
  }

  uncalculateByColumn(column: TableColumn) {
    if (!column.calculateType) return;

    delete column.calculateType;
    this.calculatedColumns.update((arr) => _.without(arr, column));
    this.host.columnAction.emit({
      type: TableColumnActionType.Uncalculate,
      payload: column,
    });
  }

  groupByColumn(column: TableColumn, sortType: SortType = 'asc') {
    if (column.groupRule?.[0] === sortType) return;

    column.groupRule = { direction: sortType, priority: this.groupedColumns().length + 1 };
    if (!this.groupedColumns().find((c) => c.id === column.id)) {
      this.groupedColumns.update((arr) => [...arr, column]);
    }
    this.tableService.group();
  }

  ungroupByColumn(column: TableColumn) {
    if (!column.groupRule) return;

    delete column.groupRule;
    const newArr = _.without(this.groupedColumns(), column);
    this.groupedColumns.set(newArr);
    newArr.length ? this.tableService.group() : this.tableService.ungroup();
  }

  sortByColumn(column: TableColumn, sortType: SortType = 'asc') {
    if (column.sortRule?.[0] === sortType) return;

    column.sortRule = { direction: sortType, priority: this.sortedColumns().length + 1 };
    if (!this.sortedColumns().find((c) => c.id === column.id)) {
      this.sortedColumns.update((arr) => [...arr, column]);
    }
    this.tableService.sort();
  }

  unsortByColumn(column: TableColumn) {
    if (!column.sortRule) return;

    delete column.sortRule;
    const newArr = _.without(this.sortedColumns(), column);
    this.sortedColumns.set(newArr);
    newArr.length ? this.tableService.sort() : this.tableService.unsort();
  }

  clearColumn(column: TableColumn) {
    for (const row of this.tableRowService.rows()) {
      row.data ||= {};
      row.data[column.id] = null;
    }
    if (this.groupedColumns().length > 0) {
      if (column.groupRule) {
        this.tableService.group();
      }
    } else {
      if (column.calculateType) {
        this.tableService.calculate();
      }
      if (column.sortRule) {
        this.tableService.sort();
      }
    }
    this.host.columnAction.emit({
      type: TableColumnActionType.Clear,
      payload: column,
    });
  }

  onColumnDragStarted() {
    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();
  }

  onColumnDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.host.virtualScroll.measurePointerOffset(e.pointerPosition);
    let index =
      pointerOffsetX === null
        ? null
        : calculateColumnDragPlaceholderIndex(
            this.columns(),
            pointerOffsetX,
            this.host.virtualScroll.scrollLeft(),
            this.tableService.frozenCount(),
          );
    let offset = null;

    if (index !== null) {
      const length = this.columns().length;
      const isOutRange = index === length;

      let column: TableColumn;
      if (isOutRange) {
        column = this.columnAt(index - 1);
      } else {
        column = this.columnAt(index);
      }

      if (column) {
        offset = getColumnOffset(column);
        if (isOutRange) {
          offset += column.width;
        }
        if (index - 1 > this.tableService.frozenCount()) {
          offset -= this.host.virtualScroll.scrollLeft();
        }
      } else {
        index = null;
      }
    }

    this.tableService.layout.column.dragTargetIndex = index;
    this.tableService.layout.column.dragTargetOffsetX =
      offset + this.tableService.config().sideSpacing;
  }

  onColumnDropped(e: CdkDragDrop<TableColumn[]>) {
    const { dragTargetIndex } = this.tableService.layout.column;
    if (dragTargetIndex === null) return;

    const previousIndex = e.previousIndex;
    const currentIndex = dragTargetIndex > previousIndex ? dragTargetIndex - 1 : dragTargetIndex;
    this.tableService.layout.column.dragTargetIndex =
      this.tableService.layout.column.dragTargetOffsetX = null;
    if (previousIndex === currentIndex) return;

    this.moveColumnAt(previousIndex, currentIndex);
  }

  onColumnResizing(column: TableColumn, event: ResizeEvent) {
    let newWidth = event.rectangle.width;

    const minWidth = this.tableService.config().column.minWidth;
    if (newWidth < minWidth) newWidth = minWidth;

    const maxWidth = this.tableService.config().column.maxWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;

    column.width = newWidth;
    this.columns.update((arr) => [...arr]);

    if (this.tableService.layout.fillHandle.index && !this.tableService.layout.fillHandle.hidden) {
      this.tableService.positionFillHandle();
    }
  }

  onColumnResizeEnd(column: TableColumn) {
    this.host.columnAction.emit({
      type: TableColumnActionType.Resize,
      payload: column,
    });
  }

  selectColumns(e: MouseEvent, columnIndex: number) {
    this.tableCellService.deselectAllCells();
    this.tableRowService.deselectAllRows();

    const selectedIndices = this.tableService.layout.column.selectedIndices || new Set();

    if (e.shiftKey) {
      let startIdx = selectedIndices.values().next().value ?? columnIndex;
      let endIdx = columnIndex;
      if (columnIndex < startIdx) {
        endIdx = startIdx;
        startIdx = columnIndex;
      } else {
        endIdx = columnIndex;
      }
      for (let i = startIdx; i <= endIdx; i++) {
        selectedIndices.add(i);
      }
      // } else if (_.isCmdKey(e as unknown as KeyboardEvent)) {
      // selection.add(columnIndex);
    } else {
      selectedIndices.clear();
      selectedIndices.add(columnIndex);
    }

    this.tableService.layout.column.selectedIndices = selectedIndices;
    this.host.columnAction.emit({
      type: TableColumnActionType.Select,
      payload: this.getSelectedColumns(),
    });
  }

  deselectAllColumns() {
    this.host.menu.hide();
    this.host.contextMenu.hide();

    if (!this.tableService.layout.column.selectedIndices) return;
    this.tableService.layout.column.selectedIndices = null;

    this.host.columnAction.emit({
      type: TableColumnActionType.Select,
      payload: [],
    });
  }

  deleteColumn(column: TableColumn) {
    this.columns.update((arr) => _.without(arr, column));
    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();
    this.host.columnAction.emit({
      type: TableColumnActionType.Delete,
      payload: [column],
    });
  }

  deleteSelectedColumns() {
    let selectedColumns = this.getSelectedColumns();
    if (!selectedColumns.length) return;

    this.columns.update((arr) => _.without(arr, ...selectedColumns));

    this.tableCellService.deselectAllCells();
    this.deselectAllColumns();

    this.host.columnAction.emit({
      type: TableColumnActionType.Delete,
      payload: selectedColumns,
    });
  }

  hideSelectedColumns() {
    const columns = this.getSelectedColumns();
    for (const c of columns) {
      c.hidden = true;
    }
    this.columns.update((arr) => _.without(arr, ...columns));
    this.host.columnAction.emit({
      type: TableColumnActionType.Hide,
      payload: columns,
    });
  }

  moveColumn(column: TableColumn, newIndex: number) {
    const index = this.findColumnIndex(column);
    this.moveColumnAt(index, newIndex);
  }

  moveColumnAt(index: number, newIndex: number) {
    moveItemInArray(this.columns(), index, newIndex);
    this.columns.update((arr) => [...arr]);
    this.host.columnAction.emit({
      type: TableColumnActionType.Move,
      payload: {
        column: this.columnAt(newIndex),
        position: newIndex,
      },
    });
  }

  columnAt(index: number) {
    return this.columns()[index];
  }

  findColumnByID(id: TableColumn['id']) {
    return this.columnById?.has(id)
      ? this.columnById.get(id)
      : _.find(this.host.sourceColumns(), { id });
  }

  findColumnIndex(column: TableColumn) {
    const idx = _.indexOf(this.columns(), column);
    return idx === -1 ? this.findColumnIndexByID(column.id) : idx;
  }

  findColumnIndexByID(id: TableColumn['id']) {
    return _.findIndex(this.columns(), { id });
  }

  findLastColumnIndex() {
    return this.columns().length - 1;
  }

  openContextMenu(e: Event, column: TableColumn, columnIndex: number) {
    const items: MenuItem[] = [];
    const { column: config } = this.tableService.config();

    if (this.tableService.layout.column.selectedIndices?.size > 1) {
      items.push({
        label: 'Hide selected columns',
        icon: 'icon icon-eye-closed',
        command: () => {
          this.hideSelectedColumns();
        },
      });
      if (config.deletable) {
        items.push({
          label: 'Delete selected columns',
          icon: 'icon icon-trash',
          command: () => {
            this.host.deleteConfirmation(
              'Are you sure you want to delete the selected columns?',
              'Delete columns',
              () => this.deleteSelectedColumns(),
              void 0,
              void 0,
              'delete-multiple-columns-confirmation',
            );
          },
        });
      }
    } else {
      if (config.updatable && !column.primary) {
        items.push({
          label: 'Edit column',
          icon: 'icon icon-pencil',
          command: () => {
            this.editColumn(column);
          },
        });
      }
      if (config.freezable) {
        items.push(
          { separator: true },
          {
            label: 'Freeze up to This Column',
            icon: 'icon icon-panel-right-close',
            command: () => {
              this.tableService.setFrozenCount(columnIndex);
            },
          },
        );
      }
      if (config.sortable) {
        items.push(
          { separator: true },
          {
            label: 'Sort up',
            icon: 'icon icon-arrow-up-a-z',
            command: () => {
              this.sortByColumn(column, 'asc');
            },
          },
          {
            label: 'Sort down',
            icon: 'icon icon-arrow-down-z-a',
            command: () => {
              this.sortByColumn(column, 'desc');
            },
          },
        );
        if (column.sortRule) {
          items.push({
            label: 'Clear sorting',
            icon: 'icon icon-x',
            command: () => {
              this.unsortByColumn(column);
            },
          });
        }
      }
      if (config.groupable) {
        items.push(
          { separator: true },
          {
            label: 'Group by',
            icon: 'icon icon-group',
            command: () => {
              this.groupByColumn(column, 'asc');
            },
          },
        );
        if (column.groupRule) {
          items.push({
            label: 'Clear grouping',
            icon: 'icon icon-x',
            command: () => {
              this.ungroupByColumn(column);
            },
          });
        }
      }
      if (config.hideable) {
        items.push(
          { separator: true },
          {
            label: 'Hide',
            icon: 'icon icon-eye-closed',
            command: () => {
              this.hideColumn(column);
            },
          },
        );
      }
      if (config.deletable && !column.primary) {
        items.push(
          { separator: true },
          {
            label: 'Delete',
            icon: 'icon icon-trash',
            command: () => {
              this.host.deleteConfirmation(
                'Are you sure you want to delete this column?',
                'Delete column',
                () => this.deleteColumn(column),
                void 0,
                void 0,
                'delete-column-confirmation',
              );
            },
          },
        );
      }
    }

    this.host.menuItems = items;
    this.host.contextMenu.show(e);
  }

  openAggregateMenu(e: Event, column: TableColumn) {
    this.host.menuItems = getAggregateMenuItems(column, (col, type) => {
      this.calculateByColumn(col, type);
    });
    this.host.menu.toggle(e);
  }

  private getSelectedColumns() {
    const { selectedIndices } = this.tableService.layout.column;
    const columns: TableColumn[] = [];
    if (selectedIndices) {
      for (const idx of selectedIndices) {
        columns.push(this.columnAt(idx));
      }
    }
    return columns;
  }
}
