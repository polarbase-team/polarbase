import { ChangeDetectionStrategy, Component } from '@angular/core';

import { UrlData } from '@app/shared/field-system/models/url/field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'url-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'url-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent],
})
export class UrlFieldCellComponent extends FieldCellInputable<UrlData> {
  override save(data: UrlData) {
    super.save(data || null);
  }
}
