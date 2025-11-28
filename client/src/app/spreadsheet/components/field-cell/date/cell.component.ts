import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Overlay } from 'primeng/overlay';
import { DatePicker } from 'primeng/datepicker';
import dayjs from 'dayjs';

import { DateData } from '../../../field/interfaces/date-field.interface';
import { DateField } from '../../../field/objects/date-field.object';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'date-field-cell',
  templateUrl: './cell.html',
  styleUrls: ['../field-cell.scss'],
  host: { class: 'date-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Overlay, DatePicker, DatePipe],
})
export class DateFieldCellComponent extends FieldCellEditable<DateData> {
  declare field: DateField;

  @ViewChild('calendar') calendar: Overlay;

  protected calendarVisible: boolean;

  protected override onTouch(e: CellTouchEvent) {
    this.calendarVisible = true;
  }

  protected onDatePicked(date) {
    this.data = dayjs(date).toISOString();
    this.save();
  }

  protected onMenuOpened() {
    this.markAsEditStarted();
  }

  protected onMenuClosed() {
    this.markAsEditEnded();
  }
}
