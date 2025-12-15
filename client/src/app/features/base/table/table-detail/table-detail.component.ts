import _ from 'lodash';

import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { TableColumn } from '../../../../shared/spreadsheet/models/table-column';
import { TableRow } from '../../../../shared/spreadsheet/models/table-row';
import { TableConfig } from '../../../../shared/spreadsheet/models/table';
import { SpreadsheetComponent } from '../../../../shared/spreadsheet/spreadsheet.component';
import {
  TableRowAction,
  TableRowActionType,
  TableRowAddedEvent,
} from '../../../../shared/spreadsheet/events/table-row';
import {
  TableCellAction,
  TableCellActionType,
  TableCellEditedEvent,
} from '../../../../shared/spreadsheet/events/table-cell';
import { RecordEditorDrawerComponent } from '../record-editor/record-editor-drawer.component';
import { TableDefinition, TableService } from '../table.service';
import { TableRealtimeService } from '../table-realtime.service';

@Component({
  selector: 'table-detail',
  templateUrl: './table-detail.component.html',
  imports: [ButtonModule, DividerModule, SpreadsheetComponent, RecordEditorDrawerComponent],
})
export class TableDetailComponent {
  protected config = signal<TableConfig>({
    sideSpacing: 20,
    column: { addable: false, deletable: false },
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
  protected fields = computed(() => {
    return this.columns().map((c) => c.field);
  });
  protected tblService = inject(TableService);
  protected updatedRecord: Record<string, any>;
  protected updatedRecordMode: 'add' | 'edit' | 'view' = 'add';
  protected visibleRecordEditor: boolean;

  constructor(
    private destroyRef: DestroyRef,
    private tblRealtimeService: TableRealtimeService,
  ) {
    effect(() => {
      this.visibleRecordEditor = false;

      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.loadTable(selectedTable);
    });
  }

  ngOnInit() {
    this.tblRealtimeService
      .enable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tableKeyColumn, action, record }) => {
          switch (action) {
            case 'insert': {
              const recordPk = record.new[tableKeyColumn];
              if (this.rows().find((row) => row.id === recordPk)) return;

              this.rows.update((arr) => [...arr, { id: recordPk, data: record.new }]);
              break;
            }
            case 'update': {
              const recordPk = record.new[tableKeyColumn];
              this.rows.update((rows) =>
                rows.map((row) => (row.id === recordPk ? { ...row, data: record.new } : row)),
              );
              break;
            }
            case 'delete': {
              const recordPk = record.key[tableKeyColumn];
              this.rows.update((arr) => arr.filter((row) => row.id !== recordPk));
              break;
            }
          }
        },
      });
  }

  protected onRowAction(action: TableRowAction) {
    const { tableName, tableColumnPk } = this.tblService.selectedTable();
    switch (action.type) {
      case TableRowActionType.Add:
        const rows = [];
        const records = [];
        for (const { row } of action.payload as TableRowAddedEvent[]) {
          rows.push(row);
          records.push(row.data);
        }
        this.tblService
          .bulkCreateRecords(tableName, records)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(({ data }) => {
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              row.id = data.returning[i][tableColumnPk || 'id'];
              row.data = data.returning[i];
            }
            this.rows.update((arr) => [...arr]);
          });
        break;
      case TableRowActionType.Delete:
        const recordIds = (action.payload as TableRow[]).map((row) => row.id);
        this.tblService
          .bulkDeleteRecords(tableName, recordIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
      case TableRowActionType.Expand:
        this.updatedRecord = action.payload['data'];
        this.updatedRecordMode = 'edit';
        this.visibleRecordEditor = true;
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
          .bulkUpdateRecords(tableName, recordUpdates)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
    }
  }

  protected onRecordSave(record: Record<string, any>) {
    const { tableColumnPk } = this.tblService.selectedTable();
    const recordId = record[tableColumnPk];

    if (this.updatedRecordMode === 'add') {
      const newRow: TableRow = {
        id: recordId,
        data: record,
      };
      this.rows.update((arr) => [...arr, newRow]);
    } else {
      this.rows.update((rows) =>
        rows.map((row) => (row.id === recordId ? { ...row, data: record } : row)),
      );
    }
  }

  protected addNewRecord() {
    this.updatedRecord = {} as TableRow;
    this.updatedRecordMode = 'add';
    this.visibleRecordEditor = true;
  }

  private loadTable(table: TableDefinition) {
    this.loadTableSchema(table);
  }

  private loadTableSchema(table: TableDefinition) {
    this.tblService
      .getTableSchema(table.tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((columnDefs) => {
        const length = columnDefs.length;
        const columns: TableColumn[] = columnDefs.map((c) => ({
          id: c.columnName,
          primary: c.isPrimary,
          editable: !c.isPrimary,
          hidden: c.isPrimary && length > 1,
          field: this.tblService.buildField(c),
        }));
        this.columns.set(null);
        setTimeout(() => this.columns.set(columns));
        if (!columns.length) return;

        this.loadTableData(table);
      });
  }

  private loadTableData(table: TableDefinition) {
    this.tblService
      .getRecords(table.tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((arr) => {
        const rows: TableRow[] = arr.map((it: any) => ({
          id: it[table.tableColumnPk || 'id'],
          data: it,
        }));
        this.rows.set(rows);
      });
  }
}
