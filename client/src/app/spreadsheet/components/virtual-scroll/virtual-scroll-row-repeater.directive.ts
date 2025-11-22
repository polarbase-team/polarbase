import { Directive, Input, TrackByFunction } from '@angular/core';

import { Dimension } from '../../services/table.service';

import {
  _RecycleViewRepeaterStrategy,
  _ViewChanged,
  _ViewContext,
  _ViewProps,
  _ViewRect,
  _ViewRepeater,
} from './recycle-view-repeater-strategy';
import type { _GroupView } from './virtual-scroll-group-repeater.directive';
import { TableRow } from '../../models/table-row';
import { TableGroup } from '../../models/table-group';

type RowView = TableRow & {
  _viewProps: _ViewProps & {
    indexInGroup: number;
    group: TableGroup;
  };
};

type RowViewContext = _ViewContext<TableRow> & {
  group: TableGroup;
  indexInGroup: number;
};

const ROW_TRACK_BY_FN: TrackByFunction<TableRow> = (_i: number, row: TableRow): TableRow['id'] =>
  row.id;

export type _RowView = RowView;
export type _RowViewContext = RowViewContext;

export const _ROW_TRACK_BY_FN: TrackByFunction<TableRow> = ROW_TRACK_BY_FN;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _getRowRect(row: TableRow): _ViewRect {
  return (row as _RowView)?._viewProps.rect || null;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _makeUpRowViewProps(
  rows: TableRow[],
  itemSize: number,
  _startIndex: number = 0,
  _group?: _GroupView,
): number {
  let left: number = 0;
  let top: number = 0;

  if (_group) {
    left = _group._viewProps.rect.left;
    top = _group._viewProps.rect.top + Dimension.GroupHeaderHeight;
  }

  for (let i: number = 0; i < rows.length; i++) {
    const rowView: RowView = rows[i] as RowView;

    rowView._viewProps ||= { rect: {} } as RowView['_viewProps'];

    if (_group) {
      rowView._viewProps.indexInGroup = i;
      rowView._viewProps.group = _group;
    }

    rowView._viewProps.index = _startIndex + i;
    rowView._viewProps.rect.left = left;
    rowView._viewProps.rect.top = top;
    rowView._viewProps.rect.height = itemSize;

    top += itemSize;
  }

  return top;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _findRowInsideViewport(
  rows: TableRow[],
  rowHeight: number,
  range: [number, number],
  nodePadding: number = 1,
): TableRow[] {
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
export class VirtualScrollRowRepeaterDirective extends _ViewRepeater<TableRow, RowViewContext> {
  @Input('virtualScrollRowRepeaterStartIndex')
  override dataSourceStartIndex: number = 0;
  @Input('virtualScrollRowRepeaterTrackBy')
  override dataSourceTrackByFn: TrackByFunction<TableRow> = ROW_TRACK_BY_FN;

  @Input('virtualScrollRowRepeater')
  set rowDs(ds: TableRow[]) {
    this.dataSource = ds;
  }

  @Input('virtualScrollRowRepeaterCacheSize')
  set rowCacheSize(size: number) {
    this.cacheSize = size;
  }

  protected override updateContextProperties(context: RowViewContext) {
    super.updateContextProperties(context);

    const { _viewProps }: RowView = context.$implicit as RowView;

    context.indexInGroup = _viewProps.indexInGroup;
    context.group = _viewProps.group;
  }
}
