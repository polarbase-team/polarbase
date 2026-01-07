import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IntegerData } from '@app/shared/field-system/models/integer/field.interface';
import { IntegerField } from '@app/shared/field-system/models/integer/field.object';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'integer-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'integer-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class IntegerFieldCellComponent extends FieldCellInputable<IntegerData> {
  declare field: IntegerField;
}
