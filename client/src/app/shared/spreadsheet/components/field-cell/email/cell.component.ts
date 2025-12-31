import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EmailData } from '../../../field/interfaces/email-field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'email-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'email-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class EmailFieldCellComponent extends FieldCellInputable<EmailData> {
  override save(data: EmailData) {
    super.save(data || null);
  }
}
