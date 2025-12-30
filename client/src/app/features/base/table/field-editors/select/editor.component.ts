import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';

import { SelectField } from '../../../../../shared/spreadsheet/field/objects/select-field.object';
import { SelectData } from '../../../../../shared/spreadsheet/field/interfaces/select-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'select-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, SelectModule, FluidModule],
})
export class SelectFieldEditorComponent extends FieldEditorComponent<SelectField, SelectData> {}
