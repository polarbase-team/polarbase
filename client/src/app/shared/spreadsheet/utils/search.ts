import _ from 'lodash';

import { TableRow } from '../models/table-row';
import { TableColumn } from '../models/table-column';

const ACCENTED_CHARACTER_MAP = {
  a: '[aàảãáạăằẳẵắặâầẩẫấậ]',
  d: '[dđ]',
  e: '[eèẻẽéẹêềểễếệ]',
  i: '[iìỉĩíị]',
  o: '[oòỏõóọôồổỗốộơờởỡớợ]',
  u: '[uùủũúụưừửữứự]',
  y: '[yỳỷỹýỵ]',
};

function escapeRegExp(str: string) {
  return _.chain(str)
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\x2d')
    .value();
}

function toSearchRegExp(str: string, flags = 'gi') {
  if (!str?.length) return null;

  const arr: string[] = str.split('');
  arr.forEach((char, index) => {
    arr[index] = ACCENTED_CHARACTER_MAP[char.toLowerCase()] || escapeRegExp(char);
  });

  return new RegExp(arr.join(''), flags);
}

function search(str: string, searchQuery: string) {
  const searchRegExp: RegExp = toSearchRegExp(searchQuery);
  return str.search(searchRegExp) >= 0;
}

export function searchBy(data: [TableRow, TableColumn][], searchQuery: string) {
  return data.filter(([row, column]) =>
    search(column.field.toString(row.data?.[column.id] ?? ''), searchQuery),
  );
}
