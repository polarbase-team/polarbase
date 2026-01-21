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
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
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
  onDateClick = output<DateClickArg>();
  onEventClick = output<EventClickArg>();

  protected calendarOptions: CalendarOptions = {
    headerToolbar: false,
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    dateClick: (arg) => this.onDateClick.emit(arg),
    eventClick: (arg) => this.onEventClick.emit(arg),
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
    return this.fullCalendar().getApi()?.getDate();
  }

  reset() {
    this.changeView('dayGridMonth');
    this.today();
  }

  protected changeView(view: string) {
    this.view = view;
    this.fullCalendar().getApi()?.changeView(view);
    this.onChangeView.emit(view);
  }

  protected today() {
    this.fullCalendar().getApi()?.today();
    this.emitCurrentMonthDateRange();
  }

  protected next() {
    this.fullCalendar().getApi()?.next();
    this.emitCurrentMonthDateRange();
  }

  protected prev() {
    this.fullCalendar().getApi()?.prev();
    this.emitCurrentMonthDateRange();
  }

  private emitCurrentMonthDateRange() {
    const currentDate = this.getCurrentDate();
    const startOfMonth = dayjs(currentDate).startOf('month');
    const endOfMonth = dayjs(currentDate).endOf('month');
    this.onChangeDateRange.emit([startOfMonth, endOfMonth]);
  }
}
