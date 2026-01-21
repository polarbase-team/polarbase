import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import dayjs, { Dayjs } from 'dayjs';

import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'calendar',
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    FullCalendarModule,
    ButtonModule,
    SelectButtonModule,
    DividerModule,
  ],
})
export class CalendarComponent {
  toolbarTmpl = contentChild<TemplateRef<any>>('toolbar');
  fullCalendar = viewChild<FullCalendarComponent>('fullCalendar');

  events = input<EventInput[]>();

  onChangeView = output<string>();
  onChangeDateRange = output<[Dayjs, Dayjs]>();

  protected calendarOptions: CalendarOptions = {
    headerToolbar: false,
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
  };
  protected view = 'dayGridMonth';
  protected viewOptions = [
    {
      label: 'month',
      value: 'dayGridMonth',
    },
    {
      label: 'week',
      value: 'dayGridWeek',
    },
    {
      label: 'day',
      value: 'dayGridDay',
    },
  ];

  getCurrentDate() {
    return this.fullCalendar().getApi().getDate();
  }

  protected changeView(mode: string) {
    this.fullCalendar().getApi().changeView(mode);
    this.onChangeView.emit(mode);
  }

  protected today() {
    this.fullCalendar().getApi().today();
    this.emitCurrentMonthDateRange();
  }

  protected next() {
    this.fullCalendar().getApi().next();
    this.emitCurrentMonthDateRange();
  }

  protected prev() {
    this.fullCalendar().getApi().prev();
    this.emitCurrentMonthDateRange();
  }

  private emitCurrentMonthDateRange() {
    const currentDate = this.getCurrentDate();
    const startOfMonth = dayjs(currentDate).startOf('month');
    const endOfMonth = dayjs(currentDate).endOf('month');
    this.onChangeDateRange.emit([startOfMonth, endOfMonth]);
  }
}
