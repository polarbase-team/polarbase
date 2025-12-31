import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputNumberModule } from 'primeng/inputnumber';
import { FluidModule } from 'primeng/fluid';

import { IntegerField } from '@app/shared/spreadsheet/field/objects/integer-field.object';
import { IntegerData } from '@app/shared/spreadsheet/field/interfaces/integer-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'integer-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputNumberModule, FluidModule],
})
export class IntegerFieldEditorComponent extends FieldEditorComponent<IntegerField, IntegerData> {}
