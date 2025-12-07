import { TableColumn } from './table-column';

export type TableRowCellData = Record<TableColumn['id'], any>;
export interface TableRow {
  id: string | number;
  name: string;
  data: TableRowCellData;
  editable?: boolean | Record<TableColumn['id'], boolean>;
  deletable?: boolean;
  selected?: boolean;
}
