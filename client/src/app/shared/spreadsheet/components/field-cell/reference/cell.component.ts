import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { TagModule } from 'primeng/tag';

import { ReferenceData } from '@app/shared/field-system/models/reference/field.interface';
import { ReferenceField } from '@app/shared/field-system/models/reference/field.object';
import { FieldCellTouchable } from '../field-cell-touchable';

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
  imports: [TagModule],
})
export class ReferenceFieldCellComponent extends FieldCellTouchable<ReferenceData> {
  protected visibleReferencePicker = false;

  viewDetail = output<ReferenceViewDetailEvent>();
}
