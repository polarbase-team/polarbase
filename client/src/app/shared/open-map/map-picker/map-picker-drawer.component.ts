import { Component, output, model, input, ChangeDetectionStrategy, viewChild } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { DrawerComponent } from '@app/core/components/drawer.component';
import { Location } from '../open-map.component';
import { MapPickerComponent } from './map-picker.component';

@Component({
  selector: 'map-picker-drawer',
  templateUrl: './map-picker-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, ConfirmDialogModule, MapPickerComponent],
  providers: [ConfirmationService],
})
export class MapPickerDrawerComponent extends DrawerComponent {
  mapPicker = viewChild<MapPickerComponent>('mapPicker');

  location = model<Location>();
  viewOnly = input(false);

  onSave = output<Location>();
  onCancel = output();

  protected isLocationChanged = false;

  constructor(private confirmationService: ConfirmationService) {
    super();
  }

  protected override onHide() {
    super.onHide();

    if (this.isLocationChanged) {
      this.confirmationService.confirm({
        target: null,
        header: 'Discard changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        rejectButtonProps: {
          label: 'Cancel',
          severity: 'secondary',
          outlined: true,
        },
        acceptButtonProps: {
          label: 'Discard',
          severity: 'primary',
        },
        accept: () => {
          this.close();
          this.isLocationChanged = false;
        },
      });
      return;
    }

    this.close();
    this.isLocationChanged = false;
  }

  protected save() {
    this.onSave.emit(this.location());
    this.close();
  }

  protected cancel() {
    this.onCancel.emit();
    this.close();
  }
}
