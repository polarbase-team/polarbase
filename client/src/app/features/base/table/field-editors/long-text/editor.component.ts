import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { TextareaModule } from 'primeng/textarea';

import { LongTextField } from '../../../../../shared/spreadsheet/field/objects/long-text-field.object';
import { LongTextData } from '../../../../../shared/spreadsheet/field/interfaces/long-text-field.interface';
import { RichTextEditorDrawerComponent } from '../../../../../shared/rich-text-editor/rich-text-editor-drawer.component';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'long-text-field-editor',
  templateUrl: './editor.component.html',
  imports: [
    FormsModule,
    AutoFocusModule,
    TextareaModule,
    ButtonModule,
    RichTextEditorDrawerComponent,
  ],
})
export class LongTextFieldEditorComponent extends FieldEditorComponent<
  LongTextField,
  LongTextData
> {
  protected visibleRichTextEditor: boolean;
}
