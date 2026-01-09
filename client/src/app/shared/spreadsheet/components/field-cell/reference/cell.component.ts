import { ChangeDetectionStrategy, Component, forwardRef, output } from '@angular/core';

import { TagModule } from 'primeng/tag';

import { ReferenceData } from '@app/shared/field-system/models/reference/field.interface';
import { ReferenceField } from '@app/shared/field-system/models/reference/field.object';
import { ReferencePickerDrawerComponent } from '@app/shared/field-system/editors/reference/picker/picker-drawer.component';
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
  protected visibleReferencePicker = false;

  viewDetail = output<ReferenceViewDetailEvent>();

  protected override onTouch(e: CellTouchEvent): void {
    this.visibleReferencePicker = true;
  }
}
