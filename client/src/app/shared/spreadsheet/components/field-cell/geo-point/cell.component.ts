import _ from 'lodash';

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TooltipModule } from 'primeng/tooltip';

import { MapPickerDrawerComponent } from '@app/shared/map-picker/map-picker-drawer.component';
import { MapLocation } from '@app/shared/map-picker/map-picker.component';
import { formatPoint } from '@app/shared/spreadsheet/field/objects/geo-point-field.object';
import { GeoPoint, GeoPointData } from '../../../field/interfaces/geo-point-field.interface';
import { PointFormatPipe } from '../../../pipes/point-format.pipe';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';
import { CellTouchEvent } from '../field-cell-touchable';

@Component({
  selector: 'geo-point-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'geo-point-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipModule, MapPickerDrawerComponent, InputBoxComponent, PointFormatPipe],
})
export class GeoPointFieldCellComponent extends FieldCellInputable<GeoPointData> {
  protected pointStr: string;
  protected loc: MapLocation | null;
  protected visibleMapPicker = false;

  override save(data: GeoPointData) {
    super.save(data ? `(${data})` : null);
  }

  protected override onInput(e: CellTouchEvent) {
    this.pointStr = formatPoint(this.data);
  }

  protected openMap() {
    let loc: MapLocation | null = null;

    if (this.data) {
      if (_.isString(this.data)) {
        const data = formatPoint(this.data);
        loc = { lat: Number(data[0]), lng: Number(data[1]) };
      } else {
        const data = this.data as GeoPoint;
        loc = { lat: data.x, lng: data.y };
      }
    }

    this.loc = loc;
    this.visibleMapPicker = true;
  }

  protected onSaveNewLocation(loc: MapLocation) {
    this.save(`${loc.lat}, ${loc.lng}`);
  }
}
