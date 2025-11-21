import { Directive, Input, TrackByFunction } from '@angular/core';

import { Column } from '../../services/table-column.service';

import {
  _RecycleViewRepeaterStrategy,
  _ViewContext,
  _ViewProps,
  _ViewRect,
  _ViewRepeater,
} from './recycle-view-repeater-strategy';

type ColumnView = Column & {
  _viewProps: _ViewProps & {
    offset: number;
  };
};

type ColumnViewContext = _ViewContext<Column>;

const COLUMN_TRACK_BY_FN: TrackByFunction<Column> = (_i: number, column: Column): Column['id'] =>
  column.id;

export type _ColumnView = ColumnView;
export type _ColumnViewContext = ColumnViewContext;

export const _COLUMN_TRACK_BY_FN: TrackByFunction<Column> = COLUMN_TRACK_BY_FN;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _getColumnRect(column: Column): _ViewRect {
  return column ? (column as _ColumnView)._viewProps.rect : null;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _getColumnOffset(column: Column): number {
  return column ? (column as _ColumnView)._viewProps.offset : null;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _makeUpColumnViewProps(
  columns: Column[],
  startLeft: number = 0,
  startOffset: number = 0,
): number {
  let left: number = startLeft;

  for (let i: number = 0; i < columns.length; i++) {
    const columnView: ColumnView = columns[i] as ColumnView;

    columnView._viewProps ||= {
      rect: {},
    } as ColumnView['_viewProps'];

    columnView._viewProps.index = i;
    columnView._viewProps.rect.left = left;
    columnView._viewProps.rect.width = columnView.width;
    columnView._viewProps.offset = startOffset + left;

    left += columnView.width;
  }

  return left;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _findColumnInsideViewport(
  columns: Column[],
  viewportRange: [number, number],
  memo: Column[] = [],
  start: number = 0,
  end: number = columns.length - 1,
): Column[] {
  if (start <= end) {
    const mid: number = Math.floor((start + end) / 2);
    const column: ColumnView = columns[mid] as ColumnView;
    const columnStartOffset: number = column._viewProps.rect.left;
    const columnEndOffset: number = columnStartOffset + column._viewProps.rect.width;
    const viewportStartOffset: number = viewportRange[0];
    const viewportEndOffset: number = viewportRange[1];

    if (columnStartOffset < viewportStartOffset && columnEndOffset > viewportEndOffset) {
      memo.push(column);
    } else {
      if (
        (columnStartOffset >= viewportStartOffset && columnStartOffset <= viewportEndOffset) ||
        (columnEndOffset >= viewportStartOffset && columnEndOffset <= viewportEndOffset)
      ) {
        memo.push(column);
      }

      if (columnStartOffset > viewportStartOffset) {
        _findColumnInsideViewport(columns, viewportRange, memo, start, mid - 1);
      }

      if (columnEndOffset < viewportEndOffset) {
        _findColumnInsideViewport(columns, viewportRange, memo, mid + 1, end);
      }
    }
  }

  return memo;
}

@Directive({
  selector: '[virtualScrollColumnRepeater]',
  exportAs: 'virtualScrollColumnRepeater',
})
export class VirtualScrollColumnRepeaterDirective extends _ViewRepeater<Column, ColumnViewContext> {
  @Input('virtualScrollColumnRepeaterStartIndex')
  override dataSourceStartIndex: number = 0;
  @Input('virtualScrollColumnRepeaterTrackBy')
  override dataSourceTrackByFn: TrackByFunction<Column> = COLUMN_TRACK_BY_FN;

  @Input('virtualScrollColumnRepeater')
  set columnDs(ds: Column[]) {
    this.dataSource = ds;
  }

  @Input('virtualScrollColumnRepeaterCacheSize')
  set columnCacheSize(size: number) {
    this.cacheSize = size;
  }
}
