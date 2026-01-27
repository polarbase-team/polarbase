import { Field } from '../../field-system/models/field.object';
import { CalculateType } from '../utils/calculate';
import { SortType } from '../utils/sort';

export interface TableColumn {
  id: string | number;
  name: string;
  field: Field;
  width?: number;
  primary?: boolean;
  editable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  calculateType?: CalculateType;
  groupSortType?: SortType;
  sortType?: SortType;
}
