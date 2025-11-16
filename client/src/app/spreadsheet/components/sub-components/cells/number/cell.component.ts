import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TNumberData } from '../../../../field/interfaces';
import { NumberField } from '../../../../field/objects';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'number-field-cell',
  templateUrl: './cell.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'number-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class NumberFieldCellComponent extends FieldCellInputable<TNumberData> {
  declare field: NumberField;
}
