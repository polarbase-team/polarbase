import { ChangeDetectionStrategy, Component, OnInit, signal, viewChild } from '@angular/core';
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
import { FilterGroup } from '@app/shared/field-system/filter/models';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { TableRow, TableRowSize } from '@app/shared/spreadsheet/models/table-row';
import { TableConfig } from '@app/shared/spreadsheet/models/table';
import { SpreadsheetComponent } from '@app/shared/spreadsheet/spreadsheet.component';
import {
  TableAction,
  TableActionType,
  TableFilterInfo,
} from '@app/shared/spreadsheet/events/table';
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
  TableColumnMovedEvent,
} from '@app/shared/spreadsheet/events/table-column';
import { ReferenceViewDetailEvent } from '@app/shared/spreadsheet/components/field-cell/reference/cell.component';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import type { UpdatedColumnMode, UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

interface ColumnLayout {
  calculateType: TableColumn['calculateType'] | null;
  groupRule: TableColumn['groupRule'] | null;
  sortRule: TableColumn['sortRule'] | null;
  hidden: boolean;
  order: number;
  width: number;
}

interface DataViewConfiguration {
  filterQuery?: FilterGroup | null;
  rowSize?: TableRowSize;
  frozenCount?: number;
  columnLayoutMap?: Record<string, Partial<ColumnLayout>>;
}

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
export class DataViewComponent extends ViewBaseComponent<DataViewConfiguration> implements OnInit {
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

  private references = new Map<string, string>();

  ngOnInit() {
    const configuration = this.getViewConfiguration();
    this.ssConfig.set({
      sideSpacing: 20,
      filterQuery: configuration.filterQuery,
      column: { frozenCount: configuration.frozenCount },
      row: { size: configuration.rowSize, insertable: false, reorderable: false },
    });

    this.loadTable();
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

    const configuration = this.getViewConfiguration();
    const ssColumns: TableColumn[] = [];
    for (const column of columns) {
      const columnProps = configuration.columnLayoutMap?.[column.name] || {};
      const ssColumn: TableColumn = {
        id: column.name,
        name: column.presentation?.uiName || column.name,
        primary: column.primary,
        editable: !column.primary,
        hidden: columnProps.hidden,
        width: columnProps.width,
        calculateType: columnProps.calculateType,
        groupRule: columnProps.groupRule,
        sortRule: columnProps.sortRule,
        field: this.tblService.buildField(column),
      };

      if (columnProps.order !== undefined) {
        ssColumns.splice(columnProps.order, 0, ssColumn);
      } else {
        ssColumns.push(ssColumn);
      }

      if (column.dataType === DataType.Reference) {
        this.references.set(column.name, `${column.name}_${column.foreignKey.table}`);
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
    const currentRows = this.ssRows();

    switch (action) {
      case 'insert': {
        if (currentRows.some((row) => row.id === record.new.id)) return;
        const newRow = { id: record.new.id, data: record.new };
        this.spreadsheet().setRows([...currentRows, newRow]);
        break;
      }

      case 'update': {
        const updatedRows = currentRows.map((row) =>
          row.id === record.new.id ? { ...row, data: { ...row.data, ...record.new } } : row,
        );
        this.spreadsheet().setRows(updatedRows);
        break;
      }

      case 'delete': {
        const filteredRows = currentRows.filter((row) => row.id !== record.key.id);
        if (filteredRows.length === currentRows.length) return;
        this.spreadsheet().setRows(filteredRows);
        break;
      }
    }
  }

  protected override saveViewConfiguration(configuration: DataViewConfiguration) {
    super.saveViewConfiguration({ ...this.getViewConfiguration(), ...configuration });
  }

  protected onTableAction(action: TableAction) {
    switch (action.type) {
      case TableActionType.Filter: {
        const configuration = this.getViewConfiguration();
        const filterQuery = (action.payload as TableFilterInfo).filterQuery;
        this.saveViewConfiguration({ ...configuration, filterQuery });
        break;
      }
      case TableActionType.Group: {
        const configuration = this.getViewConfiguration();
        const columns = action.payload as TableColumn[] | null;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        if (columns) {
          for (const column of columns) {
            const columnProps = columnLayoutMap[column.id] || {};
            columnLayoutMap[column.id] = { ...columnProps, groupRule: column.groupRule };
          }
        } else {
          for (const column of Object.keys(columnLayoutMap)) {
            columnLayoutMap[column] = { ...columnLayoutMap[column], groupRule: null };
          }
        }
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableActionType.Sort: {
        const configuration = this.getViewConfiguration();
        const columns = action.payload as TableColumn[] | null;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        if (columns) {
          for (const column of columns) {
            const columnProps = columnLayoutMap[column.id] || {};
            columnLayoutMap[column.id] = { ...columnProps, sortRule: column.sortRule };
          }
        } else {
          for (const column of Object.keys(columnLayoutMap)) {
            columnLayoutMap[column] = { ...columnLayoutMap[column], sortRule: null };
          }
        }
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableActionType.FreezeColumns:
        this.saveViewConfiguration({ frozenCount: action.payload as number });
        break;
      case TableActionType.ChangeRowSize:
        this.saveViewConfiguration({ rowSize: action.payload as TableRowSize });
        break;
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
      case TableColumnActionType.Delete: {
        const columns = action.payload as TableColumn[];
        const obs = {};
        for (const column of columns) {
          obs[column.id] = this.tblService.deleteColumn(this.table.name, column.id as string);
        }
        forkJoin(obs).subscribe();
        break;
      }
      case TableColumnActionType.Hide: {
        const configuration = this.getViewConfiguration();
        const columns = action.payload as TableColumn[];
        const columnLayoutMap = configuration.columnLayoutMap || {};
        for (const column of columns) {
          const columnProps = columnLayoutMap[column.id] || {};
          columnLayoutMap[column.id] = { ...columnProps, hidden: true };
        }
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableColumnActionType.Unhide: {
        const configuration = this.getViewConfiguration();
        const columns = action.payload as TableColumn[];
        const columnLayoutMap = configuration.columnLayoutMap || {};
        for (const column of columns) {
          const columnProps = columnLayoutMap[column.id] || {};
          columnLayoutMap[column.id] = { ...columnProps, hidden: false };
        }
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableColumnActionType.Calculate: {
        const configuration = this.getViewConfiguration();
        const column = action.payload as TableColumn;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        const columnProps = columnLayoutMap[column.id] || {};
        columnLayoutMap[column.id] = { ...columnProps, calculateType: column.calculateType };
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableColumnActionType.Uncalculate: {
        const configuration = this.getViewConfiguration();
        const column = action.payload as TableColumn;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        const columnProps = columnLayoutMap[column.id] || {};
        columnLayoutMap[column.id] = { ...columnProps, calculateType: null };
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableColumnActionType.Resize: {
        const configuration = this.getViewConfiguration();
        const column = action.payload as TableColumn;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        const columnProps = columnLayoutMap[column.id] || {};
        columnLayoutMap[column.id] = { ...columnProps, width: column.width };
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
      case TableColumnActionType.Move: {
        const configuration = this.getViewConfiguration();
        const { column, position } = action.payload as TableColumnMovedEvent;
        const columnLayoutMap = configuration.columnLayoutMap || {};
        const columnProps = columnLayoutMap[column.id] || {};
        columnLayoutMap[column.id] = { ...columnProps, order: position };
        this.saveViewConfiguration({ columnLayoutMap });
        break;
      }
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
            table: this.table(),
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
      case TableCellActionType.ViewReferenceDetail: {
        const { field, data } = action.payload as ReferenceViewDetailEvent;
        const tableName = field.referenceTo;
        const table = this.tblService.tables().find((t) => t.name === tableName);
        if (!table) return;

        this.tblService
          .getTableSchema(tableName)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((columns) => {
            const fields = columns.map((c) => this.tblService.buildField(c));
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
        table: this.table(),
        fields: this.fields(),
        data: { id: undefined },
      },
      mode: 'add',
    });
  }
}
