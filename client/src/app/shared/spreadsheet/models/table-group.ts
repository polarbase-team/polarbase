import { HierarchyGroup } from '../utils/group';
import { TableColumn } from './table-column';

export interface TableGroup extends HierarchyGroup {
  isCollapsed?: boolean;
  calcResults?: Map<TableColumn['id'], any>;
}
