import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputNumberModule } from 'primeng/inputnumber';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { NumberFormat } from '../../pipes/number-format.pipe';
import { NumberField } from '../../models/number/field.object';
import { NumberData } from '../../models/number/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'number-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoFocusModule, InputNumberModule, FluidModule, MessageModule],
})
export class NumberFieldEditorComponent extends FieldEditorComponent<NumberField, NumberData> {
  protected readonly NumberFormat = NumberFormat;
}
