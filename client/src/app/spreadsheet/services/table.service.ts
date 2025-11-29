import _ from 'lodash';
import {
  ChangeDetectorRef,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
} from '@angular/core';
import { CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, mergeMap, of, Subject, take, throttleTime } from 'rxjs';

import { getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { calculateBy, makeUpCalculatedData } from '../utils/calculate';
import { groupBy } from '../utils/group';
import { sortBy } from '../utils/sort';
import { searchBy } from '../utils/search';
import type { CellIndex, CellOffset } from './table-cell.service';
import { TableBaseService } from './table-base.service';
import { FieldCellService } from '../components/field-cell/field-cell.service';
import { TableGroup } from '../models/table-group';
import { TableConfig } from '../models/table';
import { TableRow } from '../models/table-row';
import { TableColumn } from '../models/table-column';
import { TableCell } from '../models/table-cell';
import { TableActionType, TableSearchInfo } from '../events/table';

export const Dimension = {
  HeaderHeight: 36,
  BodyVerticalPadding: 12,
  FooterHeight: 42,
  FreezeDividerDragHandleHeight: 40,
  IndexCellWidth: 64,
  IndexCellSmallWidth: 56,
  ActionCellWidth: 56,
  BlankRowHeight: 32,
  GroupHeaderHeight: 32,
  GroupPadding: 20,
  GroupSpacing: 20,
} as const;

export type Layout = Partial<{
  freezeHandle: {
    isHovered?: boolean;
    isHideHeadLine?: boolean;
    isDragging?: boolean;
    dragOffsetY?: number;
    dragTargetIndex?: number;
    dragTargetOffsetX?: number;
  };
  fillHandle: {
    index?: CellIndex;
    offset?: CellOffset;
    hidden?: boolean;
  };
  column: {
    dragTargetIndex?: number;
    dragTargetOffsetX?: number;
    selectedIndices?: Set<number>;
  };
  row: {
    dragTargetGroup?: TableGroup;
    dragTargetIndex?: number;
    dragTargetOffsetY?: number;
  };
  cell: {
    focused?: CellIndex;
    hovered?: CellIndex;
    fill?: {
      start: CellIndex;
      end: CellIndex;
      isReverse: boolean;
    };
    selection?: {
      anchor: CellIndex;
      start: CellIndex;
      end: CellIndex;
      rowCount: number;
      columnCount: number;
      count: number;
    };
    search?: {
      matches: Map<TableRow['id'], Map<TableColumn['id'], TableCell>>;
      currentMatchIndex: number;
    };
    invalid?: CellIndex;
  };
}>;

const DEFAULT_CONFIG: TableConfig = {
  dataStream: false,
  sideSpacing: 0,
  column: {
    frozenCount: 0,
    maxFrozenRatio: 0.65,
    defaultWidth: 180,
    minWidth: 100,
    maxWidth: 500,
    reorderable: true,
    calculable: true,
    addable: true,
    deletable: true,
    freezable: true,
    groupable: true,
    hideable: true,
    resizable: true,
    sortable: true,
  },
  row: {
    size: 'M',
    selectable: true,
    reorderable: true,
    expandable: true,
    addable: true,
    insertable: true,
    deletable: true,
  },
  cell: {
    fillable: true,
    clearable: true,
    editable: true,
  },
};

function calculateFreezeDividerDragPlaceholderIndex(
  columns: TableColumn[],
  offsetX: number,
  scrollLeft: number,
  frozenCount: number,
) {
  let dragTargetIndex = 0;

  for (let i = 0; i < columns.length; i++) {
    let a = getColumnOffset(columns[i]);
    let b = getColumnOffset(columns[i + 1]) || a;

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
export class TableService extends TableBaseService {
  config = computed<TableConfig>(() => {
    const config = _.defaultsDeep(this.host.sourceConfig(), DEFAULT_CONFIG);
    this.isStreaming ??= config.dataStream;
    return config;
  });

  frozenCount = computed(() => {
    const columns = this.tableColumnService.columns();
    let frozenCount = this.config().column.frozenCount;
    if (columns && frozenCount > columns.length - 1) {
      frozenCount = columns.length - 1;
    }
    return frozenCount;
  });

  layout: Layout = {
    freezeHandle: {},
    fillHandle: {},
    column: {},
    row: {},
    cell: {},
  };
  dataStream$: Subject<TableRow[]>;
  isStreaming: boolean;
  searchResults: [TableRow, TableColumn][];
  calcResults: Map<TableColumn['id'], any>;

  private cdRef = inject(ChangeDetectorRef);
  private eleRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private fieldCellService = inject(FieldCellService);

  get searchInfo(): TableSearchInfo {
    const total = this.searchResults?.length || 0;
    const { search } = this.layout.cell;
    const current = total > 0 ? search?.currentMatchIndex + 1 : 0;
    return { current, total };
  }

  override onInit() {
    if (!this.isStreaming) return;

    this.dataStream$ = new Subject();
    this.dataStream$
      .pipe(
        throttleTime(200),
        mergeMap((rows) => of(rows)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.tableRowService.markRowsAsStreamed(rows);
        },
        error: () => {
          throw new Error('Stream error');
        },
        complete: () => {
          this.isStreaming = false;
          this.refreshView();
        },
      });
  }

  refreshView = _.throttle(() => {
    if (this.isStreaming) return;

    if (this.tableColumnService.groupedColumns.size > 0) {
      this.group();
    } else {
      this.sort();
      this.calculate();
    }

    // Flushes the selecting state if the selecting row has been rearranged or changed.
    // Ensures that the current selecting cell state is consistent with the actual layout.
    const currSelection = this.layout.cell.selection;
    if (!currSelection?.anchor) return;

    const state = this.fieldCellService.getSelectingState();
    if (!state?.detectChange()) return;

    const cell = this.tableCellService.cellAt(currSelection.anchor);
    if (cell && this.tableCellService.isSameCell(cell, state.cell)) return;

    this.tableCellService.flushSelectingCellState();
  }, 1000);

  search(searchQuery: string) {
    let searchResults: [TableRow, TableColumn][];
    let search;
    let focused;

    if (searchQuery) {
      const data: [TableRow, TableColumn][] = [];

      for (const row of this.tableRowService.rows()) {
        for (const column of this.tableColumnService.columns()) {
          data.push([row, column]);
        }
      }

      searchResults = searchBy(
        data,
        searchQuery,
        this.tableCellService.searchCellPredicate.bind(this),
      );

      if (searchResults.length) {
        const found = new Map();
        let focusedRowIndex: number;
        let focusedColumnIndex: number;

        for (let i = 0; i < searchResults.length; i++) {
          const [row, column] = searchResults[i];
          const rowID = row.id;
          const columnID = column.id;
          const m = found.get(rowID) || new Map();

          m.set(columnID, { row, column });
          found.set(rowID, m);

          if (i > 0) continue;

          focusedRowIndex = this.tableRowService.findRowIndex(row);
          focusedColumnIndex = this.tableColumnService.findColumnIndex(column);
        }

        search = { found, resultIndex: 0 };
        focused = {
          rowIndex: focusedRowIndex,
          columnIndex: focusedColumnIndex,
        };
      }
    }

    this.searchResults = searchResults;
    this.layout.cell.search = search;
    this.layout.cell.focused = focused;

    if (focused) {
      this.tableCellService.scrollToFocusedCell();
    }
  }

  searchPrevious(previousIndex: number) {
    const searchResults = this.searchResults[previousIndex];
    if (!searchResults) return;

    const [row, column] = searchResults;
    this.layout.cell.search.currentMatchIndex = previousIndex;
    this.layout.cell.focused = {
      rowIndex: this.tableRowService.findRowIndex(row),
      columnIndex: this.tableColumnService.findColumnIndex(column),
    };
    this.tableCellService.scrollToFocusedCell();
  }

  searchNext(nextIndex: number) {
    const searchResults = this.searchResults[nextIndex];
    if (!searchResults) return;

    const [row, column] = searchResults;
    this.layout.cell.search.currentMatchIndex = nextIndex;
    this.layout.cell.focused = {
      rowIndex: this.tableRowService.findRowIndex(row),
      columnIndex: this.tableColumnService.findColumnIndex(column),
    };
    this.tableCellService.scrollToFocusedCell();
  }

  calculate(columns?: TableColumn[]) {
    if (columns) {
      this.tableColumnService.calculatedColumns.clear();
      for (const column of columns) {
        if (!column.calculateType) continue;
        this.tableColumnService.calculatedColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.calculatedColumns.size) {
      columns = [...this.tableColumnService.calculatedColumns.values()];
    }

    if (this.isStreaming || !columns?.length) return;

    if (this.tableGroupService.isGrouped()) {
      this.tableGroupService.calculateInGroup(columns);
      this.calcResults = this.tableGroupService.rootGroup().calcResults;
    } else {
      if (this.calcResults) {
        this.calcResults.clear();
      } else {
        this.calcResults = new Map();
      }

      for (const column of columns) {
        const data = [];
        for (const row of this.tableRowService.rows()) {
          data.push(makeUpCalculatedData(row.data[column.id], column.calculateType));
        }
        this.calcResults.set(column.id, calculateBy(data, column.calculateType));
      }
    }
  }

  uncalculate() {
    for (const column of this.tableColumnService.calculatedColumns.values()) {
      delete column.calculateType;
    }

    this.tableColumnService.calculatedColumns.clear();
    this.calcResults.clear();
  }

  group(columns?: TableColumn[]) {
    if (columns) {
      this.tableColumnService.groupedColumns.clear();
      this.tableGroupService.collapsedGroupIds.clear();

      for (const column of columns) {
        if (!column.groupSortType) continue;
        this.tableColumnService.groupedColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.groupedColumns.size) {
      columns = [...this.tableColumnService.groupedColumns.values()];
    }

    if (this.isStreaming || !columns?.length) return;

    const rootGroup = groupBy(this.host.sourceRows(), columns, (group: TableGroup) => {
      group.isCollapsed = this.tableGroupService.collapsedGroupIds.has(group.id);
    });
    this.tableGroupService.rootGroup.update(() => rootGroup);

    this.sort();
    this.calculate();
  }

  ungroup() {
    this.tableGroupService.rootGroup.update(() => null);

    for (const column of this.tableColumnService.groupedColumns.values()) {
      delete column.groupSortType;
    }

    this.tableColumnService.groupedColumns.clear();
    this.tableGroupService.collapsedGroupIds.clear();
  }

  sort(columns?: TableColumn[]) {
    if (columns) {
      this.tableColumnService.sortedColumns.clear();

      for (const column of columns) {
        if (!column.sortType) continue;
        this.tableColumnService.sortedColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.sortedColumns.size) {
      columns = [...this.tableColumnService.sortedColumns.values()];
    }

    if (this.isStreaming || !columns?.length) return;

    if (this.tableGroupService.isGrouped()) {
      this.tableGroupService.sortInGroup(columns);
    } else {
      this.tableRowService.rows.update(() => sortBy(this.host.sourceRows(), columns));
    }
  }

  unsort() {
    for (const column of this.tableColumnService.sortedColumns.values()) {
      delete column.sortType;
    }

    this.tableColumnService.sortedColumns.clear();

    if (this.tableGroupService.isGrouped()) {
      this.tableGroupService.unsortInGroup();
    } else {
      this.tableRowService.rows.update(() => this.host.sourceRows());
    }
  }

  onFreezeDividerMousemove(e: MouseEvent) {
    this.layout.freezeHandle.isHovered = true;
    this.layout.freezeHandle.dragOffsetY = e.offsetY - Dimension.FreezeDividerDragHandleHeight / 2;
  }

  onFreezeDividerMouseleave() {
    this.layout.freezeHandle.isHovered = false;
  }

  onFreezeDividerDragStarted() {
    this.host.virtualScroll.scrollToLeft();
    this.layout.freezeHandle.isDragging = true;
  }

  onFreezeDividerDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.host.virtualScroll.measurePointerOffset(e.pointerPosition);
    const index = calculateFreezeDividerDragPlaceholderIndex(
      this.tableColumnService.columns(),
      pointerOffsetX,
      this.host.virtualScroll.scrollLeft,
      this.frozenCount(),
    );
    const offset = getColumnOffset(this.tableColumnService.columnAt(index));
    if (offset / this.host.virtualScroll.viewport.width > this.config().column.maxFrozenRatio) {
      return;
    }
    this.layout.freezeHandle.dragTargetIndex = index;
    this.layout.freezeHandle.dragTargetOffsetX = offset + this.config().sideSpacing;
  }

  onFreezeDividerDragEnded(e: CdkDragEnd) {
    const { dragTargetIndex } = this.layout.freezeHandle;
    if (dragTargetIndex === null) return;

    this.setFrozenCount(dragTargetIndex - 1);
    this.layout.freezeHandle.isDragging = false;
    this.layout.freezeHandle.dragTargetIndex = null;
    this.layout.freezeHandle.dragTargetOffsetX = null;
    e.source._dragRef.reset();
  }

  setFrozenCount(index: number) {
    if (index === this.frozenCount()) return;

    this.config().column.frozenCount = index;
    this.tableColumnService.columns.update((arr) => [...arr]);
    this.host.action.emit({
      type: TableActionType.Freeze,
      payload: index,
    });
  }

  positionFillHandle(index = this.layout.cell.selection.end, retryIfNotRendered?: boolean) {
    const ele = this.tableCellService.cellElementAt(index);

    if (!ele) {
      this.layout.fillHandle.hidden = true;
      if (retryIfNotRendered) {
        of([1, 2, 3])
          .pipe(delay(500), take(1))
          .subscribe(() => {
            this.positionFillHandle(index);
          });
      }
      return;
    }

    const eleDOMRect = ele.getBoundingClientRect();
    const containerDOMRect = this.eleRef.nativeElement.getBoundingClientRect();
    const offset: CellOffset = {
      left: eleDOMRect.width + eleDOMRect.left - containerDOMRect.left,
      top:
        eleDOMRect.height +
        eleDOMRect.top -
        containerDOMRect.top +
        Dimension.BodyVerticalPadding / 2 -
        Dimension.FooterHeight,
    };

    this.layout.fillHandle.index = index;
    this.layout.fillHandle.offset = offset;
    this.layout.fillHandle.hidden = false;
    this.cdRef.detectChanges();
  }
}
