import { Field } from '../field/objects';
import { CalculateType } from '../utils/calculate';
import { GroupingType } from '../utils/group';
import { SortingType } from '../utils/sort';

export interface TableColumn {
  id: string | number;
  field: Field;
  width?: number;
  editable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  calculateType?: CalculateType;
  groupingType?: GroupingType;
  sortingType?: SortingType;
}
