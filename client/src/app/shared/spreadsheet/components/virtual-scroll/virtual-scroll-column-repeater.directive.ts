import { Directive, effect, input, TrackByFunction } from '@angular/core';

import { TableColumn } from '../../models/table-column';
import { ViewContext, ViewProps, ViewRepeater } from './recycle-view-repeater-strategy';

export interface ColumnView extends TableColumn {
  viewProps?: ViewProps & { offset: number };
}

export interface ColumnViewContext extends ViewContext<TableColumn> {}

export const COLUMN_TRACK_BY_FN: TrackByFunction<TableColumn> = (
  _i: number,
  column: TableColumn,
): TableColumn['id'] => column.id;

export function getColumnRect(column: ColumnView) {
  return column?.viewProps.rect || null;
}

export function getColumnOffset(column: ColumnView) {
  return column?.viewProps.offset || null;
}

export function makeUpColumnViewProps(columns: TableColumn[], startLeft = 0, startOffset = 0) {
  let left = startLeft;

  for (let i = 0; i < columns.length; i++) {
    const columnView = columns[i] as ColumnView;
    columnView.viewProps ||= {
      rect: {},
    } as ColumnView['viewProps'];
    columnView.viewProps.index = i;
    columnView.viewProps.rect.left = left;
    columnView.viewProps.rect.width = columnView.width;
    columnView.viewProps.offset = startOffset + left;

    left += columnView.width;
  }

  return left;
}

export function findColumnInsideViewport(
  columns: TableColumn[],
  viewportRange: [number, number],
  memo: TableColumn[] = [],
  start = 0,
  end = columns.length - 1,
) {
  if (start <= end) {
    const mid = Math.floor((start + end) / 2);
    const column: ColumnView = columns[mid];
    const columnStartOffset = column.viewProps.rect.left;
    const columnEndOffset = columnStartOffset + column.viewProps.rect.width;
    const viewportStartOffset = viewportRange[0];
    const viewportEndOffset = viewportRange[1];

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
        findColumnInsideViewport(columns, viewportRange, memo, start, mid - 1);
      }

      if (columnEndOffset < viewportEndOffset) {
        findColumnInsideViewport(columns, viewportRange, memo, mid + 1, end);
      }
    }
  }

  return memo;
}

@Directive({
  selector: '[virtualScrollColumnRepeater]',
  exportAs: 'virtualScrollColumnRepeater',
})
export class VirtualScrollColumnRepeaterDirective extends ViewRepeater<
  TableColumn,
  ColumnViewContext
> {
  readonly dataSourceStartIndex = input<number>(0, {
    alias: 'virtualScrollColumnRepeaterStartIndex',
  });

  readonly dataSourceTrackByFn = input<(index: number, item: TableColumn) => any>(
    COLUMN_TRACK_BY_FN,
    {
      alias: 'virtualScrollColumnRepeaterTrackBy',
    },
  );

  readonly ds = input.required<TableColumn[]>({
    alias: 'virtualScrollColumnRepeater',
  });

  readonly cacheSize = input<number | undefined>(undefined, {
    alias: 'virtualScrollColumnRepeaterCacheSize',
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
}
