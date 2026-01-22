import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputNumberModule } from 'primeng/inputnumber';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { IntegerField } from '../../models/integer/field.object';
import { IntegerData } from '../../models/integer/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'integer-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, InputNumberModule, FluidModule, MessageModule],
})
export class IntegerFieldEditorComponent extends FieldEditorComponent<IntegerField, IntegerData> {}
