import { Directive, DestroyRef, output, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, finalize } from 'rxjs';

import { ColumnDefinition, TableDefinition, TableService } from '../../../services/table.service';
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

  constructor() {
    this.tblRealtimeService
      .enableSSE()
      .pipe(delay(200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.onDataUpdated(event);
        },
      });
  }

  reset() {
    this.isLoading.set(false);
  }

  onColumnSave(
    savedColumn: ColumnDefinition,
    mode: UpdatedColumnMode,
    currentColumn?: ColumnDefinition,
  ) {}

  onRecordSave(
    savedRecord: Record<string, any>,
    mode: UpdatedRecordMode,
    currentRecord?: Record<string, any>,
  ) {}

  protected onSchemaLoaded(columnDefs: ColumnDefinition[]) {}

  protected onRecordsLoaded(records: any[]) {}

  protected onDataUpdated(message: TableRealtimeMessage) {}

  protected async loadTable(table: TableDefinition, filter?: Record<string, any>[]) {
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
