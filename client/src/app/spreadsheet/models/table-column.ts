import { Field } from '../field/objects';
import { CalculateType } from '../utils/calculate';
import { GroupSortType } from '../utils/group';
import { SortType } from '../utils/sort';

export interface TableColumn {
  id: string | number;
  field: Field;
  width?: number;
  editable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  calculateType?: CalculateType;
  groupSortType?: GroupSortType;
  sortType?: SortType;
}
