import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  model,
  effect,
  output,
} from '@angular/core';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { Conjunction, FilterGroup, FilterType } from '@app/shared/field-system/filter/models';
import { FilterGroupComponent } from '@app/shared/field-system/filter/filter-group.component';
import { TableRow } from '../../../models/table-row';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { FilterService } from '@app/shared/field-system/filter/filter.service';

@Component({
  selector: 'data-filter-options',
  templateUrl: './data-filter-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PopoverModule, ButtonModule, DividerModule, FilterGroupComponent],
  providers: [FilterService],
})
export class DataFilterOptionsComponent {
  query = model<FilterGroup>({
    type: FilterType.Group,
    conjunction: Conjunction.AND,
    children: [],
  });
  columns = input<TableColumn[]>();
  rows = input<TableRow[]>();

  onFilter = output<TableRow[]>();

  protected fields = computed(() => {
    return this.columns().map((column) => column.field);
  });
  protected rowsById = new Map<string | number, TableRow>();
  protected records = [];

  constructor(private filterService: FilterService) {
    effect(() => {
      const rows = this.rows() || [];
      for (const row of rows) {
        this.rowsById.set(row.id, row);
        this.records.push(row.data);
      }
    });
  }

  protected applyChanges() {
    const records = [...this.records];
    const filterRecords = this.filterService.filterRecords(records, this.query());
    const filteredRows = filterRecords.map((record) => this.rowsById.get(record['id']));
    this.onFilter.emit(filteredRows);
  }

  protected clear() {
    this.query.update((group) => {
      group.children = [];
      return { ...group };
    });
    this.onFilter.emit(this.rows());
  }
}
