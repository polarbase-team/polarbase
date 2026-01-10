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
import { delay, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { SplitButtonModule } from 'primeng/splitbutton';

import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { getReferenceValue } from '@app/shared/field-system/models/reference/field.object';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { TableRow } from '@app/shared/spreadsheet/models/table-row';
import { TableConfig } from '@app/shared/spreadsheet/models/table';
import { SpreadsheetComponent } from '@app/shared/spreadsheet/spreadsheet.component';
import { TableAction, TableActionType } from '@app/shared/spreadsheet/events/table';
import {
  TableRowAction,
  TableRowActionType,
  TableRowAddedEvent,
} from '@app/shared/spreadsheet/events/table-row';
import {
  TableCellAction,
  TableCellActionType,
  TableCellEditedEvent,
} from '@app/shared/spreadsheet/events/table-cell';
import {
  TableColumnAction,
  TableColumnActionType,
} from '@app/shared/spreadsheet/events/table-column';
import { ReferenceViewDetailEvent } from '@app/shared/spreadsheet/components/field-cell/reference/cell.component';
import { ColumnEditorDrawerComponent } from '../../components/column-editor/column-editor-drawer.component';
import { RecordEditorDrawerComponent } from '../../components/record-editor/record-editor-drawer.component';
import { ColumnDefinition, TableDefinition, TableService } from '../../services/table.service';
import { TableRealtimeService } from '../../services/table-realtime.service';

interface UpdatedRecord {
  table: TableDefinition;
  fields: Field[];
  data: Record<string, any>;
}

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
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
  protected tblService = inject(TableService);
  protected updatedColumn: ColumnDefinition;
  protected updatedColumnField: Field;
  protected updatedColumnMode: 'add' | 'edit' = 'add';
  protected visibleColumnEditor: boolean;
  protected updatedRecord: UpdatedRecord = {} as UpdatedRecord;
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
      .pipe(delay(200), takeUntilDestroyed(this.destroyRef))
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

  protected onTableAction(action: TableAction) {
    switch (action.type) {
      case TableActionType.ViewReferenceDetail: {
        const { field, data } = action.payload as ReferenceViewDetailEvent;
        const tableName = field.referenceTo;
        const table = this.tblService.tables().find((t) => t.tableName === tableName);
        if (!table) return;

        this.tblService
          .getTableSchema(tableName)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((columnDefs) => {
            const fields = columnDefs.map((c) => this.tblService.buildField(c));
            this.tblService
              .getRecord(tableName, getReferenceValue(data))
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((record) => {
                this.updatedRecord = { table, fields, data: record };
                this.updatedRecordMode = 'edit';
                this.visibleRecordEditor = true;
              });
          });
        break;
      }
    }
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
      case TableColumnActionType.Delete:
        const columns = action.payload as TableColumn[];
        const obs = {};
        for (const column of columns) {
          obs[column.id] = this.tblService.deleteColumn(tableName, column.id as string);
        }
        forkJoin(obs).subscribe();
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
          records.push(row.data || {});
        }
        this.tblService
          .createRecords(tableName, records)
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
          .deleteRecords(tableName, recordIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
      case TableRowActionType.Expand:
        this.updatedRecord = {
          table: this.tblService.selectedTable(),
          fields: this.columns().map((c) => c.field),
          data: action.payload['data'],
        };
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
        const recordUpdates: { id: string | number; data: any }[] = [];
        for (const { row, newData } of action.payload as TableCellEditedEvent[]) {
          recordUpdates.push({ id: row.id, data: newData });
        }
        this.tblService
          .updateRecords(tableName, recordUpdates)
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
    this.updatedRecord = {} as UpdatedRecord;
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
        this.columns.set(null);

        if (!columnDefs.length) return;

        const columns: TableColumn[] = [];
        const references = new Map<string, string>();
        for (const c of columnDefs) {
          columns.push({
            id: c.name,
            primary: c.primary,
            editable: !c.primary,
            field: this.tblService.buildField(c),
          });
          if (c.dataType === DataType.Reference) {
            references.set(c.name, c.foreignKey.table);
          }
        }
        setTimeout(() => this.columns.set(columns));

        this.loadTableData(table, references);
      });
  }

  private loadTableData(table: TableDefinition, references: Map<string, string>) {
    this.tblService
      .getRecords(table.tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((records) => {
        this.rows.set(null);

        if (!records) return;

        const rows: TableRow[] = records.map((record: any) => {
          return {
            id: record.id,
            data: {
              ...record,
              ...Object.fromEntries(
                Array.from(references.entries())
                  .filter(([key]) => key in record)
                  .map(([key, refKey]) => [key, record[refKey]]),
              ),
            },
          };
        });
        setTimeout(() => this.rows.set(rows));
      });
  }
}
