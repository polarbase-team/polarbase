import _ from 'lodash';

import { ChangeDetectionStrategy, Component, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import dayjs, { Dayjs } from 'dayjs';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { FluidModule } from 'primeng/fluid';

import { getRecordDisplayLabel } from '@app/core/utils';
import {
  CalendarComponent,
  CalendarDateClickArg,
  CalendarEvent,
  CalendarEventClickArg,
} from '@app/shared/calendar/calendar.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { FilterGroup } from '@app/shared/field-system/filter/models';
import { FieldIconPipe } from '@app/shared/field-system/pipes/field-icon.pipe';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import { ViewLayoutService } from '../../../../services/view-layout.service';
import { UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

interface CalendarViewConfiguration {
  selectedStartField?: string;
  selectedEndField?: string;
  selectedDisplayField?: string;
  filterQuery?: FilterGroup;
}

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
    SkeletonModule,
    FluidModule,
    CalendarComponent,
    FilterOptionComponent,
    FieldIconPipe,
  ],
  providers: [ViewLayoutService],
})
export class CalendarViewComponent
  extends ViewBaseComponent<CalendarViewConfiguration>
  implements OnInit
{
  calendar = viewChild<CalendarComponent>('calendar');
  filterOption = viewChild<FilterOptionComponent>('filterOption');

  protected dateColumns: ColumnDefinition[] = [];
  protected events = signal<CalendarEvent[]>([]);
  protected selectedStartField: string;
  protected selectedEndField: string;
  protected selectedDisplayField: string;
  protected filterQuery: FilterGroup;

  ngOnInit() {
    const configuration = this.getViewConfiguration();
    this.selectedStartField = configuration.selectedStartField;
    this.selectedEndField = configuration.selectedEndField;
    this.selectedDisplayField = configuration.selectedDisplayField;
    this.filterQuery = configuration.filterQuery;

    this.loadTable();
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
          title: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
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
                title: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
                start: savedRecord[this.selectedStartField],
                end: savedRecord[this.selectedEndField],
              }
            : e,
        ),
      );
    }
  }

  protected override async loadTable() {
    this.saveViewConfiguration();

    if (!this.columns().length) {
      await this.loadTableSchema();
    }

    if (this.selectedStartField && this.selectedEndField) {
      await super.loadTable();
    }
  }

  protected override async loadTableData(start?: Dayjs, end?: Dayjs) {
    if (!this.selectedStartField || !this.selectedEndField) {
      return;
    }

    const currentDate = this.calendar().getCurrentDate();
    if (!start || !end) {
      start = dayjs(currentDate).startOf('month');
      end = dayjs(currentDate).endOf('month');
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

    await super.loadTableData(filter);
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.dateColumns = columns.filter(
      (c) => c.dataType === DataType.AutoDate || c.dataType === DataType.Date,
    );
  }

  protected override onRecordsLoaded(records: RecordData[]) {
    this.filterOption().applyChanges(records);
  }

  protected onRecordsFiltered(records: RecordData[]) {
    this.saveViewConfiguration();
    this.buildEvents(records);
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;

    switch (action) {
      case 'insert':
        this.events.update((events) => {
          if (events.some((e) => e.id === record.new.id)) return events;

          return [
            ...events,
            {
              id: String(record.new.id),
              title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
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
              e.id === record.new.id
                ? {
                    ...e,
                    title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
                    start: record.new[this.selectedStartField],
                    end: record.new[this.selectedEndField],
                  }
                : e,
            ),
          );
        } else {
          this.events.update((events) => events.filter((e) => e.id !== record.new.id));
        }
        break;

      case 'delete':
        this.events.update((events) => events.filter((e) => e.id !== record.key.id));
        break;
    }
  }

  protected override saveViewConfiguration() {
    super.saveViewConfiguration({
      selectedStartField: this.selectedStartField,
      selectedEndField: this.selectedEndField,
      selectedDisplayField: this.selectedDisplayField,
      filterQuery: this.filterQuery,
    });
  }

  protected addNewRecord(date?: Dayjs) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
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

  protected onChangeDateRange = _.debounce(
    ([start, end]: [Dayjs, Dayjs]) => {
      this.loadTableData(start, end);
    },
    500,
    { leading: true },
  );

  protected onDateClick(e: CalendarDateClickArg) {
    this.addNewRecord(dayjs(e.date));
  }

  protected onEventClick(e: CalendarEventClickArg) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: this.records().find((r) => String(r.id) === e.event.id),
      },
      mode: 'edit',
    });
  }

  private buildEvents(records: RecordData[]) {
    if (!this.selectedStartField || !this.selectedEndField) {
      this.events.set([]);
      return;
    }

    this.events.set(
      records.reduce<CalendarEvent[]>((events, record) => {
        const start = record[this.selectedStartField];
        if (!start) return events;

        const end = record[this.selectedEndField];

        events.push({
          id: String(record.id),
          title: getRecordDisplayLabel(record, this.selectedDisplayField),
          start,
          end,
        });

        return events;
      }, []),
    );
  }
}
