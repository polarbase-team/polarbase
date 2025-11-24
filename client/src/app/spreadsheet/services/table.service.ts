import _ from 'lodash';
import {
  ChangeDetectorRef,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
  NgZone,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, mergeMap, of, Subject, take, throttleTime } from 'rxjs';

import { calculateBy, calculateFieldPredicate } from '../utils/calculate';
import { groupBy } from '../utils/group';
import { sortBy } from '../utils/sort';
import { searchBy } from '../utils/search';
import { DataType } from '../field/interfaces';
import type { CellIndex, CellOffset } from './table-cell.service';
import { TableBaseService } from './table-base.service';
import { FieldCellService } from '../components/field-cell/field-cell.service';
import { TableGroup } from '../models/table-group';
import { TableConfig } from '../models/table';
import { TableRow } from '../models/table-row';
import { TableColumn } from '../models/table-column';
import { TableCell } from '../models/table-cell';
import { TableSearchInfo } from '../events/table';

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

export type LayoutProps = Partial<{
  frozenDivider: {
    isHover?: boolean;
    isHideHeadLine?: boolean;
    dragHandleOffset?: number;
    dragging?: { index: number; offset: number };
  };
  fillHandler: {
    index?: CellIndex;
    offset?: CellOffset;
    hidden?: boolean;
  };
  column: {
    dragPlaceholderIndex?: number;
    dragPlaceholderOffset?: number;
    selection?: Set<number>;
  };
  row: {
    dragOverGroup?: TableGroup;
    dragPlaceholderIndex?: number;
    dragPlaceholderOffset?: number;
  };
  cell: {
    focusing?: CellIndex;
    hovering?: CellIndex;
    filling?: {
      start: CellIndex;
      end: CellIndex;
      isReverse: boolean;
    };
    selection?: {
      primary: CellIndex;
      start: CellIndex;
      end: CellIndex;
      rowCount: number;
      columnCount: number;
      count: number;
    };
    searching?: {
      found: Map<TableRow['id'], Map<TableColumn['id'], TableCell>>;
      resultIndex: number;
    };
    invalid?: CellIndex;
  };
}>;

const DEFAULT_CONFIG: TableConfig = {
  streamData: false,
  sideSpacing: 0,
  column: {
    frozenIndex: 0,
    maxFrozenRatio: 0.65,
    defaultWidth: 180,
    minWidth: 100,
    maxWidth: 500,
    arrangeable: true,
    calculable: true,
    creatable: true,
    editable: true,
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
    arrangeable: true,
    expandable: true,
    creatable: true,
    insertable: true,
    deletable: true,
  },
  cell: {
    fillable: false,
  },
};

@Injectable()
export class TableService extends TableBaseService {
  config = computed<TableConfig>(() => {
    const config = _.defaultsDeep(this.host.sourceConfig(), DEFAULT_CONFIG);
    this.isDataStreaming ??= config.streamData;
    return config;
  });

  layoutProps: LayoutProps = {
    frozenDivider: {},
    fillHandler: {},
    column: {},
    row: {},
    cell: {},
  };
  streamData$: Subject<TableRow[]>;
  isDataStreaming: boolean;
  searchResult: [TableRow, TableColumn][];
  calculatedResult: Map<TableColumn['id'], any>;

  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private eleRef = inject(ElementRef);
  private fieldCellService = inject(FieldCellService);

  get searchInfo(): TableSearchInfo {
    const total = this.searchResult?.length || 0;
    const { searching } = this.layoutProps.cell;
    const current = total > 0 ? searching?.resultIndex + 1 : 0;

    return { current, total };
  }

  override onInit() {
    if (!this.isDataStreaming) return;

    this.streamData$ = new Subject();

    this.ngZone.runOutsideAngular(() => {
      this.streamData$
        .pipe(
          throttleTime(200),
          mergeMap((rows) => of(rows)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (rows) => {
            this.tableRowService.markRowsAsStreamed(rows);
            this.cdr.detectChanges();
          },
          error: () => {
            throw new Error('Stream error');
          },
          complete: () => {
            this.isDataStreaming = false;
            this.handleDataUpdate();
            this.cdr.detectChanges();
          },
        });
    });
  }

  handleDataUpdate = _.throttle(() => {
    if (this.isDataStreaming) return;

    if (this.shouldGroup()) {
      this.group();
    } else {
      this.sort();
      this.calculate();
    }

    // Flushes the selecting state if the selecting row has been rearranged or changed.
    // Ensures that the current selecting cell state is consistent with the actual layout.
    const currSelection = this.layoutProps.cell.selection;
    if (!currSelection?.primary) return;

    const state = this.fieldCellService.getSelectingState();
    if (!state?.detectChange()) return;

    const cell = this.tableCellService.findCellByIndex(currSelection.primary);
    if (cell && this.tableCellService.compareCell(cell, state.cell)) return;

    this.tableCellService.flushSelectingCellState();
  }, 1000);

  shouldCalculate() {
    return !!this.config().calculateBy || this.tableColumnService.calculatedColumns.size > 0;
  }

  shouldGroup() {
    return !!this.config().groupBy || this.tableColumnService.groupedColumns.size > 0;
  }

  shouldSort() {
    return !!this.config().sortBy || this.tableColumnService.sortedColumns.size > 0;
  }

  search(searchQuery: string) {
    let searchResult: [TableRow, TableColumn][];
    let searching;
    let focusing;

    if (searchQuery) {
      const data: [TableRow, TableColumn][] = [];

      const searchColumns = _.filter(this.tableColumnService.columns(), (c) =>
        _.includes([DataType.Text, DataType.Date, DataType.Number], c.field.dataType),
      );

      for (const row of this.tableRowService.rows()) {
        for (const column of searchColumns) {
          data.push([row, column]);
        }
      }

      searchResult = searchBy(
        data,
        searchQuery,
        this.tableCellService.searchCellPredicate.bind(this),
      );

      if (searchResult.length) {
        const found = new Map();
        let focusingRowIndex: number;
        let focusingColumnIndex: number;

        for (let i = 0; i < searchResult.length; i++) {
          const [row, column] = searchResult[i];
          const rowID = row.id;
          const columnID = column.id;
          const m = found.get(rowID) || new Map();

          m.set(columnID, { row, column });

          found.set(rowID, m);

          if (i > 0) continue;

          focusingRowIndex = this.tableRowService.findRowIndex(row);
          focusingColumnIndex = this.tableColumnService.findColumnIndex(column);
        }

        searching = { found, resultIndex: 0 };

        focusing = {
          rowIndex: focusingRowIndex,
          columnIndex: focusingColumnIndex,
        };
      }
    }

    this.searchResult = searchResult;
    this.layoutProps.cell.searching = searching;
    this.layoutProps.cell.focusing = focusing;

    if (focusing) {
      this.tableCellService.scrollToFocusingCell();
    }

    this.cdr.markForCheck();
  }

  searchPrevious(previousIndex: number) {
    const searchResult = this.searchResult[previousIndex];
    if (!searchResult) return;
    const [row, column] = searchResult;

    this.layoutProps.cell.searching.resultIndex = previousIndex;

    this.layoutProps.cell.focusing = {
      rowIndex: this.tableRowService.findRowIndex(row),
      columnIndex: this.tableColumnService.findColumnIndex(column),
    };

    this.tableCellService.scrollToFocusingCell();
    this.cdr.markForCheck();
  }

  searchNext(nextIndex: number) {
    const searchResult = this.searchResult[nextIndex];
    if (!searchResult) return;
    const [row, column] = searchResult;

    this.layoutProps.cell.searching.resultIndex = nextIndex;

    this.layoutProps.cell.focusing = {
      rowIndex: this.tableRowService.findRowIndex(row),
      columnIndex: this.tableColumnService.findColumnIndex(column),
    };

    this.tableCellService.scrollToFocusingCell();
    this.cdr.markForCheck();
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

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.tableGroupService.isGrouping()) {
      this.tableGroupService.calculateInGroup(columns);
      this.calculatedResult = this.tableGroupService.rootGroup().calculatedResult;
    } else {
      if (this.calculatedResult) {
        this.calculatedResult.clear();
      } else {
        this.calculatedResult = new Map();
      }

      for (const column of columns) {
        this.calculatedResult.set(
          column.id,
          calculateBy(
            _.map(this.tableRowService.rows(), 'data'),
            column.calculateType,
            calculateFieldPredicate.bind(this, column.field),
            column?.field,
          ),
        );
      }
    }

    this.cdr.markForCheck();
  }

  uncalculate() {
    for (const column of this.tableColumnService.calculatedColumns.values()) {
      delete column.calculateType;
    }

    this.tableColumnService.calculatedColumns.clear();
    this.calculatedResult.clear();

    this.cdr.markForCheck();
  }

  group(columns?: TableColumn[]) {
    if (columns) {
      this.tableColumnService.groupedColumns.clear();
      this.tableGroupService.collapsedState.clear();

      for (const column of columns) {
        this.tableColumnService.groupedColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.groupedColumns.size) {
      columns = [...this.tableColumnService.groupedColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    const rootGroup = groupBy(this.host.sourceRows(), columns, (group: TableGroup) => {
      group.collapsed = this.tableGroupService.collapsedState.get(group.id);
    });
    this.tableGroupService.rootGroup.update(() => rootGroup);

    this.sort();
    this.calculate();

    this.host.updateStates();
    this.cdr.markForCheck();
  }

  ungroup() {
    this.tableGroupService.rootGroup.update(() => null);

    for (const column of this.tableColumnService.groupedColumns.values()) {
      delete column.groupSortType;
    }

    this.tableColumnService.groupedColumns.clear();
    this.tableGroupService.collapsedState.clear();

    this.host.updateStates();
    this.cdr.markForCheck();
  }

  sort(columns?: TableColumn[]) {
    if (columns) {
      this.tableColumnService.sortedColumns.clear();

      for (const column of columns) {
        this.tableColumnService.sortedColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.sortedColumns.size) {
      columns = [...this.tableColumnService.sortedColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.tableGroupService.isGrouping()) {
      this.tableGroupService.sortInGroup(columns);
    } else {
      this.tableRowService.rows.update(() => sortBy(this.host.sourceRows(), columns));
    }

    this.host.updateStates();
    this.cdr.markForCheck();
  }

  unsort() {
    for (const column of this.tableColumnService.sortedColumns.values()) {
      delete column.sortType;
    }

    this.tableColumnService.sortedColumns.clear();

    if (this.tableGroupService.isGrouping()) {
      this.tableGroupService.unsortInGroup();
    } else {
      this.tableRowService.rows.update(() => this.host.sourceRows());
    }

    this.cdr.markForCheck();
  }

  updateFillHandlerPosition(
    index: CellIndex = this.layoutProps.cell.selection.end,
    shouldRetryOnMissingCell?: boolean,
  ) {
    const ele = this.tableCellService.findCellElementByIndex(index);

    if (!ele) {
      this.layoutProps.fillHandler.hidden = true;

      if (shouldRetryOnMissingCell) {
        of([1, 2, 3])
          .pipe(delay(500), take(1))
          .subscribe(() => {
            this.updateFillHandlerPosition(index);
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

    this.layoutProps.fillHandler.index = index;
    this.layoutProps.fillHandler.offset = offset;
    this.layoutProps.fillHandler.hidden = false;

    this.cdr.detectChanges();
  }
}
