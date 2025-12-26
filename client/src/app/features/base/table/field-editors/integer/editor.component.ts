import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputNumberModule } from 'primeng/inputnumber';

import { IntegerField } from '../../../../../shared/spreadsheet/field/objects/integer-field.object';
import { IntegerData } from '../../../../../shared/spreadsheet/field/interfaces/integer-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'integer-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputNumberModule],
})
export class IntegerFieldEditorComponent extends FieldEditorComponent<IntegerField, IntegerData> {}
