import _ from 'lodash';

export type SortingType = 'asc' | 'desc';
export type SortingPredicateReturnType = [any, boolean];
export type SortingData = string | number;

export function sort(v1: SortingPredicateReturnType, v2: SortingPredicateReturnType): -1 | 0 | 1 {
  let compared: -1 | 0 | 1 = 0;

  let s1: any = v1[0];
  let s2: any = v2[0];

  const isReverse: boolean = v1[1];

  if (_.isArray(s1) && _.isArray(s2)) {
    const s1Bk: any = s1;
    const s2Bk: any = s2;

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

  return compared === 0 ? compared : isReverse ? ((compared * -1) as any) : compared;
}

export function sortBy(
  data: any[],
  sortingPredicate?: (...args: any) => SortingPredicateReturnType,
  loop: number = 1
) {
  const items: any[] = [...data];

  items.sort((a: any, b: any) => {
    return makeupSortPredicate(sortingPredicate, loop, a, b);
  });

  return items;
}

function makeupSortPredicate(
  sortingPredicate: (...args: any) => SortingPredicateReturnType,
  loop: number,
  a: any,
  b: any,
  i: number = 0
): -1 | 0 | 1 {
  const v1: SortingPredicateReturnType = sortingPredicate(i, a, b);
  const v2: SortingPredicateReturnType = sortingPredicate(i, b, a);
  let compared: -1 | 0 | 1 = sort(v1, v2);

  // if s1 === s2 compare the next condition
  if (compared === 0 && loop > i + 1) {
    return (compared = makeupSortPredicate(sortingPredicate, loop, a, b, i + 1));
  }

  return compared;
}
