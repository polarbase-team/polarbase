import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';

import { DateField } from '../../../../../shared/spreadsheet/field/objects/date-field.object';
import { DateData } from '../../../../../shared/spreadsheet/field/interfaces/date-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'date-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, DatePickerModule, FluidModule],
})
export class DateFieldEditorComponent extends FieldEditorComponent<DateField, DateData> {}
