import { Component, ChangeDetectionStrategy, input, computed, model, output } from '@angular/core';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { DataType } from '../../models/field.interface';
import { Field } from '../../models/field.object';
import { Conjunction, FilterGroup, FilterRule, FilterType } from '../models';
import { FilterService } from '../filter.service';
import { FilterGroupComponent } from '../filter-group/filter-group.component';

@Component({
  selector: 'filter-option',
  templateUrl: './filter-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PopoverModule, ButtonModule, DividerModule, FilterGroupComponent],
  providers: [FilterService],
})
export class FilterOptionComponent {
  query = model<FilterGroup>({
    type: FilterType.Group,
    conjunction: Conjunction.AND,
    children: [],
  });
  fields = input<Field[]>();
  items = input<any[]>();
  itemValue = input<string>();

  onFilter = output<any[]>();

  private fieldsByName = computed(() => new Map(this.fields().map((f) => [f.name, f])));

  constructor(private filterService: FilterService) {}

  protected applyChanges() {
    const fieldsByName = this.fieldsByName();
    const filteredItems = this.filterService.filter(
      [...this.items()],
      this.query(),
      (item: any, rule: FilterRule) => {
        const field = fieldsByName.get(rule.field);
        let data = this.itemValue() ? item[this.itemValue()][rule.field] : item[rule.field];

        switch (field.dataType) {
          case DataType.Reference:
          case DataType.GeoPoint:
            data = field.toString(data);
            break;
        }

        return data;
      },
    );
    this.onFilter.emit(filteredItems);
  }

  protected reset() {
    this.query.update((group) => {
      group.children = [];
      return { ...group };
    });
    this.onFilter.emit(this.items());
  }
}
