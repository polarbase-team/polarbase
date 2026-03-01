import { Component, ChangeDetectionStrategy, input, signal, output, model } from '@angular/core';

import { DrawerComponent, usingModules } from '@app/core/components/drawer/drawer.component';
import { TableRowAction, TableRowActionType } from '@app/shared/spreadsheet/events/table-row';
import { TableConfig } from '@app/shared/spreadsheet/models/table';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { TableRow } from '@app/shared/spreadsheet/models/table-row';
import { SpreadsheetComponent } from '@app/shared/spreadsheet/spreadsheet.component';
import { DataType } from '../../../models/field.interface';
import { ReferenceData } from '../../../models/reference/field.interface';
import { getReferenceDisplayLabel, ReferenceField } from '../../../models/reference/field.object';

export interface ReferencePickedEvent {
  value: string | number;
  displayLabel: string;
  data: ReferenceData;
}

@Component({
  selector: 'reference-picker-drawer',
  templateUrl: './picker-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...usingModules, SpreadsheetComponent],
})
export class ReferencePickerDrawerComponent extends DrawerComponent {
  field = input.required<ReferenceField>();
  value = model<string | number>();

  onSave = output<ReferencePickedEvent>();
  onCancel = output();

  protected config = signal<TableConfig>({
    sideSpacing: 20,
    toolbar: {
      customize: false,
      group: false,
      sort: false,
      rowSize: false,
    },
    column: {
      reorderable: false,
      calculable: false,
      addable: false,
      updatable: false,
      deletable: false,
      groupable: false,
      hideable: false,
      resizable: false,
      sortable: false,
    },
    row: {
      reorderable: false,
      expandable: false,
      addable: false,
      insertable: false,
      deletable: false,
      allowSelectAll: false,
    },
    cell: { fillable: false, editable: false, clearable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);
  protected isReady = signal(false);

  private pickedEvent: ReferencePickedEvent | null;

  protected override onShow() {
    super.onShow();
    this.loadTable();
  }

  protected save() {
    this.onSave.emit(this.pickedEvent);
    this.close();
  }

  protected cancel() {
    this.onCancel.emit();
    this.close();
  }

  protected onRowAction(action: TableRowAction) {
    switch (action.type) {
      case TableRowActionType.Select:
        const rows = (action.payload as TableRow[]) || [];
        const selectedRow = rows.pop();
        if (selectedRow) {
          const value = selectedRow.id;
          const data = selectedRow.data as ReferenceData;
          const displayLabel = getReferenceDisplayLabel(
            data,
            this.field().params.presentation?.format?.displayColumn,
          );
          this.value.set(value);
          this.pickedEvent = { data, value, displayLabel };
        } else {
          this.value.set(null);
          this.pickedEvent = null;
        }
        rows.forEach((row) => {
          row.selected = false;
        });
        this.rows.update((arr) => [...arr]);
        break;
    }
  }

  private loadTable() {
    this.loadTableSchema();
  }

  private async loadTableSchema() {
    const field = this.field();
    if (!field.resources) return;

    const { referenceTo, resources } = field;
    const { loadSchema, buildField } = resources;

    try {
      const columnDefs = await loadSchema(referenceTo);
      this.columns.set(null);

      if (!columnDefs || !columnDefs.length) return;

      const columns: TableColumn[] = [];
      const references = new Map<string, string>();
      for (const c of columnDefs) {
        columns.push({
          id: c.name,
          name: c.presentation?.uiName || c.name,
          primary: c.primary,
          editable: !c.primary,
          field: buildField(c),
        });
        if (c.dataType === DataType.Reference) {
          references.set(c.name, c.foreignKey.table);
        }
      }

      this.columns.set(columns);
      this.isReady.set(true);

      this.loadTableData(references);
    } catch (err) {
      console.error('Failed to load table schema in picker', err);
    }
  }

  private async loadTableData(references: Map<string, string>) {
    const field = this.field();
    if (!field.resources) return;

    const { referenceTo, resources } = field;
    const { loadRecords } = resources;

    try {
      const records = await loadRecords(referenceTo);
      this.rows.set(null);

      if (!records) return;

      const rows: TableRow[] = records.map((it: any) => ({
        id: it.id,
        data: {
          ...it,
          ...Object.fromEntries(
            Array.from(references.entries())
              .filter(([key]) => key in it)
              .map(([key, refKey]) => [key, it[refKey]]),
          ),
        },
        selected: it.id === this.value(),
      }));
      this.rows.set(rows);
    } catch (err) {
      console.error('Failed to load table data in picker', err);
    }
  }
}
