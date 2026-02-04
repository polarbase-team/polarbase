import {
  Directive,
  DestroyRef,
  output,
  signal,
  inject,
  computed,
  input,
  TemplateRef,
} from '@angular/core';
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
import { ViewLayoutService } from '../../../services/view-layout.service';
import type {
  UpdateColumnEvent,
  UpdatedColumnMode,
  UpdatedRecordMode,
  UpdateRecordEvent,
} from '../table-detail.component';

@Directive()
export class ViewBaseComponent<T = any> {
  table = input<TableDefinition>();
  displayModeTmpl = input<TemplateRef<any>>();

  onUpdateColumn = output<UpdateColumnEvent>();
  onUpdateRecord = output<UpdateRecordEvent>();

  protected destroyRef = inject(DestroyRef);
  protected tableService = inject(TableService);
  protected tableRealtimeService = inject(TableRealtimeService);
  protected viewLayoutService = inject(ViewLayoutService);

  protected columns = signal<ColumnDefinition[]>([]);
  protected isColumnsLoading = signal(false);
  protected records = signal<RecordData[]>([]);
  protected isRecordsLoading = signal(false);
  protected fields = computed(() => this.columns().map((c) => this.tableService.buildField(c)));

  constructor() {
    this.tableRealtimeService
      .watch()
      .pipe(delay(200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          const { action, record } = event;

          switch (action) {
            case 'insert':
              this.records.update((arr) =>
                arr.some((r) => r.id === record.new.id) ? arr : [...arr, record.new],
              );
              break;

            case 'update':
              this.records.update((records) =>
                records.map((r) => (r.id === record.new.id ? record.new : r)),
              );
              break;

            case 'delete':
              this.records.update((records) => records.filter((r) => r.id !== record.key.id));
              break;
          }

          this.onRealtimeMessage(event);
        },
      });
  }

  onColumnSave(
    savedColumn: ColumnDefinition,
    mode: UpdatedColumnMode,
    currentColumn?: ColumnDefinition,
  ) {
    const columnName = currentColumn?.name;

    if (mode === 'add') {
      this.columns.update((arr) => [...arr, savedColumn]);
    } else if (mode === 'edit' && columnName !== undefined) {
      this.columns.update((columns) =>
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

  protected onColumnsLoaded(columns: ColumnDefinition[]) {}

  protected onRecordsLoaded(records: RecordData[]) {}

  protected onRealtimeMessage(message: TableRealtimeMessage) {}

  protected async loadTable() {
    await this.loadTableSchema();
    await this.loadTableData();
  }

  protected loadTableSchema() {
    return new Promise((resolve, reject) => {
      this.isColumnsLoading.set(true);
      this.tableService
        .getTableSchema(this.table().name)
        .pipe(
          finalize(() => this.isColumnsLoading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (columns) => {
            this.columns.set(columns);
            this.onColumnsLoaded(columns);
            resolve(columns);
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }

  protected loadTableData(filter?: Record<string, any>) {
    return new Promise((resolve, reject) => {
      this.isRecordsLoading.set(true);
      this.tableService
        .getRecords(this.table().name, filter)
        .pipe(
          finalize(() => this.isRecordsLoading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
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

  protected getViewConfiguration() {
    return (this.viewLayoutService.load(this.table().name)?.configuration || {}) as T;
  }

  protected saveViewConfiguration(configuration: T) {
    this.viewLayoutService.save(this.table().name, { configuration });
  }
}
