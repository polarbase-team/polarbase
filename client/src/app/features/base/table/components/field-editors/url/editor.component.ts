import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { convertToHtmlPattern } from '@app/core/utils';
import { UrlField } from '@app/shared/spreadsheet/field/objects/url-field.object';
import { UrlData, UrlPattern } from '@app/shared/spreadsheet/field/interfaces/url-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'url-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, InputTextModule, FluidModule, MessageModule],
})
export class UrlFieldEditorComponent extends FieldEditorComponent<UrlField, UrlData> {
  protected readonly urlPattern = convertToHtmlPattern(UrlPattern);
}
