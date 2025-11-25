import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import dayjs from 'dayjs';

import { DateData } from '../../../field/interfaces';
import { DateField } from '../../../field/objects';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'date-field-cell',
  templateUrl: './cell.html',
  styleUrls: ['../field-cell.scss', './cell.scss'],
  host: { class: 'date-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePicker, DatePipe],
})
export class DateFieldCellComponent extends FieldCellEditable<DateData> {
  declare field: DateField;

  @ViewChild('calendar') calendar: DatePicker;

  protected override onTouch(_e: CellTouchEvent): void {
    this.calendar.toggle();
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
