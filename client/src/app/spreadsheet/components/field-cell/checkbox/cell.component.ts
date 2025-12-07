import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

import { CheckboxData } from '../../../field/interfaces/checkbox-field.interface';
import { FieldCellEditable } from '../field-cell-editable';
import { CellTouchEvent } from '../field-cell-touchable';

@Component({
  selector: 'checkbox-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', './cell.component.scss'],
  host: { class: 'checkbox-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CheckboxModule],
})
export class CheckboxFieldCellComponent extends FieldCellEditable<CheckboxData> {
  protected override onTouch(e: CellTouchEvent) {
    if ('touches' in e) return;
    if (this.readonly) return;
    this.save(!this.data);
  }
}
