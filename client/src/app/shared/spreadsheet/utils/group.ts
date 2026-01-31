import _ from 'lodash';

import { sortBy, sort, sortPredicate } from './sort';
import { TableColumn } from '../models/table-column';
import { TableRow } from '../models/table-row';

export interface HierarchyGroup {
  id: number;
  depth: number;
  totalChildrenDepth: number;
  data: any;
  label: string;
  column: TableColumn;
  rows: TableRow[];
  parent: HierarchyGroup;
  previous: HierarchyGroup;
  children: HierarchyGroup[];
  clone: typeof clone;
  sortRows: typeof sortRows;
  unsortRows: typeof unsortRows;
  findClosest: typeof findClosest;
  addRows: typeof addRows;
  removeRows: typeof removeRows;
}

interface GroupData {
  key: number;
  items: any[];
  metadata: { data: any; label: string; column: TableColumn };
}

function djb2Hash(str: string) {
  let hash: number = 5381;

  for (let i: number = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }

  return hash >>> 0;
}

function clone() {
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

  if (!this.children) return;

  for (const childGroup of this.children) {
    childGroup.sortRows(sortByColumns);
  }
}

function unsortRows() {
  this.rows = [...this._rows];
  this._rows = null;

  if (!this.children) return;

  for (const childGroup of this.children) {
    childGroup.unsortRows();
  }
}

function addRows(rows: TableRow[], position = this.rows.length) {
  if (position < 0 || position > this.rows.length) return;

  const prevItem = this.rows[position - 1];
  const nextItem = this.rows[position];

  this.rows.splice(position, 0, ...rows);

  if (!this.parent) return;

  let targetIdx = 0;

  if (prevItem) {
    targetIdx = _.indexOf(this.parent.rows, prevItem) + 1;
  } else if (nextItem) {
    targetIdx = _.indexOf(this.parent.rows, nextItem);
  } else {
    let prevGroup = this.previous;

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

function removeRows(rows: TableRow[]) {
  const length = this.rows.length;

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

function findClosest(includeRootGroup?: boolean) {
  const groups: HierarchyGroup[] = [];
  let parentGroup: HierarchyGroup = this.parent;

  while (parentGroup) {
    groups.unshift(parentGroup);
    parentGroup = parentGroup.parent;
  }

  return includeRootGroup ? groups : groups.slice(1);
}

function groupPredicate(groupByColumns: TableColumn[], row: TableRow, depth: number) {
  const idx = groupByColumns.length - depth;
  const column = groupByColumns[idx];
  if (!column) return null;
  const data = row.data?.[column.id];
  const label = column.field.toString(data);
  return { column, data, label };
}

function sortGroupPredicate(groupByColumns: TableColumn[], currentRow: TableRow, depth: number) {
  const column = groupByColumns[groupByColumns.length - depth];
  if (!column) return null;

  return sortPredicate([{ ...column, sortRule: column.sortRule }], 0, currentRow);
}

function buildData(data: GroupData, groupByColumns: TableColumn[], depth: number = 1): GroupData {
  if (depth <= 0) return data;

  const metadata = {};
  const result: Record<number, any> = _.groupBy(data.items, (i) => {
    const dt = groupPredicate(groupByColumns, i, depth);
    const key = djb2Hash(
      JSON.stringify({
        key: data.key,
        data: dt.data,
      }),
    );
    metadata[key] = dt;
    return key;
  });
  const keys: number[] = _.chain(result)
    .map((v: any[], k: string) => ({ ...v[0], key: parseFloat(k) }))
    .sort((a: any, b: any) => {
      const v1 = sortGroupPredicate(groupByColumns, a, depth);
      const v2 = sortGroupPredicate(groupByColumns, b, depth);
      return sort(v1, v2);
    })
    .map('key')
    .value();

  return {
    key: data.key,
    items: _.map(keys, (key) =>
      buildData({ key, items: result[key], metadata: metadata[key] }, groupByColumns, depth - 1),
    ),
    metadata: data.metadata,
  };
}

function buildHierarchy(
  groupData: GroupData,
  groupByColumns: TableColumn[],
  onGroupNodeCreated?: (group: HierarchyGroup) => void,
  depth: number = 1,
  cd: number = 0,
) {
  const { column, label, data } = groupData.metadata || {};
  const group = {
    id: groupData.key,
    column,
    label,
    data,
    depth: cd,
    totalChildrenDepth: depth - cd,
  } as HierarchyGroup;
  group.clone = clone.bind(group);
  group.sortRows = sortRows.bind(group, groupByColumns);
  group.unsortRows = unsortRows.bind(group);
  group.findClosest = findClosest.bind(group);
  group.addRows = addRows.bind(group);
  group.removeRows = removeRows.bind(group);

  if (cd >= depth) {
    group.rows = groupData.items;
  } else {
    group.rows = [];
    group.children = [];

    for (const item of groupData.items) {
      const childGroup = buildHierarchy(item, groupByColumns, onGroupNodeCreated, depth, cd + 1);
      childGroup.parent = group;
      childGroup.previous = group.children[group.children.length - 1];

      group.children.push(childGroup);
      for (const item of childGroup.rows) {
        group.rows.push(item);
      }
    }
  }

  onGroupNodeCreated?.(group);

  return group;
}

export function groupBy(
  rows: TableRow[],
  groupByColumns: TableColumn[],
  onGroupNodeCreated?: (group: HierarchyGroup) => void,
) {
  const rootGroup = { key: 0, items: rows } as GroupData;
  const depth = groupByColumns.length;
  const data = buildData(rootGroup, groupByColumns, depth);
  return buildHierarchy(data, groupByColumns, onGroupNodeCreated, depth);
}
