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
import { FieldCellEditable } from '../field-cell-editable';
import { CellTouchEvent } from '../field-cell-touchable';

export interface ReferenceViewDetailEvent {
  field: ReferenceField;
  data: ReferenceData;
}

@Component({
  selector: 'reference-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'reference-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, forwardRef(() => ReferencePickerDrawerComponent)],
})
export class ReferenceFieldCellComponent extends FieldCellEditable<ReferenceData> {
  protected value: string | number;
  protected displayLabel: string;
  protected visibleReferencePicker = false;

  viewDetail = output<ReferenceViewDetailEvent>();

  override ngOnChanges(changes: SimpleChanges) {
    if ('data' in changes && this.data !== this.value) {
      const { value, displayLabel } = parseReferenceData(this.data);
      this.value = value;
      this.displayLabel = displayLabel;
    }
  }

  protected override onTouch(e: CellTouchEvent) {
    this.visibleReferencePicker = true;
  }

  protected onPick(e: ReferencePickedEvent) {
    const { value, displayLabel, data } = e || {};
    this.data = data;
    this.value = value;
    this.displayLabel = displayLabel;
    this.save(value);
  }
}
