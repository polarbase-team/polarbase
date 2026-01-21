import { ChangeDetectionStrategy, Component, effect, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventInput } from '@fullcalendar/core';
import dayjs, { Dayjs } from 'dayjs';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';

import { getRecordDisplayLabel } from '@app/core/utils';
import { CalendarComponent } from '@app/shared/calendar/calendar.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { ColumnDefinition } from '../../../../services/table.service';
import { ViewBaseComponent } from '../view-base.component';

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
  ],
})
export class CalendarViewComponent extends ViewBaseComponent {
  calendar = viewChild<CalendarComponent>('calendar');

  protected fields: Field[] = [];
  protected dateColumns: ColumnDefinition[] = [];
  protected selectedStartField: string;
  protected selectedEndField: string;
  protected records = [];
  protected events = signal<EventInput[]>([]);

  constructor() {
    super();

    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.loadTableSchema(selectedTable);
    });
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

  protected onDateClick(e) {
    this.addNewRecord(e.date);
  }

  protected onEventClick(e) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields,
        data: this.records.find((r) => r.id === e.event.id),
      },
      mode: 'edit',
    });
  }

  protected onChangeDateRange([start, end]: [Dayjs, Dayjs]) {
    this.loadTableDataInRange(start, end);
  }

  protected applyChanges() {
    const currentDate = this.calendar().getCurrentDate();
    const startOfMonth = dayjs(currentDate).startOf('month');
    const endOfMonth = dayjs(currentDate).endOf('month');
    this.loadTableDataInRange(startOfMonth, endOfMonth);
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
