import { ChangeDetectionStrategy, Component, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { FluidModule } from 'primeng/fluid';

import { getRecordDisplayLabel } from '@app/core/utils';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { OpenMapComponent, Location, Position } from '@app/shared/open-map/open-map.component';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { FilterGroup } from '@app/shared/field-system/filter/models';
import { FieldIconPipe } from '@app/shared/field-system/pipes/field-icon.pipe';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import { ViewLayoutService } from '../../../../services/view-layout.service';
import { UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

interface MapViewConfiguration {
  selectedGeoPointField?: string;
  selectedDisplayField?: string;
  filterQuery?: FilterGroup;
  mapCenter?: Position;
  mapZoom?: number;
}

@Component({
  selector: 'map-view',
  templateUrl: './map-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    PopoverModule,
    SelectModule,
    DividerModule,
    SkeletonModule,
    FluidModule,
    OpenMapComponent,
    FilterOptionComponent,
    FieldIconPipe,
  ],
  providers: [ViewLayoutService],
})
export class MapViewComponent extends ViewBaseComponent<MapViewConfiguration> implements OnInit {
  filterOption = viewChild<FilterOptionComponent>('filterOption');

  protected geoPointColumns: ColumnDefinition[] = [];
  protected locations = signal<Location[]>([]);
  protected selectedGeoPointField: string;
  protected selectedDisplayField: string;
  protected filterQuery: FilterGroup;
  protected mapCenter: Position;
  protected mapZoom = 13;

  ngOnInit() {
    const configuration = this.getViewConfiguration();
    this.selectedGeoPointField = configuration.selectedGeoPointField;
    this.selectedDisplayField = configuration.selectedDisplayField;
    this.filterQuery = configuration.filterQuery;
    this.mapZoom = configuration.mapZoom;

    this.loadTable();
  }

  protected override async loadTable() {
    this.saveViewConfiguration();

    if (!this.columns().length) {
      await this.loadTableSchema();
    }

    if (this.selectedGeoPointField) {
      await super.loadTable();
    }
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.geoPointColumns = columns.filter((c) => c.dataType === DataType.GeoPoint);
  }

  protected override onRecordsLoaded(records: RecordData[]) {
    this.filterOption().applyChanges(records);
  }

  protected onRecordsFiltered(records: RecordData[]) {
    this.saveViewConfiguration();
    this.buildLocations(records);
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;

    switch (action) {
      case 'insert': {
        const lat = record.new[this.selectedGeoPointField]?.x;
        const lng = record.new[this.selectedGeoPointField]?.y;
        if (lat && lng) {
          this.locations.update((l) => [
            ...l,
            {
              id: record.new.id,
              title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
              lat,
              lng,
            },
          ]);
        }
        break;
      }

      case 'update': {
        const lat = record.new[this.selectedGeoPointField]?.x;
        const lng = record.new[this.selectedGeoPointField]?.y;
        if (lat && lng) {
          this.locations.update((l) =>
            l.map((l) =>
              l.id === record.new.id
                ? {
                    id: record.new.id,
                    title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
                    lat,
                    lng,
                  }
                : l,
            ),
          );
        } else {
          this.locations.update((l) => l.filter((l) => l.id !== record.new.id));
        }
        break;
      }

      case 'delete': {
        this.locations.update((l) => l.filter((l) => l.id !== record.key.id));
        break;
      }
    }
  }

  protected override saveViewConfiguration() {
    super.saveViewConfiguration({
      selectedGeoPointField: this.selectedGeoPointField,
      selectedDisplayField: this.selectedDisplayField,
      filterQuery: this.filterQuery,
      mapCenter: this.mapCenter,
      mapZoom: this.mapZoom,
    });
  }

  protected addNewRecord(location?: Location) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: {
          id: undefined,
          [this.selectedGeoPointField]: location ? { x: location.lat, y: location.lng } : undefined,
        },
      },
      mode: 'add',
    });
  }

  override onRecordSave(
    savedRecord: RecordData,
    mode: UpdatedRecordMode,
    currentRecord?: RecordData,
  ) {
    super.onRecordSave(savedRecord, mode, currentRecord);

    const recordId = currentRecord?.id;

    if (mode === 'add') {
      const location = savedRecord[this.selectedGeoPointField];
      if (location) {
        this.locations.update((locations) => [
          ...locations,
          {
            id: String(savedRecord.id),
            name: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
            lat: location.x,
            lng: location.y,
          },
        ]);
      }
    } else if (mode === 'edit' && recordId !== undefined) {
      const location = savedRecord[this.selectedGeoPointField];
      if (location) {
        this.locations.update((locations) =>
          locations.map((e) =>
            e.id === recordId
              ? {
                  ...e,
                  name: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
                  lat: location.x,
                  lng: location.y,
                }
              : e,
          ),
        );
      } else {
        this.locations.update((locations) => locations.filter((e) => e.id !== String(recordId)));
      }
    }
  }

  protected onMapMove() {
    this.saveViewConfiguration();
  }

  protected onMapZoom() {
    this.saveViewConfiguration();
  }

  protected onMarkerClick(location: Location) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: this.records().find((r) => r.id === location.id),
      },
      mode: 'edit',
    });
  }

  private buildLocations(records: RecordData[]) {
    if (!this.selectedGeoPointField) {
      this.locations.set([]);
      return;
    }

    this.locations.set(
      records.reduce<Location[]>((acc, r) => {
        if (r[this.selectedGeoPointField]) {
          acc.push({
            id: r.id,
            title: getRecordDisplayLabel(r, this.selectedDisplayField),
            lat: r[this.selectedGeoPointField].x,
            lng: r[this.selectedGeoPointField].y,
          });
        }
        return acc;
      }, []),
    );
  }
}
