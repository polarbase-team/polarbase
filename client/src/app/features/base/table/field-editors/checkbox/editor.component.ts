import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { CheckboxModule } from 'primeng/checkbox';

import { CheckboxField } from '../../../../../shared/spreadsheet/field/objects/checkbox-field.object';
import { CheckboxData } from '../../../../../shared/spreadsheet/field/interfaces/checkbox-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'checkbox-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, CheckboxModule],
})
export class CheckboxFieldEditorComponent extends FieldEditorComponent<
  CheckboxField,
  CheckboxData
> {}
