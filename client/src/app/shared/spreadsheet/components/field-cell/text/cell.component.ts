import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TextData } from '../../../field/interfaces/text-field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'text-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'text-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class TextFieldCellComponent extends FieldCellInputable<TextData> {}
