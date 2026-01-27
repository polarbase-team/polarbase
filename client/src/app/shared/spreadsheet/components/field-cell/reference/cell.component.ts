import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  output,
  SimpleChanges,
} from '@angular/core';

import { TagModule } from 'primeng/tag';

import { ReferenceData } from '@app/shared/field-system/models/reference/field.interface';
import {
  parseReferenceData,
  ReferenceField,
} from '@app/shared/field-system/models/reference/field.object';
import {
  ReferencePickedEvent,
  ReferencePickerDrawerComponent,
} from '@app/shared/field-system/editors/reference/picker/picker-drawer.component';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

export interface ReferenceViewDetailEvent {
  field: ReferenceField;
  data: ReferenceData;
}

@Component({
  selector: 'reference-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'reference-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, InputBoxComponent, forwardRef(() => ReferencePickerDrawerComponent)],
})
export class ReferenceFieldCellComponent extends FieldCellInputable<ReferenceData> {
  protected value: string | number;
  protected displayLabel: string;
  protected visibleReferencePicker = false;

  viewDetail = output<ReferenceViewDetailEvent>();

  override ngOnChanges(changes: SimpleChanges) {
    if ('data' in changes && this.data !== this.value) {
      const { value, displayLabel } = parseReferenceData(
        this.data,
        this.field.params.presentation?.format?.displayColumn,
      );
      this.value = value;
      this.displayLabel = displayLabel;
    }
  }

  protected onPick(e: ReferencePickedEvent) {
    const { value, displayLabel, data } = e || {};
    this.data = data;
    this.value = value;
    this.displayLabel = displayLabel;
    this.save(value);
  }
}
