import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { Field } from '@app/shared/field-system/models/field.object';
import { ColumnEditorDrawerComponent } from '../../components/column-editor/column-editor-drawer.component';
import { RecordEditorDrawerComponent } from '../../components/record-editor/record-editor-drawer.component';
import {
  ColumnDefinition,
  RecordData,
  TableDefinition,
  TableService,
} from '../../services/table.service';
import { ViewLayoutService } from '../../services/view-layout.service';
import { DataViewComponent } from './views/data-view/data-view.component';
import { CalendarViewComponent } from './views/calendar-view/calendar-view.component';
import { MapViewComponent } from './views/map-view/map-view.component';

export type DisplayMode = 'data-view' | 'calendar-view' | 'map-view';

interface UpdatedRecord {
  table: TableDefinition;
  fields: Field[];
  data: RecordData;
}

export type UpdatedColumnMode = 'add' | 'edit';
export type UpdatedRecordMode = 'add' | 'edit' | 'view';

export interface UpdateColumnEvent {
  column: ColumnDefinition;
  mode: UpdatedColumnMode;
}

export interface UpdateRecordEvent {
  record: UpdatedRecord;
  mode: UpdatedRecordMode;
}

@Component({
  selector: 'table-detail',
  templateUrl: './table-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    DividerModule,
    MenuModule,
    RecordEditorDrawerComponent,
    ColumnEditorDrawerComponent,
    DataViewComponent,
    CalendarViewComponent,
    MapViewComponent,
  ],
  providers: [ViewLayoutService],
})
export class TableDetailComponent implements OnInit {
  table = input<TableDefinition>();

  view = viewChild<DataViewComponent | CalendarViewComponent | MapViewComponent>('view');

  protected displayMode = signal<DisplayMode>(null);
  protected displayModeMenuItems: MenuItem[] = [
    {
      label: 'Data View',
      icon: 'icon icon-sheet',
      command: () => {
        this.selectDisplayMode('data-view');
      },
    },
    {
      label: 'Calendar View',
      icon: 'icon icon-calendar-days',
      command: () => {
        this.selectDisplayMode('calendar-view');
      },
    },
    {
      label: 'Map View',
      icon: 'icon icon-map',
      command: () => {
        this.selectDisplayMode('map-view');
      },
    },
  ];

  protected updatedColumn: ColumnDefinition;
  protected updatedColumnMode: UpdatedColumnMode = 'add';
  protected visibleColumnEditor: boolean;

  protected updatedRecord: UpdatedRecord = {
    table: {} as TableDefinition,
    fields: [],
    data: { id: undefined },
  };
  protected updatedRecordMode: UpdatedRecordMode = 'add';
  protected visibleRecordEditor: boolean;

  constructor(
    protected tblService: TableService,
    protected viewLayoutService: ViewLayoutService,
  ) {}

  ngOnInit() {
    const viewLayout = this.viewLayoutService.load(this.table().name);
    this.displayMode.set(viewLayout?.displayMode || 'data-view');
  }

  protected onUpdateColumn(event: UpdateColumnEvent) {
    this.updatedColumn = event.column;
    this.updatedColumnMode = event.mode;
    this.visibleColumnEditor = true;
  }

  protected onUpdateRecord(event: UpdateRecordEvent) {
    this.updatedRecord = event.record;
    this.updatedRecordMode = event.mode;
    this.visibleRecordEditor = true;
  }

  protected onColumnSave(savedColumn: ColumnDefinition) {
    this.view().onColumnSave(savedColumn, this.updatedColumnMode, this.updatedColumn);
  }

  protected onRecordSave(savedRecord: RecordData) {
    this.view().onRecordSave(savedRecord, this.updatedRecordMode, this.updatedRecord.data);
  }

  private selectDisplayMode(mode: DisplayMode) {
    this.displayMode.set(mode);
    this.viewLayoutService.save(this.table().name, { displayMode: mode }, true);
  }
}
