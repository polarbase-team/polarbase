import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Gantt from 'frappe-gantt';

import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';

export const GanttView = {
  MONTH: 'Month',
  WEEK: 'Week',
  DAY: 'Day',
} as const;
export type GanttView = (typeof GanttView)[keyof typeof GanttView];

export interface GanttTask extends Gantt.Task {}

export interface GanttDateChangeEvent {
  task: GanttTask;
  start: Date;
  end: Date;
}

export interface GanttProgressChangeEvent {
  task: GanttTask;
  progress: number;
}

@Component({
  selector: 'gantt',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule, DividerModule],
})
export class GanttComponent implements AfterViewInit, OnDestroy {
  containerEl = viewChild<ElementRef>('container');

  toolbarTmpl = contentChild<TemplateRef<any>>('toolbar');
  leftToolbarTmpl = contentChild<TemplateRef<any>>('leftToolbar');
  rightToolbarTmpl = contentChild<TemplateRef<any>>('rightToolbar');

  tasks = input<GanttTask[]>();
  toolbarStyleClass = input<string>();
  contentStyleClass = input<string>();

  onChangeView = output<GanttView>();
  onTaskDateChange = output<GanttDateChangeEvent>();
  onTaskProgressChange = output<GanttProgressChangeEvent>();
  onTaskClick = output<GanttTask>();

  protected gantt: Gantt | null = null;
  protected view: GanttView = GanttView.DAY;
  protected viewOptions = [
    {
      label: 'month',
      value: GanttView.MONTH,
    },
    {
      label: 'week',
      value: GanttView.WEEK,
    },
    {
      label: 'day',
      value: GanttView.DAY,
    },
  ];

  private preventClick = false;

  constructor(private el: ElementRef) {
    effect(() => {
      const tasks = this.tasks();
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(tasks);
        }, 500);
      }).then((tasks) => {
        if (!this.gantt) return;
        this.gantt.setup_tasks(tasks as GanttTask[]);
        this.gantt.change_view_mode(this.view, true);
      });
    });
  }

  ngAfterViewInit() {
    this.gantt = new Gantt('#gantt', this.tasks(), {
      container_height: this.containerEl()?.nativeElement.clientHeight,
      popup_on: 'hover',
      on_date_change: (task: GanttTask, start: Date, end: Date) => {
        this.preventClick = true;
        this.onTaskDateChange.emit({ task, start, end });
      },
      on_progress_change: (task: GanttTask, progress: number) => {
        this.preventClick = true;
        this.onTaskProgressChange.emit({ task, progress });
      },
      on_click: (task: GanttTask) => {
        if (this.preventClick) {
          this.preventClick = false;
          return;
        }
        this.onTaskClick.emit(task);
      },
    });
  }

  ngOnDestroy() {
    this.gantt?.clear();
  }

  reset() {
    this.today();
  }

  protected changeView(view: GanttView) {
    this.view = view;
    this.gantt?.change_view_mode(view);
  }

  protected today() {
    (this.gantt as any)?.scroll_current();
  }
}
