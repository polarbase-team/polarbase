import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  output,
  computed,
  viewChild,
} from '@angular/core';

import { FilterGroup } from '@app/shared/field-system/filter/models';
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
  query = model<FilterGroup>();
  columns = input<TableColumn[]>();
  rows = input<TableRow[]>();

  onFilter = output<TableRow[]>();

  filterOption = viewChild<FilterOptionComponent>('filterOption');

  protected fields = computed(() => (this.columns() || []).map((c) => c.field));

  applyChanges(rows = this.rows()) {
    this.filterOption()?.applyChanges(rows);
  }
}
