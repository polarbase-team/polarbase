import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TooltipModule } from 'primeng/tooltip';

import { MapPickerDrawerComponent } from '@app/shared/open-map/map-picker/map-picker-drawer.component';
import { Location } from '@app/shared/open-map/open-map.component';
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
  protected location: Location | null;
  protected visibleMapPicker = false;

  protected override onInput(e: CellTouchEvent) {
    this.pointStr = formatPoint(this.data);
  }

  protected openMap() {
    let location: Location | null = null;

    if (this.data) {
      location = { lng: this.data.x, lat: this.data.y };
    }

    this.location = location;
    this.visibleMapPicker = true;
  }

  protected onSaveNewLocation(location: Location) {
    this.save({ x: location.lng, y: location.lat });
  }
}
