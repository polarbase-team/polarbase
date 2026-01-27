import { ChangeDetectionStrategy, Component, effect, forwardRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { parseReferenceData, ReferenceField } from '../../models/reference/field.object';
import { ReferenceData } from '../../models/reference/field.interface';
import { FieldEditorComponent } from '../editor.component';
import {
  ReferencePickedEvent,
  ReferencePickerDrawerComponent,
} from './picker/picker-drawer.component';

@Component({
  selector: 'reference-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  protected value: string | number;
  protected displayLabel: string;
  protected visibleReferencePicker: boolean;
  protected isFocused: boolean;

  constructor() {
    super();

    effect(() => {
      const { value, displayLabel } = parseReferenceData(
        this.data(),
        this.field().params.presentation?.format?.displayColumn,
      );
      this.value = value;
      this.displayLabel = displayLabel;
    });
  }

  protected onInputValue(value: string | number) {
    this.data.set(value);
    this.value = this.displayLabel = value as string;
  }

  protected onPick(e: ReferencePickedEvent) {
    const { value, displayLabel, data } = e || {};
    this.data.set(data);
    this.value = value;
    this.displayLabel = displayLabel;
  }
}
