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
  DestroyRef,
  signal,
  model,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';

import { InputGroupModule } from 'primeng/inputgroup';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { environment } from '@environments/environment';

export interface Location {
  id?: string | number;
  title?: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'open-map',
  templateUrl: './open-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    InputGroupModule,
    IconFieldModule,
    InputIconModule,
    AutoCompleteModule,
    ButtonModule,
    TooltipModule,
  ],
})
export class OpenMapComponent implements AfterViewInit, OnDestroy {
  toolbarTmpl = contentChild<TemplateRef<any>>('toolbar');
  leftToolbarTmpl = contentChild<TemplateRef<any>>('leftToolbar');
  rightToolbarTmpl = contentChild<TemplateRef<any>>('rightToolbar');
  container = viewChild<ElementRef<HTMLDivElement>>('container');

  locations = input<Location[]>();
  zoom = model(13);
  toolbarStyleClass = input<string>();
  contentStyleClass = input<string>();

  onMapClick = output<Location>();
  onMarkerClick = output<Location>();

  protected suggestions = signal<any[]>([]);

  private map!: L.Map;
  private markers!: L.Marker[];

  constructor(
    private http: HttpClient,
    private destroyRef: DestroyRef,
  ) {
    L.Icon.Default.imagePath = 'media/';

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

  protected getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.map.flyTo([lat, lng], this.zoom() ?? 13);
      });
    }
  }

  protected searchAddress(event: AutoCompleteCompleteEvent) {
    const query = event.query;
    const email = environment.openStreetMap.email;
    const url = `${environment.openStreetMap.nominatimUrl}?format=json&q=${query}&limit=5&email=${email}`;

    this.http
      .get<any[]>(url)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.suggestions.set(data);
      });
  }

  protected onSelectAddress(event: AutoCompleteSelectEvent) {
    const { lat, lon } = event.value;
    const targetLatLng = new L.LatLng(lat, lon);

    this.map.flyTo(targetLatLng, 16);

    L.marker(targetLatLng).addTo(this.map).bindPopup(event.value.display_name).openPopup();
  }

  private initMap() {
    this.map = L.map(this.container().nativeElement).setView(
      environment.openStreetMap.defaultLocation
        ? [
            environment.openStreetMap.defaultLocation[0],
            environment.openStreetMap.defaultLocation[1],
          ]
        : [0, 0],
      this.zoom() ?? 13,
    );
    L.tileLayer(environment.openStreetMap.url, {
      attribution: environment.openStreetMap.attribution,
    }).addTo(this.map);

    this.map.on('zoomend', () => {
      this.zoom.set(this.map.getZoom());
    });

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
        const marker = L.marker([location.lat, location.lng])
          .addTo(this.map)
          .bindTooltip(String(location.title));
        markers.push(marker);
        marker.on('click', () => {
          this.onMarkerClick.emit(location);
        });
      }
      this.markers = markers;

      this.map.setView([locations[0].lat, locations[0].lng], this.zoom() ?? 13);
    }
  }
}
