import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TabsModule } from 'primeng/tabs';
import { ImageModule } from 'primeng/image';

import { TableColumn } from '../../common/spreadsheet/models/table-column';
import { TableRow } from '../../common/spreadsheet/models/table-row';
import { TableConfig } from '../../common/spreadsheet/models/table';
import { SpreadsheetComponent } from '../../common/spreadsheet/spreadsheet.component';
import {
  TableRowAction,
  TableRowActionType,
  TableRowAddedEvent,
} from '../../common/spreadsheet/events/table-row';
import {
  TableCellAction,
  TableCellActionType,
  TableCellEditedEvent,
} from '../../common/spreadsheet/events/table-cell';
import { TableService } from '../table.service';

@Component({
  selector: 'app-table-detail',
  imports: [TabsModule, ImageModule, SpreadsheetComponent],
  templateUrl: './table-detail.component.html',
})
export class AppTableDetail {
  protected config = signal<TableConfig>({
    sideSpacing: 20,
    column: { addable: false, deletable: false },
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);

  protected tblService = inject(TableService);

  constructor(private destroyRef: DestroyRef) {
    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) {
        return;
      }

      this.loadTable(selectedTable.tableName);
    });
  }

  protected onRowAction(action: TableRowAction) {
    const { tableName } = this.tblService.selectedTable();
    switch (action.type) {
      case TableRowActionType.Add:
        const records = (action.payload as TableRowAddedEvent[]).map(({ row }) => row.data);
        this.tblService
          .bulkCreateTableRecords(tableName, records)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
      case TableRowActionType.Delete:
        const recordIds = (action.payload as TableRow[]).map((row) => row.id);
        this.tblService
          .bulkDeleteTableRecords(tableName, recordIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
    }
  }

  protected onCellAction(action: TableCellAction) {
    const { tableName } = this.tblService.selectedTable();
    switch (action.type) {
      case TableCellActionType.Edit:
      case TableCellActionType.Paste:
      case TableCellActionType.Clear:
      case TableCellActionType.Fill:
        const recordUpdates: { where: any; data: any }[] = [];
        for (const { row, newData } of action.payload as TableCellEditedEvent[]) {
          recordUpdates.push({ where: { id: row.id }, data: newData });
        }
        this.tblService
          .bulkUpdateTableRecords(tableName, recordUpdates)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
    }
  }

  private loadTable(tableName: string) {
    this.loadTableSchema(tableName);
  }

  private loadTableSchema(tableName: string) {
    this.tblService
      .getTableSchema(tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((columnDefs) => {
        const columns: TableColumn[] = columnDefs.map((c) => ({
          id: c.columnName,
          primary: c.isPrimary,
          editable: !c.isPrimary,
          field: this.tblService.buildField(c),
        }));
        this.columns.set(null);
        setTimeout(() => this.columns.set(columns));
        if (!columns.length) return;

        this.loadTableData(tableName);
      });
  }

  private loadTableData(tableName: string) {
    this.tblService
      .getTableData(tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((arr) => {
        const rows: TableRow[] = arr.map((it: any) => ({
          id: it.id,
          data: it,
        }));
        this.rows.set(rows);
      });
  }
}
