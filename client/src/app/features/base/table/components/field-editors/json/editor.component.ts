import _ from 'lodash';

import { Component, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { TextareaModule } from 'primeng/textarea';

import { JSONField } from '@app/shared/spreadsheet/field/objects/json-field.object';
import { JSONData } from '@app/shared/spreadsheet/field/interfaces/json-field.interface';
import { JSONEditorDrawerComponent } from '@app/shared/json-editor/json-editor-drawer.component';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'json-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, TextareaModule, ButtonModule, JSONEditorDrawerComponent],
})
export class JSONFieldEditorComponent extends FieldEditorComponent<JSONField, JSONData> {
  protected visibleJSONEditor: boolean;
  protected jsonText: string;

  constructor() {
    super();

    effect(() => {
      this.jsonText = !_.isNil(this.data) ? JSON.stringify(this.data) : '';
    });
  }

  protected onSave(jsonText: string) {
    this.data.set(jsonText ? JSON.parse(jsonText) : null);
  }
}
