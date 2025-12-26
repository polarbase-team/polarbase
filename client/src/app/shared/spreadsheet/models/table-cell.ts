import { TableColumn } from './table-column';
import { TableRow } from './table-row';

export interface TableCell {
  row: TableRow;
  column: TableColumn;
}
