import { HierarchyGroup } from '../utils/group';
import { TableColumn } from './table-column';

export interface TableGroup extends HierarchyGroup {
  isCollapsed?: boolean;
  calculatedResult?: Map<TableColumn['id'], any>;
}
