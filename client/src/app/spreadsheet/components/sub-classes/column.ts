import { EDataType } from '../../field/interfaces';
import { Field } from '../../field/objects';
import { ECalculateType } from '../../helpers/calculate';
import { SortingType } from '../../helpers/sort';
import { GroupingType } from '../../helpers/group';
import { _getColumnOffset } from '../sub-components/virtual-scroll/virtual-scroll-column-repeater.directive';

export type Column = {
  id: string | number;
  field: Field;
  width?: number;
  editable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  calculateType?: ECalculateType;
  groupingType?: GroupingType;
  sortingType?: SortingType;
};

export type ColumnMovedEvent = {
  column: Column;
  position: number;
};

export interface ColumnExtra extends Column {
  _bkWidth?: number;
  _isDragging?: boolean;
  _isResizing?: boolean;
}

export const UNGROUPABLE_FIELD_DATA_TYPES: ReadonlySet<EDataType> = new Set();
export const UNSORTABLE_FIELD_DATA_TYPES: ReadonlySet<EDataType> = new Set();

export function calculateColumnDragPlaceholderIndex(
  columns: Column[],
  offsetX: number,
  scrollLeft: number,
  frozenIndex: number,
): number {
  let dragPlaceholderIndex = 0;
  const length = columns.length;

  for (let i = 0; i <= length; i++) {
    const curr = columns[i];
    const next = columns[i + 1];

    if (!curr && !next) {
      return length;
    }

    let a = _getColumnOffset(curr);
    let b = _getColumnOffset(next) || (curr ? a + curr.width : a);

    if (i <= frozenIndex) {
      a += scrollLeft;
      b += scrollLeft;
    }

    if (offsetX < a) {
      break;
    }

    if (offsetX >= a && offsetX <= b) {
      const compared = (a + b) / 2;
      if (offsetX < compared) {
        dragPlaceholderIndex = i;
      } else {
        dragPlaceholderIndex = i + 1;
      }
      break;
    }

    dragPlaceholderIndex = i;
  }

  return dragPlaceholderIndex;
}

export function calculateFreezeDividerDragPlaceholderIndex(
  columns: Column[],
  offsetX: number,
  scrollLeft: number,
  frozenIndex: number,
): number {
  let dragPlaceholderIndex = 0;

  for (let i = 0; i < columns.length; i++) {
    let a = _getColumnOffset(columns[i]);
    let b = _getColumnOffset(columns[i + 1]) || a;

    if (i <= frozenIndex) {
      a += scrollLeft;
      b += scrollLeft;
    }

    if (offsetX < a) {
      break;
    }

    if (offsetX >= a && offsetX <= b) {
      const compared = (a + b) / 2;
      if (offsetX < compared) {
        dragPlaceholderIndex = i;
      } else {
        dragPlaceholderIndex = i + 1;
      }
      break;
    }

    dragPlaceholderIndex = i;
  }

  return dragPlaceholderIndex;
}
