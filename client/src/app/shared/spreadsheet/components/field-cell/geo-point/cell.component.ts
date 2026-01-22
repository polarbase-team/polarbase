import { ChangeDetectionStrategy, Component, SimpleChanges } from '@angular/core';

import { TooltipModule } from 'primeng/tooltip';

import { MapPickerDrawerComponent } from '@app/shared/open-map/map-picker/map-picker-drawer.component';
import { Location } from '@app/shared/open-map/open-map.component';
import { formatPoint } from '@app/shared/field-system/models/geo-point/field.object';
import { GeoPointData } from '@app/shared/field-system/models/geo-point/field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';
import { CellTouchEvent } from '../field-cell-touchable';

@Component({
  selector: 'geo-point-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'geo-point-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipModule, MapPickerDrawerComponent, InputBoxComponent],
})
export class GeoPointFieldCellComponent extends FieldCellInputable<GeoPointData> {
  protected pointStr: string;
  protected location: Location | null;
  protected visibleMapPicker = false;

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);

    if ('data' in changes) {
      this.pointStr = formatPoint(this.data);
    }
  }

  override save(value: string) {
    super.save(value || null);
    this.pointStr = formatPoint(this.data);
  }

  protected override onInput(e: CellTouchEvent) {
    this.pointStr = formatPoint(this.data);
  }

  protected openMap() {
    let location: Location | null = null;

    if (this.data) {
      const point =
        typeof this.data === 'object'
          ? [this.data.x, this.data.y]
          : this.data.split(',').map((p) => parseFloat(p));
      location = { lng: point[0], lat: point[1] };
    }

    this.location = location;
    this.visibleMapPicker = true;
  }

  protected onLocationSave(location: Location) {
    this.save(`(${location.lng}, ${location.lat})`);
  }
}
