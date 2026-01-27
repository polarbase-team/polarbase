import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NumberFormatPipe } from '@app/shared/field-system/pipes/number-format.pipe';
import { NumberData } from '@app/shared/field-system/models/number/field.interface';
import { NumberField } from '@app/shared/field-system/models/number/field.object';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'number-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'number-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent, NumberFormatPipe],
})
export class NumberFieldCellComponent extends FieldCellInputable<NumberData> {
  declare field: NumberField;
}
