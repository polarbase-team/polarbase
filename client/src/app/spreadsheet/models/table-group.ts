import { HierarchyGroup } from '../utils/group';
import { TableColumn } from './table-column';
import { TableRow } from './table-row';

export interface TableGroup extends HierarchyGroup {
  items?: TableRow[];
  children?: TableGroup[];
  metadata?: {
    column: TableColumn;
    data: any;
    parsed: string;
    empty: boolean;
    collapsed: boolean;
    calculatedResult?: Map<TableColumn['id'], any>;
  };
}
