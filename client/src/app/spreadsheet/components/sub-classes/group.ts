import _ from 'lodash';

import { calculateBy } from '../../helpers/calculate';
import type { HierarchyGroup } from '../../helpers/group';
import type { _GroupView } from '../sub-components/virtual-scroll/virtual-scroll-group-repeater.directive';
import type { Column } from './column';
import type { Row } from './row';

export type Group = HierarchyGroup & {
  items?: Row[];
  children?: Group[];
  metadata?: GroupMetadata;
};

export type GroupMetadata = {
  column: Column;
  data: any;
  isEmpty: boolean;
  isCollapsed: boolean;
  calculatedResult?: Map<Column['id'], any>;
};

export function calculateInGroup(
  group: Group,
  columns: Column[],
  calculatePredicate?: (...args: any) => any
) {
  if (group.metadata.calculatedResult) {
    group.metadata.calculatedResult.clear();
  } else {
    group.metadata.calculatedResult = new Map();
  }

  for (const column of columns) {
    group.metadata.calculatedResult.set(
      column.id,
      calculateBy(
        _.map(group.items, 'data'),
        column.calculateType,
        calculatePredicate?.bind(this, column.field),
        column?.field
      )
    );
  }

  if (!group.children) return;

  for (const childGroup of group.children) {
    calculateInGroup(childGroup, columns, calculatePredicate);
  }
}

export function findGroupAtPointerOffset(group: Group, pointerOffsetY: number): Group {
  if (group.children) {
    let start = 0;
    let end = group.children.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const childGroup = group.children[mid];
      const { _viewProps } = childGroup as _GroupView;
      const gs = _viewProps.rect.top;
      const ge = _viewProps.rect.top + _viewProps.rect.height;

      if (pointerOffsetY < gs) {
        end = mid - 1;
        continue;
      }

      if (pointerOffsetY > ge) {
        start = mid + 1;
        continue;
      }

      return findGroupAtPointerOffset(childGroup, pointerOffsetY);
    }
  }

  return group;
}

export function findGroupByItemIndex(itemIndex: number, group?: Group): HierarchyGroup {
  if (group?.children) {
    let start = 0;
    let end = group.children.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const childGroup = group.children[mid];
      const { _viewProps } = childGroup as _GroupView;

      if (itemIndex < _viewProps.startItemIndex) {
        end = mid - 1;
        continue;
      }

      if (itemIndex > _viewProps.startItemIndex + childGroup.items.length - 1) {
        start = mid + 1;
        continue;
      }

      return findGroupByItemIndex(itemIndex, childGroup) || childGroup;
    }
  }

  return group;
}
