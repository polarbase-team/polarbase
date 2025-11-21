import _ from 'lodash';

import {
  ChangeDetectorRef,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
  NgZone,
  SimpleChanges,
} from '@angular/core';
import { calculateBy, calculateFieldPredicate, CalculateType } from '../../helpers/calculate';
import { groupBy, GroupingType } from '../../helpers/group';
import { sortBy, SortingType } from '../../helpers/sort';
import type { Cell, CellIndex, CellOffset } from './table-cell.service';
import type { Column } from './table-column.service';
import type { Group } from './table-group.service';
import type { Row, RowSize } from './table-row.service';
import { delay, mergeMap, of, Subject, take, throttleTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataType } from '../../field/interfaces';
import { searchBy } from '../../helpers/search';
import { TableBaseService } from './table-base.service';
import { FieldCellService } from '../sub-components/cells/field-cell.service';

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

export type SearchInfo = {
  total: number;
  current: number;
};

export type Config = Partial<{
  sideSpacing?: number;
  streamData: boolean;
  calculating: [Column | Column['id'], CalculateType][];
  grouping: [Column | Column['id'], GroupingType][];
  sorting: [Column | Column['id'], SortingType][];
  column: {
    frozenIndex?: number | null;
    maxFrozenRatio?: number;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    arrangeable?: boolean;
    calculable?: boolean;
    creatable?: boolean;
    editable?: boolean;
    deletable?: boolean;
    freezable?: boolean;
    groupable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    sortable?: boolean;
  };
  row: {
    size?: RowSize;
    selectable?: boolean;
    arrangeable?: boolean;
    expandable?: boolean;
    creatable?: boolean;
    insertable?: boolean;
    deletable?: boolean;
  };
  cell: {
    fillable?: boolean;
  };
}>;

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
    dragOverGroup?: Group;
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
      found: Map<Row['id'], Map<Column['id'], Cell>>;
      resultIndex: number;
    };
    invalid?: CellIndex;
  };
}>;

const DEFAULT_CONFIG: Config = {
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
  readonly layoutProps: LayoutProps = {
    frozenDivider: {},
    fillHandler: {},
    column: {},
    row: {},
    cell: {},
  };
  streamData$: Subject<Row[]>;
  isDataStreaming: boolean;
  searchResult: [Row, Column][];
  calculatedResult: Map<Column['id'], any>;

  private readonly _ngZone = inject(NgZone);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _cdRef = inject(ChangeDetectorRef);
  private readonly _elementRef = inject(ElementRef);
  private readonly _fieldCellService = inject(FieldCellService);

  get shouldCalculate() {
    return !!this.host.config.calculating || this.tableColumnService.calculatingColumns.size > 0;
  }

  get shouldGroup() {
    return !!this.host.config.grouping || this.tableColumnService.groupingColumns.size > 0;
  }

  get shouldSort() {
    return !!this.host.config.sorting || this.tableColumnService.sortingColumns.size > 0;
  }

  get actionBoxOffset() {
    return (this.host.config.column.calculable ? Dimension.FooterHeight : 0) + 16;
  }

  get searchInfo(): SearchInfo {
    const total = this.searchResult?.length || 0;
    const { searching } = this.layoutProps.cell;
    const current = total > 0 ? searching?.resultIndex + 1 : 0;

    return { current, total };
  }

  get selectedRowsArr(): Row[] {
    return [...this.tableRowService.selectedRows];
  }

  override onChanges(changes: SimpleChanges) {
    if ('config' in changes) {
      this.host.config = _.defaultsDeep(this.host.config, DEFAULT_CONFIG);
      this.isDataStreaming ??= this.host.config.streamData;
    }
  }

  override onInit() {
    if (!this.isDataStreaming) return;

    this.streamData$ = new Subject();

    this._ngZone.runOutsideAngular(() => {
      this.streamData$
        .pipe(
          throttleTime(200),
          mergeMap((rows) => of(rows)),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe({
          next: (rows) => {
            this.tableRowService.markRowsAsStreamed(rows);
            this._cdRef.detectChanges();
          },
          error: () => {
            throw new Error('Stream error');
          },
          complete: () => {
            this.isDataStreaming = false;
            this.handleDataUpdate();
            this._cdRef.detectChanges();
          },
        });
    });
  }

  override updateStates() {
    this.state.actionBoxOffset = this.actionBoxOffset;
  }

  handleDataUpdate = _.throttle(() => {
    if (this.isDataStreaming) return;

    if (this.shouldGroup) {
      this.group();
    } else {
      this.sort();
      this.calculate();
    }

    // Flushes the selecting state if the selecting row has been rearranged or changed.
    // Ensures that the current selecting cell state is consistent with the actual layout.
    const currSelection = this.layoutProps.cell.selection;
    if (!currSelection?.primary) return;

    const state = this._fieldCellService.getSelectingState();
    if (!state?.detectChange()) return;

    const cell = this.tableCellService.findCellByIndex(currSelection.primary);
    if (cell && this.tableCellService.compareCell(cell, state.cell)) return;

    this.tableCellService.flushSelectingCellState();
  }, 1000);

  search(searchQuery: string) {
    let searchResult: [Row, Column][];
    let searching;
    let focusing;

    if (searchQuery) {
      const data: [Row, Column][] = [];

      const searchColumns = _.filter(this.tableColumnService.displayingColumns, (c) =>
        _.includes([DataType.Text, DataType.Date, DataType.Number], c.field.dataType),
      );

      for (const row of this.host.rows) {
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

    this._cdRef.markForCheck();
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
    this._cdRef.markForCheck();
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
    this._cdRef.markForCheck();
  }

  calculate(columns?: Column[]) {
    if (columns) {
      this.tableColumnService.calculatingColumns.clear();
      for (const column of columns) {
        if (!column.calculateType) continue;
        this.tableColumnService.calculatingColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.calculatingColumns.size) {
      columns = [...this.tableColumnService.calculatingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.calculateInGroup(columns);
      this.calculatedResult = this.tableGroupService.rootGroup.metadata.calculatedResult;
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
            _.map(this.host.rows, 'data'),
            column.calculateType,
            calculateFieldPredicate.bind(this, column.field),
            column?.field,
          ),
        );
      }
    }

    this._cdRef.markForCheck();
  }

  uncalculate() {
    for (const column of this.tableColumnService.calculatingColumns.values()) {
      delete column.calculateType;
    }

    this.tableColumnService.calculatingColumns.clear();
    this.calculatedResult.clear();

    this._cdRef.markForCheck();
  }

  group(columns?: Column[]) {
    if (columns) {
      this.tableColumnService.groupingColumns.clear();
      this.tableGroupService.collapsedGroupState.clear();

      for (const column of columns) {
        this.tableColumnService.groupingColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.groupingColumns.size) {
      columns = [...this.tableColumnService.groupingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    this.tableGroupService.rootGroup = groupBy(
      this.host.rows,
      this.tableColumnService.groupColumnPredicate.bind(this, columns),
      this.tableGroupService.sortGroupPredicate.bind(this, columns),
      this.tableGroupService.parseGroupMetadataPredicate.bind(this, columns),
      this.tableGroupService.groupDepth,
    );

    this.sort();
    this.calculate();

    this.tableGroupService.checkCanAddRowInGroup();
    this.host.updateStates();
    this._cdRef.markForCheck();
  }

  ungroup() {
    this.tableGroupService.rootGroup = null;

    for (const column of this.tableColumnService.groupingColumns.values()) {
      delete column.groupingType;
    }

    this.tableColumnService.groupingColumns.clear();
    this.tableGroupService.collapsedGroupState.clear();

    this.tableGroupService.disableAddRowInGroup = false;

    this.host.updateStates();
    this._cdRef.markForCheck();
  }

  sort(columns?: Column[]) {
    if (columns) {
      this.tableColumnService.sortingColumns.clear();

      for (const column of columns) {
        this.tableColumnService.sortingColumns.set(column.id, column);
      }
    } else if (this.tableColumnService.sortingColumns.size) {
      columns = [...this.tableColumnService.sortingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.sortInGroup(columns);
    } else {
      this.tableRowService.bkRows ||= [...this.host.rows];
      this.host.rows = sortBy(
        this.host.rawRows,
        this.tableColumnService.sortColumnPredicate.bind(this, columns),
        columns.length,
      );
    }

    this.host.updateStates();
    this._cdRef.markForCheck();
  }

  unsort() {
    for (const column of this.tableColumnService.sortingColumns.values()) {
      delete column.sortingType;
    }

    this.tableColumnService.sortingColumns.clear();

    if (this.tableGroupService.isGrouping) {
      this.tableGroupService.unsortInGroup();
    } else {
      this.host.rows = _.chain(this.tableRowService.bkRows)
        .without(..._.difference(this.tableRowService.bkRows, this.host.rows))
        .concat(..._.difference(this.host.rows, this.tableRowService.bkRows))
        .value();
      this.tableRowService.bkRows = null;
    }

    this._cdRef.markForCheck();
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
    const containerDOMRect = this._elementRef.nativeElement.getBoundingClientRect();
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

    this._cdRef.detectChanges();
  }
}
