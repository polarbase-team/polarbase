import _ from 'lodash';

import { ChangeDetectionStrategy, Component, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import dayjs, { Dayjs } from 'dayjs';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';

import { getRecordDisplayLabel } from '@app/core/utils';
import {
  CalendarComponent,
  CalendarDateClickArg,
  CalendarEvent,
  CalendarEventClickArg,
} from '@app/shared/calendar/calendar.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { TableRealtimeMessage } from '@app/features/base/table/services/table-realtime.service';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { ViewBaseComponent } from '../view-base.component';
import { UpdatedRecordMode } from '../../table-detail.component';

@Component({
  selector: 'calendar-view',
  templateUrl: './calendar-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    PopoverModule,
    SelectModule,
    DividerModule,
    ProgressSpinnerModule,
    SkeletonModule,
    CalendarComponent,
    FilterOptionComponent,
  ],
})
export class CalendarViewComponent extends ViewBaseComponent {
  calendar = viewChild<CalendarComponent>('calendar');

  protected dateColumns: ColumnDefinition[] = [];
  protected events = signal<CalendarEvent[]>([]);
  protected selectedStartField: string;
  protected selectedEndField: string;

  constructor() {
    super();

    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.reset();
      this.loadTableSchema(selectedTable);
    });
  }

  override reset() {
    super.reset();

    this.dateColumns = [];
    this.events.set([]);
    this.selectedStartField = undefined;
    this.selectedEndField = undefined;

    this.calendar().reset();
  }

  override onRecordSave(
    savedRecord: RecordData,
    mode: UpdatedRecordMode,
    currentRecord?: RecordData,
  ) {
    super.onRecordSave(savedRecord, mode, currentRecord);

    const recordId = currentRecord?.id;

    if (mode === 'add') {
      this.events.update((events) => [
        ...events,
        {
          id: String(savedRecord.id),
          title: getRecordDisplayLabel(savedRecord),
          start: savedRecord[this.selectedStartField],
          end: savedRecord[this.selectedEndField],
        },
      ]);
    } else if (mode === 'edit' && recordId !== undefined) {
      this.events.update((events) =>
        events.map((e) =>
          e.id === recordId
            ? {
                ...e,
                title: getRecordDisplayLabel(savedRecord),
                start: savedRecord[this.selectedStartField],
                end: savedRecord[this.selectedEndField],
              }
            : e,
        ),
      );
    }
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.dateColumns = columns.filter(
      (c) => c.dataType === DataType.AutoDate || c.dataType === DataType.Date,
    );
  }

  protected override onRecordsLoaded(records: any[]) {
    this.onRecordsFiltered(records);
  }

  protected onRecordsFiltered(records: any[]) {
    this.events.set(
      records.map((record) => ({
        id: record.id,
        title: getRecordDisplayLabel(record),
        start: record[this.selectedStartField],
        end: record[this.selectedEndField],
      })),
    );
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;
    const recordId = record.new.id;

    switch (action) {
      case 'insert':
        this.events.update((events) => {
          if (events.some((e) => e.id === recordId)) return events;

          return [
            ...events,
            {
              id: String(recordId),
              title: getRecordDisplayLabel(record.new),
              start: record.new[this.selectedStartField],
              end: record.new[this.selectedEndField],
            },
          ];
        });
        break;

      case 'update':
        if (record.new[this.selectedStartField]) {
          this.events.update((events) =>
            events.map((e) =>
              e.id === recordId
                ? {
                    ...e,
                    title: getRecordDisplayLabel(record.new),
                    start: record.new[this.selectedStartField],
                    end: record.new[this.selectedEndField],
                  }
                : e,
            ),
          );
        } else {
          this.events.update((events) => events.filter((e) => e.id !== recordId));
        }
        break;

      case 'delete':
        this.events.update((events) => events.filter((e) => e.id !== recordId));
        break;
    }
  }

  protected onDateClick(e: CalendarDateClickArg) {
    this.addNewRecord(dayjs(e.date));
  }

  protected onEventClick(e: CalendarEventClickArg) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields(),
        data: this.records().find((r) => r.id === e.event.id),
      },
      mode: 'edit',
    });
  }

  protected onChangeDateRange(range?: [Dayjs, Dayjs]) {
    let start: Dayjs;
    let end: Dayjs;

    if (range) {
      start = range[0];
      end = range[1];
    } else {
      const currentDate = this.calendar().getCurrentDate();
      start = dayjs(currentDate).startOf('month');
      end = dayjs(currentDate).endOf('month');
    }

    this.loadTableDataInRange(start, end);
  }

  protected addNewRecord(date?: Dayjs) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields(),
        data: {
          id: undefined,
          [this.selectedStartField]: date,
          [this.selectedEndField]: date,
        },
      },
      mode: 'add',
    });
  }

  private loadTableDataInRange = _.debounce(
    async (start: Dayjs, end: Dayjs) => {
      if (!this.selectedStartField || !this.selectedEndField) {
        return;
      }

      const filter = {};

      if (this.selectedStartField === this.selectedEndField) {
        filter[this.selectedStartField] = {
          gte: start,
          lte: end,
        };
      } else {
        filter[this.selectedStartField] = {
          gte: start,
        };
        filter[this.selectedEndField] = {
          lte: end,
        };
      }

      await this.loadTableData(this.tblService.selectedTable(), filter);
    },
    1000,
    { leading: true },
  );
}
