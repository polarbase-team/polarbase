import { Directive, Input, TrackByFunction } from '@angular/core';

import { Dimension } from '../../services/table.service';
import { TableGroup } from '../../models/table-group';
import { TableRow } from '../../models/table-row';
import { ViewContext, ViewProps, ViewRepeater } from './recycle-view-repeater-strategy';
import { findRowInsideViewport, makeUpRowViewProps } from './virtual-scroll-row-repeater.directive';

export interface GroupView extends TableGroup {
  viewProps?: ViewProps & { startRowIndex: number };
}

export interface GroupViewContext extends ViewContext<TableGroup> {}

export const GROUP_TRACK_BY_FN: TrackByFunction<TableGroup> = (
  _i: number,
  group: TableGroup,
): TableGroup['id'] => group.id;

export function _getGroupRect(group: GroupView) {
  return group?.viewProps.rect || null;
}

export function makeUpGroupViewProps(
  group: TableGroup,
  rowSize: number,
  extraSize = 0,
  _index = 0,
  _startRowIndex = 0,
) {
  const isRootGroup = group.depth === 0;
  const groupView: GroupView = group;
  groupView.viewProps ||= {
    rect: {},
  } as GroupView['viewProps'];

  let height: number;
  if (group.isCollapsed && !isRootGroup) {
    height = Dimension.GroupHeaderHeight;
  } else if (group.children) {
    let h = 0;
    let t = groupView.viewProps.rect.top || 0;

    if (!isRootGroup) {
      t += Dimension.GroupHeaderHeight;
    }

    const children = group.children as GroupView[];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      child.viewProps ||= { index: i, rect: {} } as GroupView['viewProps'];
      child.viewProps.startRowIndex = _startRowIndex;
      child.viewProps.rect.left = child.viewProps.rect.right = group.depth * Dimension.GroupPadding;
      child.viewProps.rect.top = t;

      const s =
        makeUpGroupViewProps(child, rowSize, extraSize, _index, _startRowIndex) +
        Dimension.GroupSpacing;

      t += s;
      h += s;

      _index += 1;
      _startRowIndex += child.rows.length;
    }

    height = h + Dimension.GroupHeaderHeight;
  } else {
    height = group.rows.length * rowSize + Dimension.GroupHeaderHeight + extraSize;

    makeUpRowViewProps(group.rows, rowSize, _startRowIndex, groupView);
  }

  // Removes excess height during make-up process.
  if (isRootGroup) {
    height -= Dimension.GroupHeaderHeight;
    height -= Dimension.GroupSpacing;
    if (height < 0) height = extraSize;
  }

  return (groupView.viewProps.rect.height = height);
}

export function findGroupInsideViewport(
  groups: TableGroup[],
  rowSize: number,
  range: [number, number],
  memo: [TableGroup[], TableRow[]] = [[], []],
  start = 0,
  end = groups.length - 1,
) {
  if (start <= end) {
    const mid = Math.floor((start + end) / 2);
    const group: GroupView = groups[mid];
    const gs = group.viewProps.rect.top;
    const ge = gs + group.viewProps.rect.height;
    const [vs, ve] = range;
    const isGroupCoverViewport = gs < vs && ge > ve;
    const isGroupStartInsideViewport = gs >= vs && gs <= ve;
    const isGroupEndInsideViewport = ge >= vs && ge <= ve;

    if (isGroupCoverViewport || isGroupStartInsideViewport || isGroupEndInsideViewport) {
      memo[0].push(group);

      if (!group.isCollapsed) {
        if (group.children) {
          findGroupInsideViewport(group.children, rowSize, range, memo);
        } else if (group.rows.length) {
          const s = Math.max(gs, vs);
          const e = Math.min(ge, ve);
          memo[1].push(...findRowInsideViewport(group.rows, rowSize, [s - gs, e - s]));
        }
      }
    }

    if (!isGroupCoverViewport) {
      if (gs > vs) {
        findGroupInsideViewport(groups, rowSize, range, memo, start, mid - 1);
      }

      if (ge < ve) {
        findGroupInsideViewport(groups, rowSize, range, memo, mid + 1, end);
      }
    }
  }

  return memo;
}

@Directive({
  selector: '[virtualScrollGroupRepeater]',
  exportAs: 'virtualScrollGroupRepeater',
})
export class VirtualScrollGroupRepeaterDirective extends ViewRepeater<
  TableGroup,
  GroupViewContext
> {
  @Input('virtualScrollGroupRepeaterStartIndex')
  override dataSourceStartIndex = 0;
  @Input('virtualScrollGroupRepeaterTrackBy')
  override dataSourceTrackByFn = GROUP_TRACK_BY_FN;

  @Input('virtualScrollGroupRepeater')
  set groupDs(ds: TableGroup[]) {
    this.dataSource = ds;
  }

  @Input('virtualScrollGroupRepeaterCacheSize')
  set groupCacheSize(size: number) {
    this.cacheSize = size;
  }
}
