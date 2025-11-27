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
  IterableDiffer,
  IterableDiffers,
  OnDestroy,
  Output,
} from '@angular/core';

import { Dimension } from '../../services/table.service';
import { TableColumn } from '../../models/table-column';
import { TableRow } from '../../models/table-row';
import { TableGroup } from '../../models/table-group';
import type { Scrolling } from './virtual-scroll.component';
import {
  COLUMN_TRACK_BY_FN,
  findColumnInsideViewport,
  makeUpColumnViewProps,
} from './virtual-scroll-column-repeater.directive';
import {
  findGroupInsideViewport,
  GROUP_TRACK_BY_FN,
  makeUpGroupViewProps,
} from './virtual-scroll-group-repeater.directive';
import {
  findRowInsideViewport,
  makeUpRowViewProps,
  ROW_TRACK_BY_FN,
} from './virtual-scroll-row-repeater.directive';
import {
  VirtualScrollLeftContentWrapperComponent as VSLeftCWComponent,
  VirtualScrollRightContentWrapperComponent as VSRightCWComponent,
} from './virtual-scroll-content-wrapper.component';

export interface ViewportSizeUpdatedEvent {
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
}

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

  @Output() sizeUpdated = new EventEmitter<ViewportSizeUpdatedEvent>();

  private cdRef = inject(ChangeDetectorRef);
  private eleRef = inject(ElementRef);
  private iterableDiffers = inject(IterableDiffers);
  private resizeObserve = new ResizeObserver(this.onResized.bind(this));
  private _leftColumns: TableColumn[];
  private _rightColumns: TableColumn[];
  private leftColumnDs: TableColumn[];
  private rightColumnDs: TableColumn[];
  private _rows: TableRow[];
  private rowDs: TableRow[];
  private _rootGroup: TableGroup;
  private groupDs: TableGroup[];
  private _rowHeight: number;
  private groupDepth: number;
  private _leftWidth: number;
  private _rightWidth: number;
  private rawLeftWidth: number;
  private rawRightWidth: number;
  private _contentWidth: number;
  private _contentHeight: number;
  private isGrouping: boolean;
  private canCheckDiff: boolean;
  private needsUpdate: boolean;
  private forcesUpdate: boolean;
  private leftColumnDsDiffer: IterableDiffer<TableColumn>;
  private rightColumnDsDiffer: IterableDiffer<TableColumn>;
  private rowDsDiffer: IterableDiffer<TableRow>;
  private rowRangeDiffer: IterableDiffer<TableRow>;
  private groupDsDiffer: IterableDiffer<TableGroup>;
  private groupRangeDiffer: IterableDiffer<TableGroup>;

  @Input()
  get leftColumns() {
    return this._leftColumns;
  }
  set leftColumns(columns: TableColumn[]) {
    const isChanged: boolean = this._leftColumns !== columns;

    this._leftColumns = columns;
    this.leftColumnDs = columns || [];

    if (!this.leftColumnDsDiffer) {
      this.leftColumnDsDiffer = this.iterableDiffers
        .find(this.leftColumnDs)
        .create(COLUMN_TRACK_BY_FN);
    }

    if (isChanged && this.leftColumnDs.length) {
      this.leftColumnDsDiffer.diff(null);
    }

    this.needsUpdate = true;
  }

  @Input()
  get rightColumns() {
    return this._rightColumns;
  }
  set rightColumns(columns: TableColumn[]) {
    const isChanged: boolean = this._rightColumns !== columns;

    this._rightColumns = columns;
    this.rightColumnDs = columns || [];

    if (!this.rightColumnDsDiffer) {
      this.rightColumnDsDiffer = this.iterableDiffers
        .find(this.rightColumnDs)
        .create(COLUMN_TRACK_BY_FN);
    }

    if (isChanged && this.rightColumnDs.length) {
      this.rightColumnDsDiffer.diff(null);
    }

    this.needsUpdate = true;
  }

  @Input()
  get rows() {
    return this._rows;
  }
  set rows(rows: TableRow[]) {
    const isChanged: boolean = this._rows !== rows;

    this._rows = rows;
    this.rowDs = rows || [];

    if (!this.rowDsDiffer) {
      this.rowDsDiffer = this.iterableDiffers.find(this.rowDs).create(ROW_TRACK_BY_FN);
    }

    if (!this.rowRangeDiffer) {
      this.rowRangeDiffer = this.iterableDiffers.find([]).create(ROW_TRACK_BY_FN);
    }

    if (isChanged && this.rowDs.length) {
      this.rowDsDiffer.diff(null);
    }

    this.needsUpdate = true;
  }

  @Input()
  get rootGroup() {
    return this._rootGroup;
  }
  set rootGroup(group: TableGroup) {
    const isChanged: boolean = this._rootGroup !== group;

    this.isGrouping = !!group;
    this._rootGroup = group;

    let forcesUpdate: boolean;

    if (this.isGrouping) {
      forcesUpdate = this.groupDepth !== group.totalChildrenDepth;

      this.groupDepth = group.totalChildrenDepth;
      this.groupDs = group.children || [];
      this.rowDs = [];
    } else {
      this.groupDepth = null;
      this.groupDs = [];
      this.rowDs = this._rows || [];
    }

    if (!this.groupDsDiffer) {
      this.groupDsDiffer = this.iterableDiffers.find(this.groupDs).create(GROUP_TRACK_BY_FN);
    }

    if (!this.groupRangeDiffer) {
      this.groupRangeDiffer = this.iterableDiffers.find([]).create(GROUP_TRACK_BY_FN);
    }

    if (isChanged && this.groupDs.length) {
      this.groupDsDiffer.diff(null);
    }

    this.needsUpdate = true;
    this.forcesUpdate ||= forcesUpdate;
  }

  @Input()
  get rowHeight() {
    return this._rowHeight;
  }
  set rowHeight(height: number) {
    this._rowHeight = height;

    this.needsUpdate = this.forcesUpdate = true;
  }

  get element() {
    return this.eleRef.nativeElement;
  }

  get offsetLeft() {
    return this.element.offsetLeft;
  }
  get offsetTop() {
    return this.element.offsetTop;
  }

  get width() {
    return this.element.clientWidth;
  }
  get height() {
    return this.element.clientHeight;
  }

  get leftWidth() {
    return this._leftWidth ?? Dimension.IndexCellWidth;
  }

  get rightWidth() {
    return this._rightWidth ?? Dimension.ActionCellWidth;
  }

  get contentWidth() {
    return this._contentWidth ?? 0;
  }

  get contentHeight() {
    return this._contentHeight ?? Dimension.BlankRowHeight;
  }

  ngAfterContentInit() {
    this.canCheckDiff = this.needsUpdate = true;
    this.resizeObserve.observe(this.element);
  }

  ngDoCheck() {
    if (this.canCheckDiff && this.needsUpdate) {
      this.checkDiff(this.forcesUpdate);
      this.needsUpdate = this.forcesUpdate = false;
    }
  }

  ngOnDestroy() {
    this.resizeObserve.disconnect();
  }

  /**
   * @url https://dev.to/adamklein/build-your-own-virtual-scroll-part-i-11ib
   * @url https://dev.to/adamklein/build-your-own-virtual-scroll-part-ii-3j86
   */
  measureRangeSize(
    [scrollLeft, scrollingX]: [number, Scrolling?],
    [scrollTop, scrollingY]: [number, Scrolling?],
  ) {
    if (scrollingX !== false) {
      const leftColumnRange: TableColumn[] = this.leftColumnDs;
      const rightColumnRange: TableColumn[] = findColumnInsideViewport(this.rightColumnDs, [
        scrollLeft,
        scrollLeft + (this.width - this.leftWidth),
      ]);
      this.updateColumnRange(leftColumnRange, rightColumnRange);
    }

    if (scrollingY !== false) {
      let rowRange: TableRow[];

      if (this.isGrouping) {
        const [groupRange, rowRangeInGroup]: [TableGroup[], TableRow[]] = findGroupInsideViewport(
          this.groupDs,
          this._rowHeight,
          [scrollTop, scrollTop + this.height],
        );
        this.updateGroupRange(groupRange);
        rowRange = rowRangeInGroup;
      } else {
        rowRange = findRowInsideViewport(this.rowDs, this._rowHeight, [scrollTop, this.height]);
      }

      this.updateRowRange(rowRange);
    }
  }

  private checkDiff(forcesUpdate = false) {
    let shouldMakeUpColumnViewProps: boolean;
    let shouldMakeUpRowViewProps: boolean;
    let shouldMakeUpGroupViewProps: boolean;

    if (this.leftColumnDsDiffer) {
      const columnLeftDsChanges = this.leftColumnDsDiffer.diff(this.leftColumnDs);
      if (columnLeftDsChanges) {
        shouldMakeUpColumnViewProps = true;
      } else if (this.leftColumnDs.length) {
        shouldMakeUpColumnViewProps ||= forcesUpdate;
      }
    }

    if (this.rightColumnDsDiffer) {
      const columnRightDsChanges = this.rightColumnDsDiffer.diff(this.rightColumnDs);
      if (columnRightDsChanges) {
        shouldMakeUpColumnViewProps = true;
      } else if (this.rightColumnDs.length) {
        shouldMakeUpColumnViewProps ||= forcesUpdate;
      }
    }

    if (this.rowDsDiffer) {
      const rowDsChanges = this.rowDsDiffer.diff(this.rowDs);
      if (!this.isGrouping) {
        if (rowDsChanges) {
          shouldMakeUpRowViewProps = true;
          if (!this.rowDs.length) {
            this.clearCurrentRowRange();
          }
        } else if (this.rowDs.length) {
          shouldMakeUpRowViewProps ||= forcesUpdate;
        }
      }
    }

    if (this.groupDsDiffer) {
      const groupDsChanges = this.groupDsDiffer.diff(this.groupDs);
      if (groupDsChanges) {
        if (this.groupDs.length) {
          shouldMakeUpGroupViewProps = true;
        } else {
          this.clearCurrentGroupRange();
          this.clearCurrentRowRange();
          shouldMakeUpRowViewProps = true;
        }
      } else if (this.groupDs.length) {
        shouldMakeUpGroupViewProps ||= forcesUpdate;
      }
    }

    if (!shouldMakeUpColumnViewProps && !shouldMakeUpRowViewProps && !shouldMakeUpGroupViewProps) {
      return;
    }

    const totalGroupPadding = this.isGrouping
      ? (this._rootGroup.totalChildrenDepth - 1) * Dimension.GroupPadding
      : 0;

    if (shouldMakeUpColumnViewProps) {
      this.rawLeftWidth = makeUpColumnViewProps(
        this.leftColumnDs,
        Dimension.IndexCellWidth,
        totalGroupPadding,
      );
      this.rawRightWidth =
        makeUpColumnViewProps(this.rightColumnDs, 0, this.rawLeftWidth + totalGroupPadding) +
        Dimension.ActionCellWidth;
    }

    if (shouldMakeUpGroupViewProps) {
      this._contentHeight = makeUpGroupViewProps(
        this._rootGroup,
        this._rowHeight,
        Dimension.BlankRowHeight,
      );
    } else if (shouldMakeUpRowViewProps) {
      this._contentHeight =
        makeUpRowViewProps(this.rowDs, this._rowHeight) + Dimension.BlankRowHeight;
    }

    this._leftWidth = this.rawLeftWidth;
    this._rightWidth = this.rawRightWidth;

    if (this.isGrouping) {
      this._leftWidth += totalGroupPadding;
      this._rightWidth += totalGroupPadding;
    } else if (!this._contentHeight) {
      this._contentHeight = Dimension.BlankRowHeight;
    }

    this._contentWidth = this._leftWidth + this._rightWidth;

    this.onSizeUpdated(
      shouldMakeUpColumnViewProps,
      shouldMakeUpRowViewProps || shouldMakeUpGroupViewProps,
    );
  }

  private onResized(entries: ResizeObserverEntry[]) {
    let updateOnWidth = false;
    let updateOnHeight = false;

    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const dataset = entry.target as any;

      if (dataset._prevWidth !== width) {
        updateOnWidth = true;
        dataset._prevWidth = width;
      }

      if (dataset._prevHeight !== height) {
        updateOnHeight = true;
        dataset._prevHeight = height;
      }
    }

    this.onSizeUpdated(updateOnWidth, updateOnHeight);
  }

  private onSizeUpdated(updateOnWidth: boolean, updateOnHeight: boolean) {
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

  private updateColumnRange(leftColumnRange: TableColumn[], rightColumnRange: TableColumn[]) {
    this.leftWrapper.columns = leftColumnRange;
    this.rightWrapper.columns = rightColumnRange;
    this.cdRef.markForCheck();
  }

  private updateRowRange(rowRange: TableRow[]) {
    const changes = this.rowRangeDiffer.diff(rowRange);
    if (!changes) return;

    this.leftWrapper.rowRepeater.applyChanges(changes);
    this.rightWrapper.rowRepeater.applyChanges(changes);
    this.cdRef.markForCheck();
  }

  private updateGroupRange(groupRange: TableGroup[]) {
    const changes = this.groupRangeDiffer.diff(groupRange);
    if (!changes) return;

    this.leftWrapper.groupRepeater.applyChanges(changes);
    this.rightWrapper.groupRepeater.applyChanges(changes);
    this.cdRef.markForCheck();
  }

  private clearCurrentRowRange() {
    this.rowRangeDiffer.diff(null);
    this.leftWrapper.rowRepeater.clear();
    this.rightWrapper.rowRepeater.clear();
    this.cdRef.markForCheck();
  }

  private clearCurrentGroupRange() {
    this.groupRangeDiffer.diff(null);
    this.leftWrapper.groupRepeater.clear();
    this.rightWrapper.groupRepeater.clear();
    this.cdRef.markForCheck();
  }
}
