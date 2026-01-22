import { Directive, DestroyRef, output, signal, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, finalize } from 'rxjs';

import {
  ColumnDefinition,
  RecordData,
  TableDefinition,
  TableService,
} from '../../../services/table.service';
import {
  TableRealtimeMessage,
  TableRealtimeService,
} from '../../../services/table-realtime.service';
import type {
  UpdateColumnEvent,
  UpdatedColumnMode,
  UpdatedRecordMode,
  UpdateRecordEvent,
} from '../table-detail.component';

@Directive()
export class ViewBaseComponent {
  onUpdateColumn = output<UpdateColumnEvent>();
  onUpdateRecord = output<UpdateRecordEvent>();

  protected destroyRef = inject(DestroyRef);
  protected tblService = inject(TableService);
  protected tblRealtimeService = inject(TableRealtimeService);
  protected isLoading = signal(false);
  protected columnDefs = signal<ColumnDefinition[]>([]);
  protected records = signal<RecordData[]>([]);
  protected fields = computed(() => this.columnDefs().map((c) => this.tblService.buildField(c)));

  constructor() {
    this.tblRealtimeService
      .enableSSE()
      .pipe(delay(200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          const { action, record } = event;
          const recordId = record.new.id;

          switch (action) {
            case 'insert':
              this.records.update((arr) =>
                arr.some((r) => r.id === recordId) ? arr : [...arr, record.new],
              );
              break;

            case 'update':
              this.records.update((records) =>
                records.map((r) => (r.id === recordId ? record.new : r)),
              );
              break;

            case 'delete':
              this.records.update((records) => records.filter((r) => r.id !== recordId));
              break;
          }

          this.onDataUpdated(event);
        },
      });
  }

  reset() {
    this.isLoading.set(false);
    this.columnDefs.set([]);
    this.records.set([]);
  }

  onColumnSave(
    savedColumn: ColumnDefinition,
    mode: UpdatedColumnMode,
    currentColumn?: ColumnDefinition,
  ) {
    const columnName = currentColumn?.name;

    if (mode === 'add') {
      this.columnDefs.update((arr) => [...arr, savedColumn]);
    } else if (mode === 'edit' && columnName !== undefined) {
      this.columnDefs.update((columns) =>
        columns.map((c) => (c.name === columnName ? currentColumn : c)),
      );
    }
  }

  onRecordSave(savedRecord: RecordData, mode: UpdatedRecordMode, currentRecord?: RecordData) {
    const recordId = currentRecord?.id;

    if (mode === 'add') {
      this.records.update((arr) => [...arr, savedRecord]);
    } else if (mode === 'edit' && recordId !== undefined) {
      this.records.update((records) => records.map((r) => (r.id === recordId ? savedRecord : r)));
    }
  }

  protected onSchemaLoaded(columnDefs: ColumnDefinition[]) {}

  protected onRecordsLoaded(records: any[]) {}

  protected onDataUpdated(message: TableRealtimeMessage) {}

  protected async loadTable(table: TableDefinition, filter?: Record<string, any>) {
    await this.loadTableSchema(table);
    await this.loadTableData(table, filter);
  }

  protected loadTableSchema(table: TableDefinition) {
    return new Promise((resolve, reject) => {
      this.isLoading.set(true);
      this.tblService
        .getTableSchema(table.tableName)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (columnDefs) => {
            this.columnDefs.set(columnDefs);
            this.onSchemaLoaded(columnDefs);
            resolve(columnDefs);
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }

  protected loadTableData(table: TableDefinition, filter?: Record<string, any>) {
    return new Promise((resolve, reject) => {
      this.tblService
        .getRecords(table.tableName, filter)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (records) => {
            this.records.set(records);
            this.onRecordsLoaded(records);
            resolve(records);
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }
}
