import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TooltipModule } from 'primeng/tooltip';

import { MapPickerDrawerComponent } from '@app/shared/map-picker/map-picker-drawer.component';
import { MapLocation } from '@app/shared/map-picker/map-picker.component';
import { formatPoint } from '@app/shared/field-system/models/geo-point/field.object';
import { GeoPointData } from '@app/shared/field-system/models/geo-point/field.interface';
import { PointFormatPipe } from '@app/shared/field-system/pipes/point-format.pipe';
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

  protected override onInput(e: CellTouchEvent) {
    this.pointStr = formatPoint(this.data);
  }

  protected openMap() {
    let loc: MapLocation | null = null;

    if (this.data) {
      const data = this.data;
      loc = { lat: this.data.x, lng: this.data.y };
    }

    this.loc = loc;
    this.visibleMapPicker = true;
  }

  protected onSaveNewLocation(loc: MapLocation) {
    this.save({ x: loc.lat, y: loc.lng });
  }
}
