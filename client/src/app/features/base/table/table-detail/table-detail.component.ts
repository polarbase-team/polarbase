import _ from 'lodash';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { SplitButtonModule } from 'primeng/splitbutton';

import { Field } from '../../../../shared/spreadsheet/field/objects/field.object';
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
import {
  TableColumnAction,
  TableColumnActionType,
} from '../../../../shared/spreadsheet/events/table-column';
import { ColumnEditorDrawerComponent } from '../column-editor/column-editor-drawer.component';
import { RecordEditorDrawerComponent } from '../record-editor/record-editor-drawer.component';
import { ColumnDefinition, TableDefinition, TableService } from '../table.service';
import { TableRealtimeService } from '../table-realtime.service';

@Component({
  selector: 'table-detail',
  templateUrl: './table-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    DividerModule,
    SplitButtonModule,
    SpreadsheetComponent,
    RecordEditorDrawerComponent,
    ColumnEditorDrawerComponent,
  ],
})
export class TableDetailComponent {
  protected config = signal<TableConfig>({
    sideSpacing: 20,
    column: { deletable: false },
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
  protected fields = computed(() => {
    return this.columns().map((c) => c.field);
  });
  protected tblService = inject(TableService);
  protected updatedColumn: ColumnDefinition;
  protected updatedColumnField: Field;
  protected updatedColumnMode: 'add' | 'edit' = 'add';
  protected visibleColumnEditor: boolean;
  protected updatedRecord: Record<string, any>;
  protected updatedRecordMode: 'add' | 'edit' | 'view' = 'add';
  protected visibleRecordEditor: boolean;
  protected insertMenuItems: MenuItem[] = [
    {
      label: 'Insert row',
      icon: 'icon icon-rows-3',
      command: () => {
        this.addNewRecord();
      },
    },
    {
      label: 'Insert column',
      icon: 'icon icon-columns-3',
      command: () => {
        this.addNewColumn();
      },
    },
  ];

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

  protected onColumnAction(action: TableColumnAction) {
    const { tableName } = this.tblService.selectedTable();
    switch (action.type) {
      case TableColumnActionType.Add:
        this.addNewColumn();
        break;
      case TableColumnActionType.Edit:
        this.editColumn(action.payload as TableColumn);
        break;
    }
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

  protected onColumnSave(savedColumn: ColumnDefinition) {
    const column: TableColumn = {
      id: savedColumn.name,
      field: this.tblService.buildField(savedColumn),
    };
    this.columns.update((arr) => [...arr, column]);
  }

  protected onRecordSave(savedRecord: Record<string, any>) {
    const { tableColumnPk } = this.tblService.selectedTable();
    const recordId = savedRecord[tableColumnPk];

    if (this.updatedRecordMode === 'add') {
      const newRow: TableRow = {
        id: recordId,
        data: savedRecord,
      };
      this.rows.update((arr) => [...arr, newRow]);
    } else {
      this.rows.update((rows) =>
        rows.map((row) => (row.id === recordId ? { ...row, data: savedRecord } : row)),
      );
    }
  }

  protected addNewColumn() {
    this.updatedColumn = null;
    this.updatedColumnMode = 'add';
    this.visibleColumnEditor = true;
  }

  protected editColumn(column: TableColumn) {
    this.updatedColumn = column.field.params;
    this.updatedColumnField = column.field;
    this.updatedColumnMode = 'edit';
    this.visibleColumnEditor = true;
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
          id: c.name,
          primary: c.primary,
          editable: !c.primary,
          hidden: c.primary && length > 1,
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
