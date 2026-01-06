import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { TextField } from '@app/shared/spreadsheet/field/objects/text-field.object';
import { TextData } from '@app/shared/spreadsheet/field/interfaces/text-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'text-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputTextModule, FluidModule, MessageModule],
})
export class TextFieldEditorComponent extends FieldEditorComponent<TextField, TextData> {}
