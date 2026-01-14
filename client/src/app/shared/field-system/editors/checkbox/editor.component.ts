import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

import { CheckboxField } from '@app/shared/field-system/models/checkbox/field.object';
import { CheckboxData } from '@app/shared/field-system/models/checkbox/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'checkbox-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, CheckboxModule, MessageModule],
})
export class CheckboxFieldEditorComponent extends FieldEditorComponent<
  CheckboxField,
  CheckboxData
> {}
