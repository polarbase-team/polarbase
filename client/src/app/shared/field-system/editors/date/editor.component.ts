import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs from 'dayjs';

import { AutoFocusModule } from 'primeng/autofocus';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { DateField } from '../../models/date/field.object';
import { DateData } from '../../models/date/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'date-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, DatePickerModule, FluidModule, MessageModule],
})
export class DateFieldEditorComponent extends FieldEditorComponent<DateField, DateData> {
  protected date = computed(() => (this.data() ? new Date(this.data()) : undefined));

  protected onDateChange(event: Date) {
    this.data.set(dayjs(event).toISOString());
  }
}
