import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { DateField } from '@app/shared/field-system/models/date/field.object';
import { DateData } from '@app/shared/field-system/models/date/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'date-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, DatePickerModule, FluidModule, MessageModule],
})
export class DateFieldEditorComponent extends FieldEditorComponent<DateField, DateData> {}
