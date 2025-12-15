import { Component } from '@angular/core';

import { IntegerData } from '../../../field/interfaces/integer-field.interface';
import { IntegerField } from '../../../field/objects/integer-field.object';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'integer-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'integer-field-cell' },
  imports: [InputBoxComponent],
})
export class IntegerFieldCellComponent extends FieldCellInputable<IntegerData> {
  declare field: IntegerField;
}
