import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ColumnDefinition, RecordData, TableDefinition } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import type { UpdatedColumnMode, UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

@Component({
  selector: 'data-view',
  templateUrl: './data-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    SplitButtonModule,
    DividerModule,
    SkeletonModule,
    SpreadsheetComponent,
  ],
})
export class DataViewComponent extends ViewBaseComponent {
  spreadsheet = viewChild<SpreadsheetComponent>('spreadsheet');

  protected ssConfig = signal<TableConfig>({
    sideSpacing: 20,
    row: { insertable: false, reorderable: false },
  });
  protected ssColumns = signal<TableColumn[]>([]);
  protected ssRows = signal<TableRow[]>([]);
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

  private table: TableDefinition;
  private references = new Map<string, string>();

  constructor() {
    super();

    this.table = this.tblService.activeTable();
    this.loadTable(this.table);
  }

  override reset() {
    super.reset();

    this.ssRows.set(null);
    this.ssColumns.set(null);
  }

  override onColumnSave(
    savedColumn: ColumnDefinition,
    mode: UpdatedColumnMode,
    currentColumn?: ColumnDefinition,
  ) {
    super.onColumnSave(savedColumn, mode, currentColumn);

    const columnName = savedColumn.name;
    const columnUiName = savedColumn.presentation?.uiName || savedColumn.name;
    const currentColumnId = currentColumn?.name;

    if (mode === 'add') {
      const newColumn: TableColumn = {
        id: columnName,
        name: columnUiName,
        field: this.tblService.buildField(savedColumn),
      };
      this.ssColumns.update((arr) => [...arr, newColumn]);

      if (savedColumn.defaultValue !== undefined) {
        this.ssRows.update((rows) =>
          rows.map((row) =>
            row.data[columnName] === undefined
              ? { ...row, data: { ...row.data, [columnName]: savedColumn.defaultValue } }
              : row,
          ),
        );
      }
    } else if (mode === 'edit' && currentColumnId !== undefined) {
      const updatedColumn: TableColumn = {
        id: columnName,
        name: columnUiName,
        field: this.tblService.buildField(savedColumn),
      };

      this.ssColumns.update((columns) =>
        columns.map((col) => (col.id === currentColumnId ? updatedColumn : col)),
      );
    }
  }

  override onRecordSave(
    savedRecord: RecordData,
    mode: UpdatedRecordMode,
    currentRecord?: RecordData,
  ) {
    const recordId = mode === 'add' ? savedRecord.id : currentRecord?.id;

    if (mode === 'add') {
      this.ssRows.update((arr) => {
        if (arr.some((row) => row.id === recordId)) return arr;

        return [...arr, { id: recordId, data: savedRecord }];
      });
    } else if (mode === 'edit' && recordId !== undefined) {
      this.ssRows.update((rows) =>
        rows.map((row) =>
          row.id === recordId ? { ...row, data: { ...row.data, ...savedRecord } } : row,
        ),
      );
    }
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.ssColumns.set(null);

    if (!columns.length) return;

    const ssColumns: TableColumn[] = [];
    for (const c of columns) {
      ssColumns.push({
        id: c.name,
        name: c.presentation?.uiName || c.name,
        primary: c.primary,
        editable: !c.primary,
        field: this.tblService.buildField(c),
      });
      if (c.dataType === DataType.Reference) {
        this.references.set(c.name, c.foreignKey.table);
      }
    }
    setTimeout(() => {
      this.ssColumns.set(ssColumns);
    });
  }

  protected override onRecordsLoaded(records: any[]) {
    this.ssRows.set(null);

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
      this.ssRows.set(rows);
    });
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;
    const recordId = record.new?.id ?? record.key?.id;
    const currentRows = this.ssRows();

    switch (action) {
      case 'insert': {
        if (currentRows.some((row) => row.id === recordId)) return;

        const newRow = { id: recordId, data: record.new };
        this.spreadsheet().setRows([...currentRows, newRow]);
        break;
      }

      case 'update': {
        const updatedRows = currentRows.map((row) =>
          row.id === recordId ? { ...row, data: { ...row.data, ...record.new } } : row,
        );

        this.spreadsheet().setRows(updatedRows);
        break;
      }

      case 'delete': {
        const filteredRows = currentRows.filter((row) => row.id !== recordId);
        if (filteredRows.length === currentRows.length) return;

        this.spreadsheet().setRows(filteredRows);
        break;
      }
    }
  }

  protected onTableAction(action: TableAction) {
    switch (action.type) {
      case TableActionType.ViewReferenceDetail: {
        const { field, data } = action.payload as ReferenceViewDetailEvent;
        const tableName = field.referenceTo;
        const table = this.tblService.tables().find((t) => t.name === tableName);
        if (!table) return;

        this.tblService
          .getTableSchema(tableName)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((columns) => {
            this.tblService
              .getRecord(tableName, getReferenceValue(data))
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((record) => {
                this.onUpdateRecord.emit({
                  record: { table, fields: this.fields(), data: record },
                  mode: 'edit',
                });
              });
          });
        break;
      }
    }
  }

  protected onColumnAction(action: TableColumnAction) {
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
          obs[column.id] = this.tblService.deleteColumn(this.table.name, column.id as string);
        }
        forkJoin(obs).subscribe();
        break;
    }
  }

  protected onRowAction(action: TableRowAction) {
    switch (action.type) {
      case TableRowActionType.Add:
        const rows = [];
        const records = [];
        for (const { row } of action.payload as TableRowAddedEvent[]) {
          rows.push(row);
          records.push(row.data || {});
        }
        this.tblService
          .createRecords(this.table.name, records)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(({ data }) => {
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              row.id = data.returning[i].id;
              row.data = data.returning[i];
            }
            this.ssRows.update((arr) => [...arr]);
          });
        break;
      case TableRowActionType.Delete:
        const recordIds = (action.payload as TableRow[]).map((row) => row.id);
        this.tblService
          .deleteRecords(this.table.name, recordIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        break;
      case TableRowActionType.Expand:
        this.onUpdateRecord.emit({
          record: {
            table: this.table,
            fields: this.fields(),
            data: action.payload['data'],
          },
          mode: 'edit',
        });
        break;
    }
  }

  protected onCellAction(action: TableCellAction) {
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
          .updateRecords(this.table.name, recordUpdates)
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
        table: this.table,
        fields: this.fields(),
        data: { id: undefined },
      },
      mode: 'add',
    });
  }
}
