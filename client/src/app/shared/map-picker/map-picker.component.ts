import {
  Component,
  ElementRef,
  AfterViewInit,
  viewChild,
  model,
  input,
  ChangeDetectionStrategy,
  effect,
  OnDestroy,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapLocation {
  lat: number;
  lng: number;
}

@Component({
  selector: 'map-picker',
  template: `<div #map style="height: 100%; width: 100%;"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  mapEl = viewChild<ElementRef<HTMLDivElement>>('map');

  loc = model<MapLocation>();
  viewOnly = input(false);

  private map!: L.Map;
  private marker!: L.Marker;

  constructor() {
    effect(() => {
      const loc = this.loc();
      this.updateView(loc);
      this.updateMarker(loc);
    });
  }

  ngAfterViewInit() {
    this.initMap();

    const loc = this.loc();
    this.updateView(loc);
    this.addMarker(loc);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  refresh() {
    this.map?.invalidateSize();
  }

  updateView(loc: MapLocation, zoom = 13) {
    if (!loc) return;
    this.map?.setView([loc.lat, loc.lng], zoom);
  }

  addMarker(loc: MapLocation) {
    if (!loc) return;
    if (this.map) {
      this.marker = L.marker([loc.lat, loc.lng]).addTo(this.map);
    }
  }

  updateMarker(loc: MapLocation) {
    if (!loc) return;
    this.marker ? this.marker.setLatLng(loc) : this.addMarker(loc);
  }

  private initMap() {
    this.map = L.map(this.mapEl().nativeElement);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.viewOnly()) {
        const newLoc = { lat: e.latlng.lat, lng: e.latlng.lng };
        this.loc.set(newLoc);
      }
    });
  }
}
