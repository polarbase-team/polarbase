import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GeoPointData } from '../../../field/interfaces/geo-point-field.interface';
import { PointValuePipe } from '../../../pipes/point-value.pipe';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';
import { CellTouchEvent } from '../field-cell-touchable';

@Component({
  selector: 'geo-point-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'geo-point-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent, PointValuePipe],
})
export class GeoPointFieldCellComponent extends FieldCellInputable<GeoPointData> {
  protected pointStr: string;

  override save(data: GeoPointData) {
    super.save(data ? `(${data})` : null);
  }

  protected override onInput(e: CellTouchEvent) {
    this.pointStr = new PointValuePipe().transform(this.data);
  }
}
