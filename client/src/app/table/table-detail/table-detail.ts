import _ from 'lodash';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TabsModule } from 'primeng/tabs';

import { TableColumn } from '../../spreadsheet/models/table-column';
import { TableRow } from '../../spreadsheet/models/table-row';
import { TableConfig } from '../../spreadsheet/models/table';
import { SpreadsheetComponent } from '../../spreadsheet/spreadsheet.component';
import { TableService } from '../table.service';

@Component({
  selector: 'app-table-detail',
  imports: [TabsModule, SpreadsheetComponent],
  templateUrl: './table-detail.html',
})
export class AppTableDetail {
  config = signal<TableConfig>({ sideSpacing: 20 });
  columns = signal<TableColumn[]>([]);
  rows = signal<TableRow[]>([]);

  tblService = inject(TableService);

  console = console;

  constructor(private destroyRef: DestroyRef) {
    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) {
        return;
      }

      this.loadTable(selectedTable.tableName);
    });
  }

  private loadTable(tableName: string) {
    this.loadTableSchema(tableName);
  }

  private loadTableSchema(tableName: string) {
    this.tblService
      .getTableSchema(tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((columnDefs) => {
        const columns = columnDefs.map((c) => ({
          id: c.columnName,
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
