import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  IterableChanges,
  IterableDiffer,
  IterableDiffers,
  OnDestroy,
  Output,
} from '@angular/core';

import { Dimension } from '../../services/table.service';

import type { _Scrolling } from './virtual-scroll.component';
import {
  _COLUMN_TRACK_BY_FN,
  _findColumnInsideViewport,
  _makeUpColumnViewProps,
} from './virtual-scroll-column-repeater.directive';
import {
  _findGroupInsideViewport,
  _GROUP_TRACK_BY_FN,
  _makeUpGroupViewProps,
} from './virtual-scroll-group-repeater.directive';
import {
  _findRowInsideViewport,
  _makeUpRowViewProps,
  _ROW_TRACK_BY_FN,
} from './virtual-scroll-row-repeater.directive';
import {
  VirtualScrollLeftContentWrapperComponent as VSLeftCWComponent,
  VirtualScrollRightContentWrapperComponent as VSRightCWComponent,
} from './virtual-scroll-content-wrapper.component';
import { TableColumn } from '../../models/table-column';
import { TableRow } from '../../models/table-row';
import { TableGroup } from '../../models/table-group';

export type ViewportSizeUpdatedEvent = {
  updateOnWidth: boolean;
  updateOnHeight: boolean;
  size: {
    width: number;
    height: number;
    leftWidth: number;
    rightWidth: number;
    contentWidth: number;
    contentHeight: number;
  };
};

@Component({
  selector: '[virtualScrollViewport]',
  exportAs: 'virtualScrollViewport',
  template: '<ng-content></ng-content>',
  styles: [':host { overflow: hidden; contain: strict; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollViewportComponent implements AfterContentInit, DoCheck, OnDestroy {
  @ContentChild(VSLeftCWComponent, { static: true })
  leftWrapper: VSLeftCWComponent;
  @ContentChild(VSRightCWComponent, { static: true })
  rightWrapper: VSRightCWComponent;

  @Output() readonly sizeUpdated: EventEmitter<ViewportSizeUpdatedEvent> =
    new EventEmitter<ViewportSizeUpdatedEvent>();

  private readonly _cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly _elementRef: ElementRef = inject(ElementRef);
  private readonly _iterableDiffers: IterableDiffers = inject(IterableDiffers);
  private readonly _resizeObserve: ResizeObserver = new ResizeObserver(this._onResized.bind(this));

  private _leftColumns: TableColumn[];
  private _rightColumns: TableColumn[];
  private _leftColumnDs: TableColumn[];
  private _rightColumnDs: TableColumn[];
  private _rows: TableRow[];
  private _rowDs: TableRow[];
  private _rootGroup: TableGroup;
  private _groupDs: TableGroup[];
  private _rowHeight: number;
  private _groupDepth: number;
  private _leftWidth: number;
  private _rightWidth: number;
  private _rawLeftWidth: number;
  private _rawRightWidth: number;
  private _contentWidth: number;
  private _contentHeight: number;
  private _isGrouping: boolean;
  private _canCheckDiff: boolean;
  private _needsUpdate: boolean;
  private _forcesUpdate: boolean;
  private _leftColumnDsDiffer: IterableDiffer<TableColumn>;
  private _rightColumnDsDiffer: IterableDiffer<TableColumn>;
  private _rowDsDiffer: IterableDiffer<TableRow>;
  private _rowRangeDiffer: IterableDiffer<TableRow>;
  private _groupDsDiffer: IterableDiffer<TableGroup>;
  private _groupRangeDiffer: IterableDiffer<TableGroup>;

  @Input()
  get leftColumns(): TableColumn[] {
    return this._leftColumns;
  }
  set leftColumns(columns: TableColumn[]) {
    const isChanged: boolean = this._leftColumns !== columns;

    this._leftColumns = columns;
    this._leftColumnDs = columns || [];

    if (!this._leftColumnDsDiffer) {
      this._leftColumnDsDiffer = this._iterableDiffers
        .find(this._leftColumnDs)
        .create(_COLUMN_TRACK_BY_FN);
    }

    if (isChanged && this._leftColumnDs.length) {
      this._leftColumnDsDiffer.diff(null);
    }

    this._needsUpdate = true;
  }

  @Input()
  get rightColumns(): TableColumn[] {
    return this._rightColumns;
  }
  set rightColumns(columns: TableColumn[]) {
    const isChanged: boolean = this._rightColumns !== columns;

    this._rightColumns = columns;
    this._rightColumnDs = columns || [];

    if (!this._rightColumnDsDiffer) {
      this._rightColumnDsDiffer = this._iterableDiffers
        .find(this._rightColumnDs)
        .create(_COLUMN_TRACK_BY_FN);
    }

    if (isChanged && this._rightColumnDs.length) {
      this._rightColumnDsDiffer.diff(null);
    }

    this._needsUpdate = true;
  }

  @Input()
  get rows(): TableRow[] {
    return this._rows;
  }
  set rows(rows: TableRow[]) {
    const isChanged: boolean = this._rows !== rows;

    this._rows = rows;
    this._rowDs = rows || [];

    if (!this._rowDsDiffer) {
      this._rowDsDiffer = this._iterableDiffers.find(this._rowDs).create(_ROW_TRACK_BY_FN);
    }

    if (!this._rowRangeDiffer) {
      this._rowRangeDiffer = this._iterableDiffers.find([]).create(_ROW_TRACK_BY_FN);
    }

    if (isChanged && this._rowDs.length) {
      this._rowDsDiffer.diff(null);
    }

    this._needsUpdate = true;
  }

  @Input()
  get rootGroup(): TableGroup {
    return this._rootGroup;
  }
  set rootGroup(group: TableGroup) {
    const isChanged: boolean = this._rootGroup !== group;

    this._isGrouping = !!group;
    this._rootGroup = group;

    let forcesUpdate: boolean;

    if (this._isGrouping) {
      forcesUpdate = this._groupDepth !== group.totalChildrenDepth;

      this._groupDepth = group.totalChildrenDepth;
      this._groupDs = group.children || [];
      this._rowDs = [];
    } else {
      this._groupDepth = null;
      this._groupDs = [];
      this._rowDs = this._rows || [];
    }

    if (!this._groupDsDiffer) {
      this._groupDsDiffer = this._iterableDiffers.find(this._groupDs).create(_GROUP_TRACK_BY_FN);
    }

    if (!this._groupRangeDiffer) {
      this._groupRangeDiffer = this._iterableDiffers.find([]).create(_GROUP_TRACK_BY_FN);
    }

    if (isChanged && this._groupDs.length) {
      this._groupDsDiffer.diff(null);
    }

    this._needsUpdate = true;
    this._forcesUpdate ||= forcesUpdate;
  }

  @Input()
  get rowHeight(): number {
    return this._rowHeight;
  }
  set rowHeight(height: number) {
    this._rowHeight = height;

    this._needsUpdate = this._forcesUpdate = true;
  }

  get element(): HTMLElement {
    return this._elementRef.nativeElement;
  }

  get offsetLeft(): number {
    return this.element.offsetLeft;
  }
  get offsetTop(): number {
    return this.element.offsetTop;
  }

  get width(): number {
    return this.element.clientWidth;
  }
  get height(): number {
    return this.element.clientHeight;
  }

  get leftWidth(): number {
    return this._leftWidth ?? Dimension.IndexCellWidth;
  }

  get rightWidth(): number {
    return this._rightWidth ?? Dimension.ActionCellWidth;
  }

  get contentWidth(): number {
    return this._contentWidth ?? 0;
  }

  get contentHeight(): number {
    return this._contentHeight ?? Dimension.BlankRowHeight;
  }

  ngAfterContentInit() {
    this._canCheckDiff = this._needsUpdate = true;

    this._resizeObserve.observe(this.element);
  }

  ngDoCheck() {
    if (this._canCheckDiff && this._needsUpdate) {
      this._checkDiff(this._forcesUpdate);

      this._needsUpdate = this._forcesUpdate = false;
    }
  }

  ngOnDestroy() {
    this._resizeObserve.disconnect();
  }

  /**
   * @url https://dev.to/adamklein/build-your-own-virtual-scroll-part-i-11ib
   * @url https://dev.to/adamklein/build-your-own-virtual-scroll-part-ii-3j86
   */
  measureRangeSize(
    [scrollLeft, scrollingX]: [number, _Scrolling?],
    [scrollTop, scrollingY]: [number, _Scrolling?],
  ) {
    if (scrollingX !== false) {
      const leftColumnRange: TableColumn[] = this._leftColumnDs;
      const rightColumnRange: TableColumn[] = _findColumnInsideViewport(this._rightColumnDs, [
        scrollLeft,
        scrollLeft + (this.width - this.leftWidth),
      ]);

      // if ( scrollingX === 'to-start' ) {
      // 	rightColumnRange.reverse();
      // }

      this._updateColumnRange(leftColumnRange, rightColumnRange);
    }

    if (scrollingY !== false) {
      let rowRange: TableRow[];

      if (this._isGrouping) {
        const [groupRange, rowRangeInGroup]: [TableGroup[], TableRow[]] = _findGroupInsideViewport(
          this._groupDs,
          this._rowHeight,
          [scrollTop, scrollTop + this.height],
        );

        // if ( scrollingY === 'to-start' ) {
        // 	groupRange.reverse();
        // }

        this._updateGroupRange(groupRange);

        rowRange = rowRangeInGroup;
      } else {
        rowRange = _findRowInsideViewport(this._rowDs, this._rowHeight, [scrollTop, this.height]);
      }

      // if ( scrollingY === 'to-start' ) {
      // 	rowRange.reverse();
      // }

      this._updateRowRange(rowRange);
    }
  }

  private _checkDiff(forcesUpdate: boolean = false) {
    let shouldMakeUpColumnViewProps: boolean;
    let shouldMakeUpRowViewProps: boolean;
    let shouldMakeUpGroupViewProps: boolean;

    if (this._leftColumnDsDiffer) {
      const columnLeftDsChanges: IterableChanges<TableColumn> = this._leftColumnDsDiffer.diff(
        this._leftColumnDs,
      );

      if (columnLeftDsChanges) {
        shouldMakeUpColumnViewProps = true;
      } else if (this._leftColumnDs.length) {
        shouldMakeUpColumnViewProps ||= forcesUpdate;
      }
    }

    if (this._rightColumnDsDiffer) {
      const columnRightDsChanges: IterableChanges<TableColumn> = this._rightColumnDsDiffer.diff(
        this._rightColumnDs,
      );

      if (columnRightDsChanges) {
        shouldMakeUpColumnViewProps = true;
      } else if (this._rightColumnDs.length) {
        shouldMakeUpColumnViewProps ||= forcesUpdate;
      }
    }

    if (this._rowDsDiffer) {
      const rowDsChanges: IterableChanges<TableRow> = this._rowDsDiffer.diff(this._rowDs);

      if (!this._isGrouping) {
        if (rowDsChanges) {
          shouldMakeUpRowViewProps = true;

          if (!this._rowDs.length) {
            this._clearCurrentRowRange();
          }
        } else if (this._rowDs.length) {
          shouldMakeUpRowViewProps ||= forcesUpdate;
        }
      }
    }

    if (this._groupDsDiffer) {
      const groupDsChanges: IterableChanges<TableGroup> = this._groupDsDiffer.diff(this._groupDs);

      if (groupDsChanges) {
        if (this._groupDs.length) {
          shouldMakeUpGroupViewProps = true;
        } else {
          this._clearCurrentGroupRange();
          this._clearCurrentRowRange();

          shouldMakeUpRowViewProps = true;
        }
      } else if (this._groupDs.length) {
        shouldMakeUpGroupViewProps ||= forcesUpdate;
      }
    }

    if (!shouldMakeUpColumnViewProps && !shouldMakeUpRowViewProps && !shouldMakeUpGroupViewProps) {
      return;
    }

    const totalGroupPadding: number = this._isGrouping
      ? (this._rootGroup.totalChildrenDepth - 1) * Dimension.GroupPadding
      : 0;

    if (shouldMakeUpColumnViewProps) {
      this._rawLeftWidth = _makeUpColumnViewProps(
        this._leftColumnDs,
        Dimension.IndexCellWidth,
        totalGroupPadding,
      );
      this._rawRightWidth =
        _makeUpColumnViewProps(this._rightColumnDs, 0, this._rawLeftWidth + totalGroupPadding) +
        Dimension.ActionCellWidth;
    }

    if (shouldMakeUpGroupViewProps) {
      this._contentHeight = _makeUpGroupViewProps(
        this._rootGroup,
        this._rowHeight,
        Dimension.BlankRowHeight,
      );
    } else if (shouldMakeUpRowViewProps) {
      this._contentHeight =
        _makeUpRowViewProps(this._rowDs, this._rowHeight) + Dimension.BlankRowHeight;
    }

    this._leftWidth = this._rawLeftWidth;
    this._rightWidth = this._rawRightWidth;

    if (this._isGrouping) {
      this._leftWidth += totalGroupPadding;
      this._rightWidth += totalGroupPadding;
    } else if (!this._contentHeight) {
      this._contentHeight = Dimension.BlankRowHeight;
    }

    this._contentWidth = this._leftWidth + this._rightWidth;

    this._onSizeUpdated(
      shouldMakeUpColumnViewProps,
      shouldMakeUpRowViewProps || shouldMakeUpGroupViewProps,
    );
  }

  private _onResized(entries: ResizeObserverEntry[]) {
    let updateOnWidth: boolean = false;
    let updateOnHeight: boolean = false;

    for (const entry of entries) {
      const { width, height }: DOMRectReadOnly = entry.contentRect;
      const dataset: any = entry.target;

      if (dataset._prevWidth !== width) {
        updateOnWidth = true;
        dataset._prevWidth = width;
      }

      if (dataset._prevHeight !== height) {
        updateOnHeight = true;
        dataset._prevHeight = height;
      }
    }

    this._onSizeUpdated(updateOnWidth, updateOnHeight);
  }

  private _onSizeUpdated(updateOnWidth: boolean, updateOnHeight: boolean) {
    this.sizeUpdated.emit({
      updateOnWidth,
      updateOnHeight,
      size: {
        width: this.width,
        height: this.height,
        leftWidth: this.leftWidth,
        rightWidth: this.rightWidth,
        contentWidth: this.contentWidth,
        contentHeight: this.contentHeight,
      },
    });
  }

  private _updateColumnRange(leftColumnRange: TableColumn[], rightColumnRange: TableColumn[]) {
    this.leftWrapper.columns = leftColumnRange;
    this.rightWrapper.columns = rightColumnRange;

    this._cdRef.markForCheck();
  }

  private _updateRowRange(rowRange: TableRow[]) {
    const changes: IterableChanges<TableRow> = this._rowRangeDiffer.diff(rowRange);

    if (!changes) return;

    this.leftWrapper.rowRepeater.applyChanges(changes);
    this.rightWrapper.rowRepeater.applyChanges(changes);

    this._cdRef.markForCheck();
  }

  private _updateGroupRange(groupRange: TableGroup[]) {
    const changes: IterableChanges<TableGroup> = this._groupRangeDiffer.diff(groupRange);

    if (!changes) return;

    this.leftWrapper.groupRepeater.applyChanges(changes);
    this.rightWrapper.groupRepeater.applyChanges(changes);

    this._cdRef.markForCheck();
  }

  private _clearCurrentRowRange() {
    this._rowRangeDiffer.diff(null);

    this.leftWrapper.rowRepeater.clear();
    this.rightWrapper.rowRepeater.clear();

    this._cdRef.markForCheck();
  }

  private _clearCurrentGroupRange() {
    this._groupRangeDiffer.diff(null);

    this.leftWrapper.groupRepeater.clear();
    this.rightWrapper.groupRepeater.clear();

    this._cdRef.markForCheck();
  }
}
