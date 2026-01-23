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

export const CalendarView = {
  MONTH: 'dayGridMonth',
  WEEK: 'dayGridWeek',
  DAY: 'dayGridDay',
} as const;
export type CalendarView = (typeof CalendarView)[keyof typeof CalendarView];

export interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  end: string;
}

export interface CalendarDateClickArg extends DateClickArg {}

export interface CalendarEventClickArg extends EventClickArg {}

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

  events = input<CalendarEvent[]>();
  toolbarStyleClass = input<string>();
  contentStyleClass = input<string>();

  onChangeView = output<string>();
  onChangeDateRange = output<[Dayjs, Dayjs]>();
  onDateClick = output<CalendarDateClickArg>();
  onEventClick = output<CalendarEventClickArg>();

  protected readonly CV = CalendarView;
  protected calendarOptions: CalendarOptions = {
    headerToolbar: false,
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: CalendarView.MONTH,
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short',
    },
    height: '100%',
    dateClick: (arg) => this.onDateClick.emit(arg),
    eventClick: (arg) => this.onEventClick.emit(arg),
  };
  protected view: CalendarView = CalendarView.MONTH;
  protected viewOptions = [
    {
      label: 'month',
      value: CalendarView.MONTH,
    },
    {
      label: 'week',
      value: CalendarView.WEEK,
    },
    {
      label: 'day',
      value: CalendarView.DAY,
    },
  ];

  getCurrentDate() {
    return this.fullCalendar().getApi()?.getDate();
  }

  reset() {
    this.changeView(CalendarView.MONTH);
    this.today();
  }

  protected changeView(view: CalendarView) {
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
