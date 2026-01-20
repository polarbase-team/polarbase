import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, finalize, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';

import { DataType } from '@app/shared/field-system/models/field.interface';
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
import { ColumnDefinition, TableDefinition, TableService } from '../../../services/table.service';
import { TableRealtimeService } from '../../../services/table-realtime.service';
import type {
  UpdateColumnEvent,
  UpdatedColumnMode,
  UpdatedRecordMode,
  UpdateRecordEvent,
} from '../table-detail.component';

@Component({
  selector: 'data-view',
  templateUrl: './data-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, SplitButtonModule, DividerModule, SkeletonModule, SpreadsheetComponent],
})
export class DataViewComponent {
  spreadsheet = viewChild<SpreadsheetComponent>('spreadsheet');

  onUpdateColumn = output<UpdateColumnEvent>();
  onUpdateRecord = output<UpdateRecordEvent>();

  protected config = signal<TableConfig>({
    sideSpacing: 20,
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
  protected isLoading = signal(false);
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
    private tblService: TableService,
    private tblRealtimeService: TableRealtimeService,
  ) {
    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.loadTable(selectedTable);
    });
  }

  ngOnInit() {
    this.tblRealtimeService
      .enableSSE()
      .pipe(delay(200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tableKeyColumn, action, record }) => {
          switch (action) {
            case 'insert': {
              const recordPk = record.new[tableKeyColumn];
              if (this.rows().find((row) => row.id === recordPk)) return;

              this.spreadsheet().setRows([...this.rows(), { id: recordPk, data: record.new }]);
              break;
            }
            case 'update': {
              const recordPk = record.new[tableKeyColumn];
              this.spreadsheet().setRows(
                this.rows().map((row) =>
                  row.id === recordPk ? { ...row, data: { ...row.data, ...record.new } } : row,
                ),
              );
              break;
            }
            case 'delete': {
              const recordPk = record.key[tableKeyColumn];
              this.spreadsheet().setRows(this.rows().filter((row) => row.id !== recordPk));
              break;
            }
          }
        },
      });
  }

  onColumnSave(
    savedColumn: ColumnDefinition,
    mode: UpdatedColumnMode,
    currentColumn?: ColumnDefinition,
  ) {
    if (mode === 'add') {
      const column: TableColumn = {
        id: savedColumn.name,
        field: this.tblService.buildField(savedColumn),
      };
      this.columns.update((arr) => [...arr, column]);

      if (savedColumn.defaultValue !== undefined) {
        this.rows.update((rows) =>
          rows.map((row) => {
            if (row.data[savedColumn.name] === undefined) {
              return {
                ...row,
                data: { ...row.data, [savedColumn.name]: savedColumn.defaultValue },
              };
            }
            return row;
          }),
        );
      }
    } else if (mode === 'edit') {
      const columnIndex = this.columns().findIndex((c) => c.id === currentColumn.name);
      if (columnIndex >= 0) {
        const updatedColumn: TableColumn = {
          id: savedColumn.name,
          field: this.tblService.buildField(savedColumn),
        };
        this.columns.update((arr) => {
          const newArr = [...arr];
          if (newArr[columnIndex].field.dataType !== updatedColumn.field.dataType) {
            newArr.splice(columnIndex, 1, updatedColumn);
          } else {
            newArr[columnIndex] = updatedColumn;
          }
          return newArr;
        });
      }
    }
  }

  onRecordSave(
    savedRecord: Record<string, any>,
    mode: UpdatedRecordMode,
    currentRecord?: Record<string, any>,
  ) {
    if (mode === 'add') {
      const newRow: TableRow = {
        id: savedRecord['id'],
        data: savedRecord,
      };
      this.rows.update((arr) => [...arr, newRow]);
    } else if (mode === 'edit') {
      const recordId = currentRecord['id'];
      this.rows.update((rows) =>
        rows.map((row) => (row.id === recordId ? { ...row, data: savedRecord } : row)),
      );
    }
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
                this.onUpdateRecord.emit({
                  record: { table, fields, data: record },
                  mode: 'edit',
                });
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
    const { tableName } = this.tblService.selectedTable();
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
              row.id = data.returning[i]['id'];
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
        this.onUpdateRecord.emit({
          record: {
            table: this.tblService.selectedTable(),
            fields: this.columns().map((c) => c.field),
            data: action.payload['data'],
          },
          mode: 'edit',
        });
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

  protected addNewColumn() {
    this.onUpdateColumn.emit({
      column: null,
      mode: 'add',
    });
  }

  protected editColumn(column: TableColumn) {
    this.onUpdateColumn.emit({
      column: column.field.params,
      mode: 'edit',
    });
  }

  protected addNewRecord() {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.columns().map((c) => c.field),
        data: {},
      },
      mode: 'add',
    });
  }

  private loadTable(table: TableDefinition) {
    this.columns.set(null);
    this.rows.set(null);
    this.loadTableSchema(table);
  }

  private loadTableSchema(table: TableDefinition) {
    this.isLoading.set(true);
    this.tblService
      .getTableSchema(table.tableName)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
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
        setTimeout(() => {
          this.columns.set(columns);
        });

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
        setTimeout(() => {
          this.rows.set(rows);
        });
      });
  }
}
