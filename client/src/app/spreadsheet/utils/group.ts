import _ from 'lodash';

import { sortBy, sort, SortPredicateReturnType, SortType, sortPredicate } from './sort';
import { TableColumn } from '../models/table-column';
import { TableRow } from '../models/table-row';

type GroupData = { key: number; rows: TableRow[] };

export type GroupType = SortType;
export type HierarchyGroup = {
  id?: number;
  depth?: number;
  totalChildrenDepth?: number;
  rows?: TableRow[];
  parent?: HierarchyGroup;
  previous?: HierarchyGroup;
  children?: HierarchyGroup[];
  metadata?: any;
  clone?: typeof clone;
  sortRows?: typeof sortRows;
  unsortRows?: typeof unsortRows;
  findClosest?: typeof findClosest;
  addRows?: typeof addRows;
  removeRows?: typeof removeRows;
  _rows?: TableRow[];
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

function sortRows(sortByColumns: TableColumn[]) {
  if (!this._rows) {
    this._rows = [...this.rows];
  }

  this.rows = sortBy(this.rows, sortByColumns);

  if (!this.children) {
    return;
  }

  for (const childGroup of this.children) {
    childGroup.sortRows(sortByColumns);
  }
}

function unsortRows() {
  this.rows = [...this._rows];
  this._rows = null;

  if (!this.children) {
    return;
  }

  for (const childGroup of this.children) {
    childGroup.unsortRows();
  }
}

function addRows(rows: any[], position: number = this.rows.length) {
  if (position < 0 || position > this.rows.length) return;

  const prevItem: any = this.rows[position - 1];
  const nextItem: any = this.rows[position];

  this.rows.splice(position, 0, ...rows);

  if (!this.parent) return;

  let targetIdx: number = 0;

  if (prevItem) {
    targetIdx = _.indexOf(this.parent.rows, prevItem) + 1;
  } else if (nextItem) {
    targetIdx = _.indexOf(this.parent.rows, nextItem);
  } else {
    let prevGroup: HierarchyGroup = this.previous;

    while (prevGroup) {
      if (prevGroup.rows.length) {
        targetIdx = _.indexOf(this.parent.rows, _.last(prevGroup.rows)) + 1;
        break;
      }

      prevGroup = prevGroup.previous;
    }
  }

  this.parent.addRows(rows, targetIdx);
}

function removeRows(rows: any[]): boolean {
  const length: number = this.rows.length;

  _.pull(this.rows, ...rows);

  if (length !== this.rows.length) {
    if (this.children) {
      for (const childGroup of this.children) {
        if (childGroup.removeRows(rows)) break;
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

function groupPredicate(groupByColumns: TableColumn[], row: TableRow, depth: number): any {
  const idx = groupByColumns.length - depth;
  const column = groupByColumns[idx];
  if (!column) return;
  return row.data;
}

function sortGroupPredicate(groupByColumns: TableColumn[], currentRow: TableRow, depth: number) {
  const column = groupByColumns[groupByColumns.length - depth];
  if (!column) return null;

  return sortPredicate([{ ...column, sortingType: column.groupingType }], 0, currentRow);
}

function groupData(data: GroupData, groupByColumns: TableColumn[], depth: number = 1): any {
  if (depth <= 0) return data;

  const r: Record<number, any> = _.groupBy(data.rows, (i: any) => {
    return djb2Hash(
      JSON.stringify({
        key: data.key,
        data: groupPredicate(groupByColumns, i, depth),
      }),
    );
  });

  const groupKeySorted: any[] = _.chain(r)
    .map((v: any[], k: string): any[] => ({ ...v[0], key: parseFloat(k) }))
    .sort((a: any, b: any) => {
      const v1: SortPredicateReturnType = sortGroupPredicate(groupByColumns, a, depth);
      const v2: SortPredicateReturnType = sortGroupPredicate(groupByColumns, b, depth);

      return sort(v1, v2);
    })
    .map('key')
    .value();

  return {
    key: data.key,
    rows: _.map(groupKeySorted, (key: number) =>
      groupData({ key, rows: r[key] }, groupByColumns, depth - 1),
    ),
  };
}

function createHierarchy(
  data: GroupData,
  groupByColumns: TableColumn[],
  parseMetadataPredicate?: (...args: any) => any,
  depth: number = 1,
  cd: number = 0,
): HierarchyGroup {
  const group: HierarchyGroup = {
    id: data.key,
    depth: cd,
    totalChildrenDepth: depth - cd,
  };
  group.clone = group.clone.bind(group);
  group.sortRows = sortRows.bind(group, groupByColumns);
  group.unsortRows = group.unsortRows.bind(group);
  group.findClosest = group.findClosest.bind(group);
  group.addRows = group.addRows.bind(group);
  group.removeRows = group.removeRows.bind(group);

  if (cd >= depth) {
    group.rows = data.rows;
  } else {
    group.rows = [];
    group.children = [];

    for (const value of data.rows) {
      const childGroup: HierarchyGroup = createHierarchy(
        value as unknown as GroupData,
        groupByColumns,
        parseMetadataPredicate,
        depth,
        cd + 1,
      );

      childGroup.parent = group;
      childGroup.previous = group.children[group.children.length - 1];

      group.children.push(childGroup);

      for (const item of childGroup.rows) {
        group.rows.push(item);
      }
    }
  }

  group.metadata = parseMetadataPredicate(group);

  return group;
}

export function groupBy(
  rows: TableRow[],
  groupByColumns: TableColumn[],
  parseMetadataPredicate?: (group: HierarchyGroup) => any,
): HierarchyGroup {
  const depth = groupByColumns.length;
  return createHierarchy(
    groupData({ key: 0, rows }, groupByColumns, depth),
    groupByColumns,
    parseMetadataPredicate,
    depth,
  );
}
