import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { SelectField } from '@app/shared/field-system/models/select/field.object';
import { SelectData } from '@app/shared/field-system/models/select/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'select-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, SelectModule, FluidModule, MessageModule],
})
export class SelectFieldEditorComponent extends FieldEditorComponent<SelectField, SelectData> {}
