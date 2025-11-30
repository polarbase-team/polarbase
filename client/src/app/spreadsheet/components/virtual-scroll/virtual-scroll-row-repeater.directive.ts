import { Directive, effect, input, TrackByFunction } from '@angular/core';

import { Dimension } from '../../services/table.service';
import { TableRow } from '../../models/table-row';
import { TableGroup } from '../../models/table-group';
import { ViewContext, ViewProps, ViewRepeater } from './recycle-view-repeater-strategy';
import type { GroupView } from './virtual-scroll-group-repeater.directive';

export interface RowView extends TableRow {
  viewProps?: ViewProps & {
    indexInGroup: number;
    group: TableGroup;
  };
}

export interface RowViewContext extends ViewContext<TableRow> {
  group: TableGroup;
  indexInGroup: number;
}

export const ROW_TRACK_BY_FN: TrackByFunction<TableRow> = (
  _i: number,
  row: TableRow,
): TableRow['id'] => row.id;

export function getRowRect(row: RowView) {
  return row?.viewProps.rect || null;
}

export function makeUpRowViewProps(
  rows: TableRow[],
  itemSize: number,
  _startIndex = 0,
  _group?: GroupView,
) {
  let left = 0;
  let top = 0;

  if (_group) {
    left = _group.viewProps.rect.left;
    top = _group.viewProps.rect.top + Dimension.GroupHeaderHeight;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowView = rows[i] as RowView;
    rowView.viewProps ||= { rect: {} } as RowView['viewProps'];
    if (_group) {
      rowView.viewProps.indexInGroup = i;
      rowView.viewProps.group = _group;
    }
    rowView.viewProps.index = _startIndex + i;
    rowView.viewProps.rect.left = left;
    rowView.viewProps.rect.top = top;
    rowView.viewProps.rect.height = itemSize;

    top += itemSize;
  }

  return top;
}

export function findRowInsideViewport(
  rows: TableRow[],
  rowHeight: number,
  range: [number, number],
  nodePadding: number = 1,
) {
  let startIdx: number = Math.floor(range[0] / rowHeight) - nodePadding;
  startIdx = Math.max(0, startIdx);

  let length: number = Math.ceil(range[1] / rowHeight) + 2 * nodePadding;
  length = Math.min(rows.length - startIdx, length);

  return rows.slice(startIdx, startIdx + length);
}

@Directive({
  selector: '[virtualScrollRowRepeater]',
  exportAs: 'virtualScrollRowRepeater',
})
export class VirtualScrollRowRepeaterDirective extends ViewRepeater<TableRow, RowViewContext> {
  readonly dataSourceStartIndex = input<number>(0, {
    alias: 'virtualScrollRowRepeaterStartIndex',
  });

  readonly dataSourceTrackByFn = input<(index: number, item: TableRow) => any>(ROW_TRACK_BY_FN, {
    alias: 'virtualScrollRowRepeaterTrackBy',
  });

  readonly ds = input.required<TableRow[]>({
    alias: 'virtualScrollRowRepeater',
  });

  readonly cacheSize = input<number | undefined>(undefined, {
    alias: 'virtualScrollRowRepeaterCacheSize',
  });

  constructor() {
    super();

    effect(() => {
      this.dataSource = this.ds();
    });

    effect(() => {
      this.dsStartIndex = this.dataSourceStartIndex();
    });

    effect(() => {
      this.dsTrackByFn = this.dataSourceTrackByFn();
    });

    effect(() => {
      if (this.cacheSize() !== undefined) {
        this.repeater.viewCacheSize = this.cacheSize();
      }
    });
  }

  protected override updateContextProperties(context: RowViewContext) {
    super.updateContextProperties(context);

    const { viewProps } = context.$implicit as RowView;
    context.indexInGroup = viewProps.indexInGroup;
    context.group = viewProps.group;
  }
}
