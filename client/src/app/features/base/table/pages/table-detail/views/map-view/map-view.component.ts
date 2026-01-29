import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { FluidModule } from 'primeng/fluid';

import { getRecordDisplayLabel } from '@app/core/utils';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { OpenMapComponent, Location } from '@app/shared/open-map/open-map.component';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { FilterGroup } from '@app/shared/field-system/filter/models';
import { FieldIconPipe } from '@app/shared/field-system/pipes/field-icon.pipe';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import { ViewLayoutService } from '../../../../services/view-layout.service';
import { ViewBaseComponent } from '../view-base.component';

interface MapViewConfiguration {
  selectedGeoPointField?: string;
  selectedDisplayField?: string;
  filterQuery?: FilterGroup;
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
    ProgressSpinnerModule,
    SkeletonModule,
    FluidModule,
    OpenMapComponent,
    FilterOptionComponent,
    FieldIconPipe,
  ],
  providers: [ViewLayoutService],
})
export class MapViewComponent extends ViewBaseComponent<MapViewConfiguration> {
  filterOption = viewChild<FilterOptionComponent>('filterOption');

  protected geoPointColumns: ColumnDefinition[] = [];
  protected locations = signal<Location[]>([]);
  protected selectedGeoPointField: string;
  protected selectedDisplayField: string;
  protected filterQuery: FilterGroup;

  constructor() {
    super();

    const configuration = this.getViewConfiguration();
    this.selectedGeoPointField = configuration.selectedGeoPointField;
    this.selectedDisplayField = configuration.selectedDisplayField;
    this.filterQuery = configuration.filterQuery;

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
      case 'insert':
        this.locations.update((l) => [
          ...l,
          {
            id: record.new.id,
            title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
            lng: record.new[this.selectedGeoPointField].x,
            lat: record.new[this.selectedGeoPointField].y,
          },
        ]);
        break;

      case 'update':
        if (record.new[this.selectedGeoPointField]) {
          this.locations.update((l) =>
            l.map((l) =>
              l.id === record.new.id
                ? {
                    id: record.new.id,
                    title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
                    lng: record.new[this.selectedGeoPointField].x,
                    lat: record.new[this.selectedGeoPointField].y,
                  }
                : l,
            ),
          );
        } else {
          this.locations.update((l) => l.filter((l) => l.id !== record.new.id));
        }
        break;

      case 'delete':
        this.locations.update((l) => l.filter((l) => l.id !== record.key.id));
        break;
    }
  }

  protected override saveViewConfiguration() {
    super.saveViewConfiguration({
      selectedGeoPointField: this.selectedGeoPointField,
      selectedDisplayField: this.selectedDisplayField,
      filterQuery: this.filterQuery,
    });
  }

  protected addNewRecord(location?: Location) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: {
          id: undefined,
          [this.selectedGeoPointField]: location ? { x: location.lng, y: location.lat } : undefined,
        },
      },
      mode: 'add',
    });
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
            lng: r[this.selectedGeoPointField].x,
            lat: r[this.selectedGeoPointField].y,
          });
        }
        return acc;
      }, []),
    );
  }
}
