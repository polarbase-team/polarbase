import { Directive, Input, TrackByFunction } from '@angular/core';

import { Dimension } from '../../services/table.service';

import {
  _ViewContext,
  _ViewProps,
  _ViewRect,
  _ViewRepeater,
} from './recycle-view-repeater-strategy';
import {
  _findRowInsideViewport,
  _makeUpRowViewProps,
} from './virtual-scroll-row-repeater.directive';
import { TableGroup } from '../../models/table-group';
import { TableRow } from '../../models/table-row';

type GroupView = TableGroup & {
  _viewProps: _ViewProps & {
    startItemIndex: number;
  };
};

type GroupViewContext = _ViewContext<TableGroup>;

const GROUP_TRACK_BY_FN: TrackByFunction<TableGroup> = (
  _i: number,
  group: TableGroup,
): TableGroup['id'] => group.id;

export type _GroupView = GroupView;
export type _GroupViewContext = GroupViewContext;

export const _GROUP_TRACK_BY_FN: TrackByFunction<TableGroup> = GROUP_TRACK_BY_FN;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _getGroupRect(group: TableGroup): _ViewRect {
  return group ? (group as _GroupView)._viewProps.rect : null;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _makeUpGroupViewProps(
  group: TableGroup,
  itemSize: number,
  extraSize: number = 0,
  _index: number = 0,
  _startItemIndex: number = 0,
): number {
  const groupView: GroupView = group as GroupView;
  const isRootGroup: boolean = group.depth === 0;

  groupView._viewProps ||= {
    rect: {},
  } as GroupView['_viewProps'];

  let height: number;

  if (group.metadata.collapsed && !isRootGroup) {
    height = Dimension.GroupHeaderHeight;
  } else if (group.children) {
    let h: number = 0;
    let t: number = groupView._viewProps.rect.top || 0;

    if (!isRootGroup) {
      t += Dimension.GroupHeaderHeight;
    }

    const children: GroupView[] = group.children as GroupView[];

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i: number = 0; i < children.length; i++) {
      const child: GroupView = children[i];

      child._viewProps ||= { index: i, rect: {} } as GroupView['_viewProps'];

      child._viewProps.startItemIndex = _startItemIndex;
      child._viewProps.rect.left = child._viewProps.rect.right =
        group.depth * Dimension.GroupPadding;
      child._viewProps.rect.top = t;

      const s: number =
        _makeUpGroupViewProps(child, itemSize, extraSize, _index, _startItemIndex) +
        Dimension.GroupSpacing;

      t += s;
      h += s;

      _index += 1;
      _startItemIndex += child.rows.length;
    }

    height = h + Dimension.GroupHeaderHeight;
  } else {
    height = group.rows.length * itemSize + Dimension.GroupHeaderHeight + extraSize;

    _makeUpRowViewProps(group.rows, itemSize, _startItemIndex, groupView);
  }

  // Removes excess height during make-up process.
  if (isRootGroup) {
    height -= Dimension.GroupHeaderHeight;
    height -= Dimension.GroupSpacing;

    if (height < 0) height = extraSize;
  }

  groupView._viewProps.rect.height = height;

  return height;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _findGroupInsideViewport(
  groups: TableGroup[],
  itemSize: number,
  range: [number, number],
  memo: [TableGroup[], TableRow[]] = [[], []],
  start: number = 0,
  end: number = groups.length - 1,
): [TableGroup[], TableRow[]] {
  if (start <= end) {
    const mid: number = Math.floor((start + end) / 2);
    const group: GroupView = groups[mid] as GroupView;
    const gs: number = group._viewProps.rect.top;
    const ge: number = gs + group._viewProps.rect.height;
    const [vs, ve]: [number, number] = range;
    const isGroupCoverViewport: boolean = gs < vs && ge > ve;
    const isGroupStartInsideViewport: boolean = gs >= vs && gs <= ve;
    const isGroupEndInsideViewport: boolean = ge >= vs && ge <= ve;

    if (isGroupCoverViewport || isGroupStartInsideViewport || isGroupEndInsideViewport) {
      memo[0].push(group);

      if (!group.metadata.collapsed) {
        if (group.children) {
          _findGroupInsideViewport(group.children, itemSize, range, memo);
        } else if (group.rows.length) {
          const s: number = Math.max(gs, vs);
          const e: number = Math.min(ge, ve);

          memo[1].push(..._findRowInsideViewport(group.rows, itemSize, [s - gs, e - s]));
        }
      }
    }

    if (!isGroupCoverViewport) {
      if (gs > vs) {
        _findGroupInsideViewport(groups, itemSize, range, memo, start, mid - 1);
      }

      if (ge < ve) {
        _findGroupInsideViewport(groups, itemSize, range, memo, mid + 1, end);
      }
    }
  }

  return memo;
}

@Directive({
  selector: '[virtualScrollGroupRepeater]',
  exportAs: 'virtualScrollGroupRepeater',
})
export class VirtualScrollGroupRepeaterDirective extends _ViewRepeater<
  TableGroup,
  GroupViewContext
> {
  @Input('virtualScrollGroupRepeaterStartIndex')
  override dataSourceStartIndex: number = 0;
  @Input('virtualScrollGroupRepeaterTrackBy')
  override dataSourceTrackByFn: TrackByFunction<TableGroup> = GROUP_TRACK_BY_FN;

  @Input('virtualScrollGroupRepeater')
  set groupDs(ds: TableGroup[]) {
    this.dataSource = ds;
  }

  @Input('virtualScrollGroupRepeaterCacheSize')
  set groupCacheSize(size: number) {
    this.cacheSize = size;
  }
}
