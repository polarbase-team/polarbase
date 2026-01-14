import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DateFormatPipe } from '@app/shared/field-system/pipes/date-format.pipe';
import { AutoDateData } from '@app/shared/field-system/models/auto-date/field.interface';
import { AutoDateField } from '@app/shared/field-system/models/auto-date/field.object';
import { FieldCell } from '../field-cell';

@Component({
  selector: 'auto-date-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'date-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateFormatPipe],
})
export class AutoDateFieldCellComponent extends FieldCell<AutoDateData> {
  declare field: AutoDateField;
}
