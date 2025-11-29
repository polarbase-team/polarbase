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
import { DataType } from '../field/interfaces/field.interface';

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

  const dataType = column.field.dataType;
  if (dataType === DataType.Date) {
    allowed.add(CalculateType.EarliestDate);
    allowed.add(CalculateType.LatestDate);
    allowed.add(CalculateType.DateRange);
  } else if (dataType === DataType.Number) {
    allowed.add(CalculateType.Sum);
    allowed.add(CalculateType.Average);
    allowed.add(CalculateType.Median);
    allowed.add(CalculateType.Min);
    allowed.add(CalculateType.Max);
    allowed.add(CalculateType.Range);
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
  calculatedColumns = new Map<TableColumn['id'], TableColumn>();
  groupedColumns = new Map<TableColumn['id'], TableColumn>();
  sortedColumns = new Map<TableColumn['id'], TableColumn>();

  private columnById = new Map<TableColumn['id'], TableColumn>();

  constructor() {
    super();

    effect(() => {
      const config = this.tableService.config();
      if (config.aggregations) {
        for (const [c, t] of config.aggregations) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.calculateType = t;
          this.calculatedColumns.set(column.id, column);
        }
      }
      if (config.grouping) {
        for (const [c, t] of config.grouping) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.groupSortType = t;
          this.groupedColumns.set(column.id, column);
        }
      }
      if (config.sorting) {
        for (const [c, t] of config.sorting) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as TableColumn);
          if (!column) continue;
          column.sortType = t;
          this.sortedColumns.set(column.id, column);
        }
      }
    });

    effect(() => {
      const columns = this.host.sourceColumns();
      for (const column of columns) {
        if (!this.columnById.has(column.id)) {
          column.id ??= _.uniqueId();
          column.width ??= this.tableService.config().column.defaultWidth;
          this.columnById.set(column.id, column);
        }
      }
      this.columns.set(_.filter(columns, (c) => !c.hidden));
    });

    effect(() => {
      const columns = this.columns();
      const frozenCount = this.tableService.frozenCount();
      this.frozenColumns.set(columns.slice(0, frozenCount + 1));
      this.scrollableColumns.set(columns.slice(frozenCount + 1));
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
    if (!column || !calculateType || column.calculateType === calculateType) return;

    column.calculateType = calculateType;
    this.calculatedColumns.set(column.id, column);
    this.tableService.calculate();
    this.host.columnAction.emit({
      type: TableColumnActionType.Calculate,
      payload: column,
    });
  }

  uncalculateByColumn(column: TableColumn) {
    if (!column || !this.calculatedColumns.has(column.id)) return;

    delete column.calculateType;
    this.calculatedColumns.delete(column.id);
    this.host.columnAction.emit({
      type: TableColumnActionType.Uncalculate,
      payload: column,
    });
  }

  groupByColumn(column: TableColumn, sortType: SortType = 'asc', replaceColumn?: TableColumn) {
    if (!column?.id || !sortType || column.groupSortType === sortType) return;

    column.groupSortType = sortType;
    if (replaceColumn) {
      delete replaceColumn.groupSortType;
      const groupedColumns = new Map<TableColumn['id'], TableColumn>();
      for (const [key, value] of this.groupedColumns) {
        if (key === replaceColumn.id) {
          groupedColumns.set(column.id, column);
          continue;
        }
        groupedColumns.set(key, value);
      }
      this.groupedColumns = groupedColumns;
    } else {
      this.groupedColumns.set(column.id, column);
    }
    this.tableService.group();
    this.host.columnAction.emit({
      type: TableColumnActionType.Group,
      payload: column,
    });
  }

  ungroupByColumn(column: TableColumn) {
    if (!column?.id || !this.groupedColumns.has(column.id)) return;

    delete column.groupSortType;
    this.groupedColumns.delete(column.id);
    this.groupedColumns.size ? this.tableService.group() : this.tableService.ungroup();
    this.host.columnAction.emit({
      type: TableColumnActionType.Ungroup,
      payload: column,
    });
  }

  sortByColumn(column: TableColumn, sortType: SortType = 'asc', replaceColumn?: TableColumn) {
    if (!column?.id || !sortType || column.sortType === sortType) return;

    column.sortType = sortType;
    if (replaceColumn) {
      delete replaceColumn.sortType;
      const sortedColumns = new Map<TableColumn['id'], TableColumn>();
      for (const [key, value] of this.sortedColumns) {
        if (key === replaceColumn.id) {
          sortedColumns.set(column.id, column);
          continue;
        }
        sortedColumns.set(key, value);
      }
      this.sortedColumns = sortedColumns;
    } else {
      this.sortedColumns.set(column.id, column);
    }
    this.tableService.sort();
    this.host.columnAction.emit({
      type: TableColumnActionType.Sort,
      payload: column,
    });
  }

  unsortByColumn(column: TableColumn) {
    if (!column?.id || !this.sortedColumns.has(column.id)) return;

    delete column.sortType;
    this.sortedColumns.delete(column.id);
    this.sortedColumns.size ? this.tableService.sort() : this.tableService.unsort();
    this.host.columnAction.emit({
      type: TableColumnActionType.Unsort,
      payload: column,
    });
  }

  clearColumn(column: TableColumn) {
    for (const row of this.tableRowService.rows()) {
      row.data ||= {};
      row.data[column.id] = null;
    }
    if (this.groupedColumns.size > 0) {
      if (column.groupSortType) {
        this.tableService.group();
      }
    } else {
      if (column.calculateType) {
        this.tableService.calculate();
      }
      if (column.sortType) {
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
            this.host.virtualScroll.scrollLeft,
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
          offset -= this.host.virtualScroll.scrollLeft;
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

    moveItemInArray(this.columns(), previousIndex, currentIndex);
    this.columns.update((arr) => [...arr]);
    this.host.columnAction.emit({
      type: TableColumnActionType.Move,
      payload: {
        column: this.columnAt(currentIndex),
        position: currentIndex,
      },
    });
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
        icon: 'pi pi-eye-slash',
        command: () => {
          this.hideSelectedColumns();
        },
      });
      if (config.deletable) {
        items.push({
          label: 'Delete selected columns',
          icon: 'pi pi-trash',
          command: () => {
            this.host.deleteConfirmation(
              'Do you want to delete the selected columns?',
              'Delete columns',
              () => this.deleteSelectedColumns(),
              void 0,
            );
          },
        });
      }
    } else {
      if (config.freezable) {
        items.push(
          {
            label: 'Freeze up to This Column',
            icon: 'pi pi-sign-in',
            command: () => {
              this.tableService.setFrozenCount(columnIndex);
            },
          },
          { separator: true },
        );
      }
      if (config.sortable) {
        items.push(
          {
            label: 'Sort up',
            icon: 'pi pi-sort-amount-up',
            command: () => {
              this.sortByColumn(column, 'asc');
            },
          },
          {
            label: 'Sort down',
            icon: 'pi pi-sort-amount-down',
            command: () => {
              this.sortByColumn(column, 'desc');
            },
          },
          { separator: true },
        );
      }
      if (config.groupable) {
        items.push(
          {
            label: 'Group',
            icon: 'pi pi-list',
            items: [
              {
                label: 'Ascending',
                command: () => {
                  this.groupByColumn(column, 'asc');
                },
              },
              {
                label: 'Descending',
                command: () => {
                  this.groupByColumn(column, 'desc');
                },
              },
            ],
          },
          { separator: true },
        );
      }
      if (config.hideable) {
        items.push(
          {
            label: 'Hide',
            icon: 'pi pi-eye-slash',
            command: () => {
              this.hideColumn(column);
            },
          },
          { separator: true },
        );
      }
      if (config.deletable) {
        items.push({
          label: 'Delete',
          icon: 'pi pi-trash',
          command: () => {
            this.host.deleteConfirmation(
              'Do you want to delete this column?',
              'Delete column',
              () => this.deleteColumn(column),
              void 0,
            );
          },
        });
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
