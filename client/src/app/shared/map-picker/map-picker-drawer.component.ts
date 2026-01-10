import { Component, output, model, input, ChangeDetectionStrategy, viewChild } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { DrawerComponent } from '@app/core/components/drawer.component';
import { MapPickerComponent, MapLocation } from './map-picker.component';

@Component({
  selector: 'map-picker-drawer',
  templateUrl: './map-picker-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, MapPickerComponent],
})
export class MapPickerDrawerComponent extends DrawerComponent {
  mapPicker = viewChild<MapPickerComponent>('mapPicker');

  loc = model<MapLocation>();
  viewOnly = input(false);

  onSave = output<MapLocation>();
  onCancel = output();

  protected save() {
    this.onSave.emit(this.loc());
    this.close();
  }

  protected cancel() {
    this.onCancel.emit();
    this.close();
  }
}
