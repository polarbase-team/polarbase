import { Component, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { MultiSelectModule } from 'primeng/multiselect';
import { FluidModule } from 'primeng/fluid';

import { MultiSelectField } from '@app/shared/spreadsheet/field/objects/multi-select-field.object';
import { MultiSelectData } from '@app/shared/spreadsheet/field/interfaces/multi-select-field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'multi-select-field-editor',
  templateUrl: './editor.component.html',
  imports: [FormsModule, AutoFocusModule, MultiSelectModule, FluidModule],
})
export class MultiSelectFieldEditorComponent extends FieldEditorComponent<
  MultiSelectField,
  MultiSelectData
> {
  protected parsedData: MultiSelectData = [];

  constructor() {
    super();

    effect(() => {
      const data = this.data();
      if (data?.length > 0) {
        if (typeof data === 'string') {
          const str = (data as string).replace(/\{|\}/g, '').trim();
          if (str.length > 0) this.parsedData = str.split(',');
        } else {
          this.parsedData = [...data];
        }
      }
    });
  }

  protected onDataChanges(data: MultiSelectData) {
    this.data.set([...data]);
  }
}
