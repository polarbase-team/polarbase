import { ChangeDetectionStrategy, Component, effect, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

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
import { ColumnDefinition } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import type { UpdatedColumnMode, UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

@Component({
  selector: 'data-view',
  templateUrl: './data-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, SplitButtonModule, DividerModule, SkeletonModule, SpreadsheetComponent],
})
export class DataViewComponent extends ViewBaseComponent {
  spreadsheet = viewChild<SpreadsheetComponent>('spreadsheet');

  protected config = signal<TableConfig>({
    sideSpacing: 20,
    row: { insertable: false, reorderable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
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

  private references = new Map<string, string>();

  constructor() {
    super();

    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.reset();
      this.loadTable(selectedTable);
    });
  }

  override reset() {
    super.reset();

    this.rows.set(null);
    this.columns.set(null);
  }

  override onColumnSave(
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

  override onRecordSave(
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

  protected override onSchemaLoaded(columnDefs: ColumnDefinition[]) {
    this.columns.set(null);

    if (!columnDefs.length) return;

    const columns: TableColumn[] = [];
    for (const c of columnDefs) {
      columns.push({
        id: c.name,
        primary: c.primary,
        editable: !c.primary,
        field: this.tblService.buildField(c),
      });
      if (c.dataType === DataType.Reference) {
        this.references.set(c.name, c.foreignKey.table);
      }
    }
    setTimeout(() => {
      this.columns.set(columns);
    });
  }

  protected override onRecordsLoaded(records: any[]) {
    this.rows.set(null);

    if (!records) return;

    const rows: TableRow[] = records.map((record: any) => {
      return {
        id: record.id,
        data: {
          ...record,
          ...Object.fromEntries(
            Array.from(this.references.entries())
              .filter(([key]) => key in record)
              .map(([key, refKey]) => [key, record[refKey]]),
          ),
        },
      };
    });
    setTimeout(() => {
      this.rows.set(rows);
    });
  }

  protected override onDataUpdated(message: TableRealtimeMessage) {
    const { action, record } = message;
    switch (action) {
      case 'insert': {
        const index = this.rows().findIndex((row) => row.id === record.new['id']);
        if (index !== -1) return;

        const rows = [...this.rows()];
        rows.push({ id: record.new['id'], data: record.new });
        this.spreadsheet().setRows(rows);
        break;
      }
      case 'update': {
        const index = this.rows().findIndex((row) => row.id === record.new['id']);
        if (index === -1) return;

        const rows = [...this.rows()];
        rows[index] = { ...rows[index], data: { ...rows[index].data, ...record.new } };
        this.spreadsheet().setRows(rows);
        break;
      }
      case 'delete': {
        const index = this.rows().findIndex((row) => row.id === record.key['id']);
        if (index === -1) return;

        const rows = [...this.rows()];
        rows.splice(index, 1);
        this.spreadsheet().setRows(rows);
        break;
      }
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
}
