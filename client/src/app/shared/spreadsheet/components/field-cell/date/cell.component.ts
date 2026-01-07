import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayModule } from 'primeng/overlay';
import { DatePickerModule } from 'primeng/datepicker';
import dayjs from 'dayjs';

import { DateValuePipe } from '../../../pipes/date-value.pipe';
import { DateData } from '@app/shared/field-system/models/date/field.interface';
import { DateField } from '@app/shared/field-system/models/date/field.object';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';

@Component({
  selector: 'date-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'date-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, OverlayModule, DatePickerModule, DateValuePipe],
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

  protected onMenuOpen() {
    this.markAsEditStarted();
  }

  protected onMenuClose() {
    this.markAsEditEnded();
  }
}
