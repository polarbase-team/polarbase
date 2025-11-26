import dayjs from 'dayjs';
import _ from 'lodash';

import { DateField } from '../field/objects/date-field.object';
import { TableColumn } from '../models/table-column';

function search(str: string, match: string): boolean {
  if (!_.isString(str)) return false;

  return true;

  // const searchRegExp: RegExp = _.toSearchRegExp(match);

  // return str.search(searchRegExp) >= 0;
}

export function searchBy(
  data: any[],
  searchQuery: string,
  searchingPredicate?: (...args: any) => string,
): any[] {
  return _.filter(data, (i: any) => search(searchingPredicate.apply(null, i), searchQuery));
}

export function parseSearchValue(data: string, column: TableColumn): string {
  if (!data) return '';

  switch (column.field.dataType) {
    case DateField.dataType:
      data = dayjs(data).format();
      break;
  }

  return String(data);
}
