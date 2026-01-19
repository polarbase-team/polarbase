import { Component, ChangeDetectionStrategy, input, computed, model, output } from '@angular/core';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import {
  Conjunction,
  FilterGroup,
  FilterRule,
  FilterType,
} from '@app/shared/field-system/filter/models';
import { FilterGroupComponent } from '@app/shared/field-system/filter/filter-group.component';
import { TableRow } from '../../../models/table-row';
import { TableColumn } from '@app/shared/spreadsheet/models/table-column';
import { FilterService } from '@app/shared/field-system/filter/filter.service';
import { DataType } from '@app/shared/field-system/models/field.interface';

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

  protected fields = computed(() => (this.columns() || []).map((c) => c.field));

  private fieldsByName = computed(
    () => new Map(this.columns().map((c) => [c.field.name, c.field])),
  );

  constructor(private filterService: FilterService) {}

  protected applyChanges() {
    const fieldsByName = this.fieldsByName();
    const filteredRows = this.filterService.filter(
      [...this.rows()],
      this.query(),
      (row: TableRow, rule: FilterRule) => {
        let data = row.data[rule.field];

        const field = fieldsByName.get(rule.field);
        switch (field.dataType) {
          case DataType.Reference:
          case DataType.GeoPoint:
            data = field.toString(data);
            break;
        }

        return data;
      },
    );
    this.onFilter.emit(filteredRows);
  }

  protected reset() {
    this.query.update((group) => {
      group.children = [];
      return { ...group };
    });
    this.onFilter.emit(this.rows());
  }
}
