import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  FormulaData,
  FormulaResultType,
} from '@app/shared/field-system/models/formula/field.interface';
import { FormulaField } from '@app/shared/field-system/models/formula/field.object';
import { DateFormatPipe } from '@app/shared/field-system/pipes/date-format.pipe';
import { NumberFormatPipe } from '@app/shared/field-system/pipes/number-format.pipe';
import { FieldCell } from '../field-cell';

@Component({
  selector: 'formula-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'formula-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateFormatPipe, NumberFormatPipe],
})
export class FormulaFieldCellComponent extends FieldCell<FormulaData> {
  declare field: FormulaField;

  protected readonly FormulaResultType = FormulaResultType;
}
