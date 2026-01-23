import {
  Component,
  model,
  input,
  ChangeDetectionStrategy,
  viewChild,
  computed,
} from '@angular/core';

import { OpenMapComponent, Location } from '../open-map.component';

@Component({
  selector: 'map-picker',
  template: `<open-map
    #openMap
    [locations]="locations()"
    (onMapClick)="onMapClick($event)"
    toolbarStyleClass="pt-[16px] px-[20px]"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OpenMapComponent],
})
export class MapPickerComponent {
  openMap = viewChild<OpenMapComponent>('openMap');

  location = model<Location>();
  viewOnly = input(false);

  locations = computed(() => (this.location() ? [this.location()] : []));

  protected onMapClick(location: Location) {
    if (this.viewOnly()) return;
    this.location.set(location);
  }
}
