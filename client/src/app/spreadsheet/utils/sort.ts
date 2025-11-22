import _ from 'lodash';
import { TableColumn } from '../models/table-column';
import { TableRow } from '../models/table-row';

export type SortType = 'asc' | 'desc';
export type SortPredicateReturnType = [any, boolean];
export type SortData = string | number;

type ComparedResult = -1 | 0 | 1;

export function sort(v1: SortPredicateReturnType, v2: SortPredicateReturnType): ComparedResult {
  let compared: ComparedResult = 0;
  let s1 = v1[0];
  let s2 = v2[0];

  if (_.isArray(s1) && _.isArray(s2)) {
    const s1Bk = s1;
    const s2Bk = s2;

    s1 = s1[0];
    s2 = s2[0];

    if (s1 < s2) {
      compared = -1;
    } else if (s1 > s2) {
      compared = 1;
    } else if (s1Bk.length < s2Bk.length) {
      compared = -1;
    } else if (s1Bk.length > s2Bk.length) {
      compared = 1;
    } else {
      for (let j: number = 1; j < s1Bk.length; j++) {
        if (s1Bk[j] < s2Bk[j]) {
          compared = -1;
          break;
        } else if (s1Bk[j] > s2Bk[j]) {
          compared = 1;
          break;
        }
      }
    }
  }

  switch (true) {
    case s1 < s2:
    case s1 === '' && s2 !== '':
    case !s1 && _.isArray(s2):
      compared = -1;
      break;
    case s1 > s2:
    case s1 !== '' && s2 === '':
    case _.isArray(s1) && !s2:
      compared = 1;
      break;
  }

  const isReverse = v1[1];
  return compared === 0 ? compared : isReverse ? ((compared * -1) as ComparedResult) : compared;
}

export function sortPredicate(
  columns: TableColumn[],
  columnIndex: number,
  row: TableRow,
): SortPredicateReturnType {
  const column = columns[columnIndex];
  if (!column) return null;
  return [row.data?.[column.id] ?? '', column.sortType === 'desc'];
}

export function sortBy(rows: TableRow[], sortByColumns: TableColumn[]) {
  const items = [...rows];
  const loop: number = sortByColumns.length;

  items.sort((a: TableRow, b: TableRow) => {
    return makeupSortPredicate(sortByColumns, a, b, loop);
  });

  return items;
}

function makeupSortPredicate(
  sortByColumns: TableColumn[],
  srcRow: TableRow,
  desRow: TableRow,
  loop: number = 1,
  i: number = 0,
): ComparedResult {
  const v1 = sortPredicate(sortByColumns, i, srcRow);
  const v2 = sortPredicate(sortByColumns, i, desRow);
  let compared: ComparedResult = sort(v1, v2);

  // if s1 === s2 compare the next condition
  if (compared === 0 && loop > i + 1) {
    return (compared = makeupSortPredicate(sortByColumns, srcRow, desRow, loop, i + 1));
  }

  return compared;
}
