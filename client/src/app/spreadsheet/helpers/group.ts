import _ from 'lodash';

import { sortBy, sort, SortingPredicateReturnType, SortingType } from './sort';

type GroupData = { key: number; items: any[] };

export type GroupingType = SortingType;
export type HierarchyGroup = {
  id?: number;
  depth?: number;
  totalChildrenDepth?: number;
  items?: any[];
  parent?: HierarchyGroup;
  previous?: HierarchyGroup;
  children?: HierarchyGroup[];
  metadata?: any;
  clone?: typeof clone;
  sortItem?: typeof sortItem;
  unsortItem?: typeof unsortItem;
  findClosest?: typeof findClosest;
  addItems?: typeof addItems;
  removeItems?: typeof removeItems;
  _items?: any[];
};

function djb2Hash(str: string): number {
  let hash: number = 5381;

  for (let i: number = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); // hash * 33 + c
  }

  return hash >>> 0; // Unsigned 32-bit
}

function clone(): HierarchyGroup {
  const group: HierarchyGroup = { ...this };

  for (const child of group.children) {
    child.parent = group;
  }

  return group;
}

function sortItem(
  sortingPredicate?: (...args: any) => SortingPredicateReturnType,
  loop: number = 1
) {
  if (!this._items) {
    this._items = [...this.items];
  }

  this.items = sortBy(this.items, sortingPredicate, loop);

  if (!this.children) {
    return;
  }

  for (const childGroup of this.children) {
    if (!_.isFunction(childGroup?.sortItem)) return;

    childGroup.sortItem(sortingPredicate, loop);
  }
}

function unsortItem() {
  this.items = [...this._items];
  this._items = null;

  if (!this.children) {
    return;
  }

  for (const childGroup of this.children) {
    if (!_.isFunction(childGroup?.unsortItem)) return;

    childGroup.unsortItem();
  }
}

function addItems(items: any[], position: number = this.items.length) {
  if (position < 0 || position > this.items.length) return;

  const prevItem: any = this.items[position - 1];
  const nextItem: any = this.items[position];

  this.items.splice(position, 0, ...items);

  if (!this.parent) return;

  let targetIdx: number = 0;

  if (prevItem) {
    targetIdx = _.indexOf(this.parent.items, prevItem) + 1;
  } else if (nextItem) {
    targetIdx = _.indexOf(this.parent.items, nextItem);
  } else {
    let prevGroup: HierarchyGroup = this.previous;

    while (prevGroup) {
      if (prevGroup.items.length) {
        targetIdx = _.indexOf(this.parent.items, _.last(prevGroup.items)) + 1;
        break;
      }

      prevGroup = prevGroup.previous;
    }
  }

  this.parent.addItems(items, targetIdx);
}

function removeItems(items: any[]): boolean {
  const length: number = this.items.length;

  _.pull(this.items, ...items);

  if (length !== this.items.length) {
    if (this.children) {
      for (const childGroup of this.children) {
        if (childGroup.removeItems(items)) break;
      }
    }

    return true;
  }

  return false;
}

function findClosest(includeRootGroup?: boolean): HierarchyGroup[] {
  const groups: HierarchyGroup[] = [];
  let parentGroup: HierarchyGroup = this.parent;

  while (parentGroup) {
    groups.unshift(parentGroup);

    parentGroup = parentGroup.parent;
  }

  return includeRootGroup ? groups : groups.slice(1);
}

function groupData(
  data: GroupData,
  groupingPredicate: (...args: any) => any,
  sortingPredicate: (...args: any) => SortingPredicateReturnType,
  depth: number = 1
): any {
  if (depth <= 0) return data;

  const r: Record<number, any> = _.groupBy(data.items, (i: any) => {
    return djb2Hash(
      JSON.stringify({
        key: data.key,
        data: groupingPredicate(i, depth),
      })
    );
  });

  const groupKeySorted: any[] = _.chain(r)
    .map((v: any[], k: string): any[] => ({ ...v[0], key: parseFloat(k) }))
    .sort((a: any, b: any) => {
      const v1: SortingPredicateReturnType = sortingPredicate(a, b, depth);
      const v2: SortingPredicateReturnType = sortingPredicate(b, a, depth);

      return sort(v1, v2);
    })
    .map('key')
    .value();

  return {
    key: data.key,
    items: _.map(groupKeySorted, (key: number) =>
      groupData({ key, items: r[key] }, groupingPredicate, sortingPredicate, depth - 1)
    ),
  };
}

function createHierarchy(
  data: GroupData,
  parseMetadataPredicate?: (...args: any) => any,
  depth: number = 1,
  cd: number = 0
): HierarchyGroup {
  const group: HierarchyGroup = {
    id: data.key,
    depth: cd,
    totalChildrenDepth: depth - cd,
    clone,
    sortItem,
    unsortItem,
    findClosest,
    addItems,
    removeItems,
  };

  if (cd >= depth) {
    group.items = data.items;
  } else {
    group.items = [];
    group.children = [];

    for (const value of data.items) {
      const childGroup: HierarchyGroup = createHierarchy(
        value,
        parseMetadataPredicate,
        depth,
        cd + 1
      );

      childGroup.parent = group;
      childGroup.previous = group.children[group.children.length - 1];

      group.children.push(childGroup);

      for (const item of childGroup.items) {
        group.items.push(item);
      }
    }
  }

  group.metadata = parseMetadataPredicate(group);

  return group;
}

export function groupBy(
  data: any[],
  groupingPredicate?: (v: any, d: number) => any,
  sortingPredicate?: (k1: any, k2: any, d: number) => [any, boolean],
  parseMetadataPredicate?: (group: HierarchyGroup) => any,
  depth?: number
): HierarchyGroup {
  return createHierarchy(
    groupData({ key: 0, items: data }, groupingPredicate, sortingPredicate, depth),
    parseMetadataPredicate,
    depth
  );
}
