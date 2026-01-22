import {
  Component,
  ElementRef,
  AfterViewInit,
  viewChild,
  input,
  ChangeDetectionStrategy,
  effect,
  OnDestroy,
  output,
  contentChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

import { InputGroupModule } from 'primeng/inputgroup';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

import { environment } from '@environments/environment';

export interface Location {
  id?: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'open-map',
  templateUrl: './open-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InputGroupModule, IconFieldModule, InputIconModule, InputTextModule],
})
export class OpenMapComponent implements AfterViewInit, OnDestroy {
  toolbarTmpl = contentChild<TemplateRef<any>>('toolbar');
  container = viewChild<ElementRef<HTMLDivElement>>('container');

  locations = input<Location[]>();
  toolbarStyleClass = input<string>();
  contentStyleClass = input<string>();

  onMapClick = output<Location>();

  private map!: L.Map;
  private markers!: L.Marker[];

  constructor() {
    effect(() => {
      this.initMarkers(this.locations());
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  refresh() {
    this.map?.invalidateSize();
  }

  private initMap() {
    this.map = L.map(this.container().nativeElement).setView(
      environment ? [environment.defaultLocation[0], environment.defaultLocation[1]] : [0, 0],
      13,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    this.initMarkers(this.locations());
  }

  private initMarkers(locations: Location[]) {
    if (!this.map) return;

    if (this.markers?.length > 0) {
      for (const marker of this.markers) {
        marker.remove();
      }
    }

    if (locations?.length) {
      const markers: L.Marker[] = [];
      for (const location of locations) {
        const marker = L.marker([location.lat, location.lng]);
        markers.push(marker);
        this.map.addLayer(marker);
      }
      this.markers = markers;

      this.map.setView([locations[0].lat, locations[0].lng], 13);
    }
  }
}
