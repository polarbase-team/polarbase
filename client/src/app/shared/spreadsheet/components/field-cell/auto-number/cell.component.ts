import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AutoNumberData } from '@app/shared/field-system/models/auto-number/field.interface';
import { AutoNumberField } from '@app/shared/field-system/models/auto-number/field.object';
import { FieldCell } from '../field-cell';

@Component({
  selector: 'auto-number-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'auto-number-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoNumberFieldCellComponent extends FieldCell<AutoNumberData> {
  declare field: AutoNumberField;
}
