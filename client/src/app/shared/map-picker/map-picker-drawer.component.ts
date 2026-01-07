import { Component, output, model, input, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { MapPickerComponent, MapLocation } from './map-picker.component';

@Component({
  selector: 'map-picker-drawer',
  templateUrl: './map-picker-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, MapPickerComponent],
})
export class MapPickerDrawerComponent {
  mapPicker = viewChild<MapPickerComponent>('mapPicker');

  loc = model<MapLocation>();
  visible = model(false);
  viewOnly = input(false);

  onSave = output<MapLocation>();
  onCancel = output();
  onOpen = output();
  onClose = output();

  protected onShow() {
    this.onOpen.emit();
  }

  protected onHide() {
    this.onClose.emit();
  }

  protected save() {
    this.visible.set(false);
    this.onSave.emit(this.loc());
  }

  protected cancel() {
    this.visible.set(false);
    this.onCancel.emit();
  }
}
