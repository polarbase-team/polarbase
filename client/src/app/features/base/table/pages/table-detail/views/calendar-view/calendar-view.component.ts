import { ChangeDetectionStrategy, Component, effect, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs, { Dayjs } from 'dayjs';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';

import { getRecordDisplayLabel } from '@app/core/utils';
import {
  CalendarComponent,
  CalendarDateClickArg,
  CalendarEvent,
  CalendarEventClickArg,
} from '@app/shared/calendar/calendar.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { TableRealtimeMessage } from '@app/features/base/table/services/table-realtime.service';
import { ColumnDefinition } from '../../../../services/table.service';
import { ViewBaseComponent } from '../view-base.component';
import { UpdatedRecordMode } from '../../table-detail.component';

@Component({
  selector: 'calendar-view',
  templateUrl: './calendar-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    PopoverModule,
    SelectModule,
    DividerModule,
    CalendarComponent,
    FilterOptionComponent,
  ],
})
export class CalendarViewComponent extends ViewBaseComponent {
  calendar = viewChild<CalendarComponent>('calendar');

  protected fields: Field[] = [];
  protected records = [];
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

    this.fields = [];
    this.dateColumns = [];
    this.events.set([]);
    this.selectedStartField = undefined;
    this.selectedEndField = undefined;
    this.records = [];

    this.calendar().reset();
  }

  override onRecordSave(
    savedRecord: Record<string, any>,
    mode: UpdatedRecordMode,
    currentRecord?: Record<string, any>,
  ): void {
    if (mode === 'add') {
      this.records.push(savedRecord);
      this.events.update((events) => [
        ...events,
        {
          id: savedRecord['id'],
          title: getRecordDisplayLabel(savedRecord),
          start: savedRecord[this.selectedStartField],
          end: savedRecord[this.selectedEndField],
        },
      ]);
    } else if (mode === 'edit') {
      const index = this.records.findIndex((r) => r.id === currentRecord['id']);
      this.records[index] = savedRecord;
      this.events.update((events) => {
        const event = events.find((e) => e.id === currentRecord['id']);
        event.start = savedRecord[this.selectedStartField];
        event.end = savedRecord[this.selectedEndField];
        return [...events];
      });
    }
  }

  protected override onSchemaLoaded(columnDefs: ColumnDefinition[]) {
    this.fields = columnDefs.map((c) => this.tblService.buildField(c));
    this.dateColumns = columnDefs.filter(
      (c) => c.dataType === DataType.AutoDate || c.dataType === DataType.Date,
    );
  }

  protected override onRecordsLoaded(records: any[]) {
    this.records = records;
    this.events.set(
      records.map((record) => ({
        id: record.id,
        title: getRecordDisplayLabel(record),
        start: record[this.selectedStartField],
        end: record[this.selectedEndField],
      })),
    );
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

  protected override onDataUpdated(message: TableRealtimeMessage) {
    const { action, record } = message;
    switch (action) {
      case 'insert': {
        const index = this.records.findIndex((r) => r.id === record.new['id']);
        if (index !== -1) return;

        this.records.push(record.new);
        this.events.update((events) => [
          ...events,
          {
            id: record.new['id'],
            title: getRecordDisplayLabel(record.new),
            start: record.new[this.selectedStartField],
            end: record.new[this.selectedEndField],
          },
        ]);
        break;
      }
      case 'update': {
        const index = this.records.findIndex((r) => r.id === record.new['id']);
        if (index === -1) return;

        this.records[index] = record.new;
        this.events.update((events) => {
          const event = events.find((e) => e.id === record.new['id']);
          event.start = record.new[this.selectedStartField];
          event.end = record.new[this.selectedEndField];
          return [...events];
        });
        break;
      }
      case 'delete': {
        const index = this.records.findIndex((r) => r.id === record.new['id']);
        if (index === -1) return;

        this.records.splice(index, 1);
        this.events.update((events) => events.filter((e) => e.id !== record.new['id']));
        break;
      }
    }
  }

  protected onDateClick(e: CalendarDateClickArg) {
    this.addNewRecord(dayjs(e.date));
  }

  protected onEventClick(e: CalendarEventClickArg) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields,
        data: this.records.find((r) => r.id === e.event.id),
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
        fields: this.fields,
        data: {
          [this.selectedStartField]: date,
          [this.selectedEndField]: date,
        },
      },
      mode: 'add',
    });
  }

  private loadTableDataInRange(start: Dayjs, end: Dayjs) {
    if (!this.selectedStartField || !this.selectedEndField) {
      return;
    }

    this.loadTableData(this.tblService.selectedTable(), {
      [this.selectedStartField]: start,
      [this.selectedEndField]: end,
    });
  }
}
