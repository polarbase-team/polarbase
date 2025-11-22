import { HierarchyGroup } from '../utils/group';
import { TableColumn } from './table-column';

export interface TableGroup extends HierarchyGroup {
  collapsed?: boolean;
  calculatedResult?: Map<TableColumn['id'], any>;
}
