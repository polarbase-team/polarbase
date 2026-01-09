import { Component, forwardRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { ReferenceField } from '@app/shared/field-system/models/reference/field.object';
import { ReferenceData } from '@app/shared/field-system/models/reference/field.interface';
import { FieldEditorComponent } from '../editor.component';
import { ReferencePickerDrawerComponent } from './picker/picker-drawer.component';

@Component({
  selector: 'reference-field-editor',
  templateUrl: './editor.component.html',
  imports: [
    FormsModule,
    AutoFocusModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FluidModule,
    MessageModule,
    forwardRef(() => ReferencePickerDrawerComponent),
  ],
})
export class ReferenceFieldEditorComponent extends FieldEditorComponent<
  ReferenceField,
  ReferenceData
> {
  protected visibleReferencePicker: boolean;
}
