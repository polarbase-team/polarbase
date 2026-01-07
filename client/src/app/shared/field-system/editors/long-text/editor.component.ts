import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { TextareaModule } from 'primeng/textarea';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { LongTextField } from '@app/shared/field-system/models/long-text/field.object';
import { LongTextData } from '@app/shared/field-system/models/long-text/field.interface';
import { RichTextEditorDrawerComponent } from '@app/shared/rich-text-editor/rich-text-editor-drawer.component';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'long-text-field-editor',
  templateUrl: './editor.component.html',
  imports: [
    FormsModule,
    AutoFocusModule,
    TextareaModule,
    ButtonModule,
    FluidModule,
    MessageModule,
    RichTextEditorDrawerComponent,
  ],
})
export class LongTextFieldEditorComponent extends FieldEditorComponent<
  LongTextField,
  LongTextData
> {
  protected visibleRichTextEditor: boolean;
}
