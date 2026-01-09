import { Component, ChangeDetectionStrategy, input, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DrawerComponent, usingModules } from '@app/core/components/drawer.component';
import { ReferenceField } from '@app/shared/field-system/models/reference/field.object';
import { TableRowAction, TableRowActionType } from '@app/shared/spreadsheet/events/table-row';
import { TableConfig } from '@app/shared/spreadsheet/models/table';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { TableRow } from '@app/shared/spreadsheet/models/table-row';
import { SpreadsheetComponent } from '@app/shared/spreadsheet/spreadsheet.component';

@Component({
  selector: 'reference-picker-drawer',
  templateUrl: './picker-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...usingModules, SpreadsheetComponent],
})
export class ReferencePickerDrawerComponent extends DrawerComponent<string | number> {
  field = input.required<ReferenceField>();

  protected config = signal<TableConfig>({
    sideSpacing: 20,
    allowSelectAllRows: false,
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
    },
    cell: { fillable: false, editable: false, clearable: false },
  });
  protected columns = signal<TableColumn[]>([]);
  protected rows = signal<TableRow[]>([]);

  constructor(private destroyRef: DestroyRef) {
    super();
  }

  override onShow() {
    super.onShow();

    this.loadTable();
  }

  protected onRowAction(action: TableRowAction) {
    switch (action.type) {
      case TableRowActionType.Select:
        const rows = (action.payload as TableRow[]) || [];
        this.value.set(rows.pop()?.id || null);
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

  private loadTableSchema() {
    const field = this.field();
    if (!field.resources) return;

    const { referenceTo, resources } = field;
    const { loadSchema, buildField } = resources;
    loadSchema(referenceTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((columnDefs) => {
        this.columns.set(null);

        if (!columnDefs.length) return;

        const columns: TableColumn[] = columnDefs.map((c: any) => ({
          id: c.name,
          primary: c.primary,
          editable: !c.primary,
          field: buildField(c),
        }));
        setTimeout(() => this.columns.set(columns));

        this.loadTableData();
      });
  }

  private loadTableData() {
    const field = this.field();
    if (!field.resources) return;

    const { referenceTo, resources } = field;
    const { loadRecords } = resources;
    loadRecords(referenceTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((records) => {
        this.rows.set(null);

        if (!records) return;

        const rows: TableRow[] = records.map((it: any) => ({
          id: it.id,
          data: it,
          selected: it.id === this.value(),
        }));
        setTimeout(() => this.rows.set(rows));
      });
  }
}
