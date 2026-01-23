import { Component, ChangeDetectionStrategy, input, model, output, computed } from '@angular/core';

import { Conjunction, FilterGroup, FilterType } from '@app/shared/field-system/filter/models';
import { FilterOptionComponent } from '@app/shared/field-system/filter/filter-option/filter-option.component';
import { TableRow } from '../../../models/table-row';
import { TableColumn } from '../../../models/table-column';

@Component({
  selector: 'data-filter-options',
  templateUrl: './data-filter-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterOptionComponent],
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
}
