import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { convertToHtmlPattern } from '@app/core/utils';
import { EmailField } from '@app/shared/field-system/models/email/field.object';
import { EmailData, EmailPattern } from '@app/shared/field-system/models/email/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'email-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputTextModule, FluidModule, MessageModule],
})
export class EmailFieldEditorComponent extends FieldEditorComponent<EmailField, EmailData> {
  protected readonly emailPattern = convertToHtmlPattern(EmailPattern);
}
