import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputNumberModule } from 'primeng/inputnumber';

import { NumberField } from '../../../../../shared/spreadsheet/field/objects/number-field.object';
import { NumberData } from '../../../../../shared/spreadsheet/field/interfaces/number-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'number-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputNumberModule],
})
export class NumberFieldEditorComponent extends FieldEditorComponent<NumberField, NumberData> {}
