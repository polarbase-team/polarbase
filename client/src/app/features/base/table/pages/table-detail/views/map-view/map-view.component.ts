import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { getRecordDisplayLabel } from '@app/core/utils';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { OpenMapComponent, Location } from '@app/shared/open-map/open-map.component';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { TableRealtimeMessage } from '@app/features/base/table/services/table-realtime.service';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { ViewBaseComponent } from '../view-base.component';
import { UpdatedRecordMode } from '../../table-detail.component';

@Component({
  selector: 'map-view',
  templateUrl: './map-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    PopoverModule,
    SelectModule,
    DividerModule,
    ProgressSpinnerModule,
    OpenMapComponent,
    FilterOptionComponent,
  ],
})
export class MapViewComponent extends ViewBaseComponent {
  protected geoPointColumns: ColumnDefinition[] = [];
  protected locations = signal<Location[]>([]);
  protected selectedGeoPointField: string;

  constructor() {
    super();

    effect(() => {
      const selectedTable = this.tblService.selectedTable();
      if (!selectedTable) return;

      this.reset();
      this.loadTable(selectedTable);
    });
  }

  override reset() {
    super.reset();

    this.geoPointColumns = [];
    this.selectedGeoPointField = undefined;
  }

  override onRecordSave(
    savedRecord: RecordData,
    mode: UpdatedRecordMode,
    currentRecord?: RecordData,
  ) {
    super.onRecordSave(savedRecord, mode, currentRecord);
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.geoPointColumns = columns.filter((c) => c.dataType === DataType.GeoPoint);
  }

  protected override onRecordsLoaded(records: any[]) {
    this.onRecordsFiltered(records);
  }

  protected onRecordsFiltered(records: any[]) {
    const locations: Location[] = [];
    for (const record of records) {
      if (record[this.selectedGeoPointField]) {
        locations.push({
          id: record.id,
          title: getRecordDisplayLabel(record),
          lng: record[this.selectedGeoPointField].x,
          lat: record[this.selectedGeoPointField].y,
        });
      }
    }
    this.locations.set(locations);
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;
    const recordId = record.new.id;

    switch (action) {
      case 'insert':
        this.locations.update((l) => [
          ...l,
          {
            id: record.new.id,
            title: getRecordDisplayLabel(record.new),
            lng: record.new[this.selectedGeoPointField].x,
            lat: record.new[this.selectedGeoPointField].y,
          },
        ]);
        break;

      case 'update':
        if (record.new[this.selectedGeoPointField]) {
          this.locations.update((l) =>
            l.map((l) =>
              l.id === recordId
                ? {
                    id: record.new.id,
                    title: getRecordDisplayLabel(record.new),
                    lng: record.new[this.selectedGeoPointField].x,
                    lat: record.new[this.selectedGeoPointField].y,
                  }
                : l,
            ),
          );
        } else {
          this.locations.update((l) => l.filter((l) => l.id !== recordId));
        }
        break;

      case 'delete':
        this.locations.update((l) => l.filter((l) => l.id !== recordId));
        break;
    }
  }

  protected onMarkerClick(location: Location) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields(),
        data: this.records().find((r) => r.id === location.id),
      },
      mode: 'edit',
    });
  }

  protected onChangeGeoPointField() {
    this.onRecordsFiltered(this.records());
  }

  protected addNewRecord(location?: Location) {
    this.onUpdateRecord.emit({
      record: {
        table: this.tblService.selectedTable(),
        fields: this.fields(),
        data: {
          id: undefined,
          [this.selectedGeoPointField]: location ? { x: location.lng, y: location.lat } : undefined,
        },
      },
      mode: 'add',
    });
  }
}
