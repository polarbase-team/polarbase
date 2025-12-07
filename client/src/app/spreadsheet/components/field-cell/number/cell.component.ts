import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NumberData } from '../../../field/interfaces/number-field.interface';
import { NumberField } from '../../../field/objects/number-field.object';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'number-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'number-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class NumberFieldCellComponent extends FieldCellInputable<NumberData> {
  declare field: NumberField;
}
