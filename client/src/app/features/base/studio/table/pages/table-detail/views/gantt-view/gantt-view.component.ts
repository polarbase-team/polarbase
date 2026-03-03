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
import {
  GanttComponent,
  GanttDateChangeEvent,
  GanttProgressChangeEvent,
} from '@app/shared/gantt/gantt.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { FilterGroup } from '@app/shared/field-system/filter/models';
import { FieldIconPipe } from '@app/shared/field-system/pipes/field-icon.pipe';
import { GanttTask } from '@app/shared/gantt/gantt.component';
import { ColumnDefinition, RecordData } from '../../../../services/table.service';
import { TableRealtimeMessage } from '../../../../services/table-realtime.service';
import { ViewLayoutService } from '../../../../services/view-layout.service';
import { UpdatedRecordMode } from '../../table-detail.component';
import { ViewBaseComponent } from '../view-base.component';

interface GanttViewConfiguration {
  selectedStartField?: string;
  selectedEndField?: string;
  selectedDisplayField?: string;
  selectedProgressField?: string;
  selectedParentField?: string;
  filterQuery?: FilterGroup;
}

const getRecordDisplayProgress = (record: RecordData, field: string) => {
  const value = record[field];
  if (value === undefined || value === null) return 0;
  return value;
};

@Component({
  selector: 'gantt-view',
  templateUrl: './gantt-view.component.html',
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
    GanttComponent,
    FilterOptionComponent,
    FieldIconPipe,
  ],
  providers: [ViewLayoutService],
})
export class GanttViewComponent
  extends ViewBaseComponent<GanttViewConfiguration>
  implements OnInit
{
  gantt = viewChild<GanttComponent>('gantt');
  filterOption = viewChild<FilterOptionComponent>('filterOption');

  protected dateColumns: ColumnDefinition[] = [];
  protected numberColumns: ColumnDefinition[] = [];
  protected tasks = signal<GanttTask[]>([]);
  protected selectedStartField: string;
  protected selectedEndField: string;
  protected selectedDisplayField: string;
  protected selectedProgressField: string;
  protected selectedParentField: string;
  protected filterQuery: FilterGroup;

  ngOnInit() {
    const configuration = this.getViewConfiguration();
    this.selectedStartField = configuration.selectedStartField;
    this.selectedEndField = configuration.selectedEndField;
    this.selectedDisplayField = configuration.selectedDisplayField;
    this.selectedProgressField = configuration.selectedProgressField;
    this.selectedParentField = configuration.selectedParentField;
    this.filterQuery = configuration.filterQuery;

    this.loadTable();
  }

  protected override async loadTable() {
    this.saveViewConfiguration();

    if (!this.columns().length) {
      await this.loadTableSchema();
    }

    if (this.selectedStartField && this.selectedEndField) {
      await super.loadTable();
    }
  }

  protected override async loadTableData() {
    if (!this.selectedStartField || !this.selectedEndField) {
      return;
    }

    await super.loadTableData();
  }

  protected override onColumnsLoaded(columns: ColumnDefinition[]) {
    this.dateColumns = [];
    this.numberColumns = [];

    for (const column of columns) {
      switch (column.dataType) {
        case DataType.AutoDate:
        case DataType.Date:
          this.dateColumns.push(column);
          break;
        case DataType.Integer:
        case DataType.Number:
          this.numberColumns.push(column);
          break;
      }
    }
  }

  protected override onRecordsLoaded(records: RecordData[]) {
    this.filterOption().applyChanges(records);
  }

  protected onRecordsFiltered(records: RecordData[]) {
    this.saveViewConfiguration();
    this.buildTasks(records);
  }

  protected override onRealtimeMessage(message: TableRealtimeMessage) {
    const { action, record } = message;

    switch (action) {
      case 'insert': {
        this.tasks.update((tasks) => {
          if (tasks.some((e) => e.id === String(record.new.id))) return tasks;

          const start = record.new[this.selectedStartField];
          if (!start) return tasks;

          const end = record.new[this.selectedEndField] ?? start;

          return [
            ...tasks,
            {
              id: String(record.new.id),
              name: getRecordDisplayLabel(record.new, this.selectedDisplayField),
              progress: getRecordDisplayProgress(record.new, this.selectedProgressField),
              dependencies: record.new[this.selectedParentField],
              start,
              end,
            },
          ];
        });
        break;
      }

      case 'update': {
        const start = record.new[this.selectedStartField];
        if (start) {
          const end = record.new[this.selectedEndField] ?? start;

          this.tasks.update((tasks) =>
            tasks.map((e) =>
              e.id === String(record.new.id)
                ? {
                    ...e,
                    title: getRecordDisplayLabel(record.new, this.selectedDisplayField),
                    progress: getRecordDisplayProgress(record.new, this.selectedProgressField),
                    dependencies: record.new[this.selectedParentField],
                    start,
                    end,
                  }
                : e,
            ),
          );
        } else {
          this.tasks.update((tasks) => tasks.filter((e) => e.id !== String(record.new.id)));
        }
        break;
      }

      case 'delete': {
        this.tasks.update((tasks) => tasks.filter((e) => e.id !== String(record.key.id)));
        break;
      }
    }
  }

  protected override saveViewConfiguration() {
    super.saveViewConfiguration({
      selectedStartField: this.selectedStartField,
      selectedEndField: this.selectedEndField,
      selectedDisplayField: this.selectedDisplayField,
      selectedProgressField: this.selectedProgressField,
      selectedParentField: this.selectedParentField,
      filterQuery: this.filterQuery,
    });
  }

  protected addNewRecord() {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: { id: undefined },
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
      const start = savedRecord[this.selectedStartField];
      if (start) {
        const end = savedRecord[this.selectedEndField] ?? start;

        this.tasks.update((tasks) => [
          ...tasks,
          {
            id: String(savedRecord.id),
            name: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
            progress: getRecordDisplayProgress(savedRecord, this.selectedProgressField),
            dependencies: savedRecord[this.selectedParentField],
            start,
            end,
          },
        ]);
      }
    } else if (mode === 'edit' && recordId !== undefined) {
      const start = savedRecord[this.selectedStartField];
      if (start) {
        const end = savedRecord[this.selectedEndField] ?? start;

        this.tasks.update((tasks) =>
          tasks.map((e) =>
            e.id === recordId
              ? {
                  ...e,
                  title: getRecordDisplayLabel(savedRecord, this.selectedDisplayField),
                  progress: getRecordDisplayProgress(savedRecord, this.selectedProgressField),
                  dependencies: savedRecord[this.selectedParentField],
                  start,
                  end,
                }
              : e,
          ),
        );
      } else {
        this.tasks.update((tasks) => tasks.filter((e) => e.id !== String(recordId)));
      }
    }
  }

  protected onTaskDateChange(e: GanttDateChangeEvent) {
    this.tableService.updateRecords(this.table().name, [
      {
        id: e.task.id,
        data: {
          id: e.task.id,
          [this.selectedStartField]: e.start,
          [this.selectedEndField]: e.end,
        },
      },
    ]);
  }

  protected onTaskProgressChange(e: GanttProgressChangeEvent) {
    this.tableService.updateRecords(this.table().name, [
      {
        id: e.task.id,
        data: {
          id: e.task.id,
          [this.selectedProgressField]: e.progress,
        },
      },
    ]);
  }

  protected onTaskClick(e: GanttTask) {
    this.onUpdateRecord.emit({
      record: {
        table: this.table(),
        fields: this.fields(),
        data: this.records().find((r) => String(r.id) === e.id),
      },
      mode: 'edit',
    });
  }

  private buildTasks(records: RecordData[]) {
    if (!this.selectedStartField || !this.selectedEndField) {
      this.tasks.set([]);
      return;
    }

    this.tasks.set(
      records.reduce<GanttTask[]>((tasks, record) => {
        const start = record[this.selectedStartField];
        if (!start) return tasks;

        const end = record[this.selectedEndField] ?? start;

        tasks.push({
          id: String(record.id),
          name: getRecordDisplayLabel(record, this.selectedDisplayField),
          progress: getRecordDisplayProgress(record, this.selectedProgressField),
          dependencies: record[this.selectedParentField],
          start,
          end,
        });

        return tasks;
      }, []),
    );
  }
}
