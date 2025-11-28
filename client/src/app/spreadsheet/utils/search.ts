import _ from 'lodash';
import dayjs from 'dayjs';

import { DataType } from '../field/interfaces/field.interface';
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
    case DataType.Date:
      data = dayjs(data).format();
      break;
  }

  return String(data);
}
