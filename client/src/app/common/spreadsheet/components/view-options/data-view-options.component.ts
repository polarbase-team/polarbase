import { Component, input, output, computed, signal, effect } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { TableColumn } from '../../models/table-column';

export interface OrderingRule {
  column: TableColumn;
  asc: boolean;
}

@Component({
  selector: 'data-view-options',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    PopoverModule,
    ButtonModule,
    ToggleSwitchModule,
    DividerModule,
    MenuModule,
  ],
  templateUrl: './data-view-options.component.html',
})
export class DataViewOptionsComponent {
  type = input.required<'group' | 'sort'>();
  sourceColumns = input.required<TableColumn[]>();
  currentColumns = input<TableColumn[]>([]);
  limit = input<number>();

  apply = output<OrderingRule[]>();

  rules = signal<OrderingRule[]>([]);

  protected isGroupType = computed(() => {
    return this.type() === 'group';
  });

  protected isReachLimitColumn = computed<boolean>(() => {
    const limit = this.limit();
    return limit !== undefined && this.rules().length >= limit;
  });

  protected menuItems = computed<MenuItem[]>(() => {
    const currentItems = this.rules().map((i) => i.column.id);
    const columns = this.sourceColumns().filter((f) => !currentItems.includes(f.id));

    return columns.map((column) => ({
      label: column.field.name,
      command: () => {
        this.addColumn(column);
      },
    }));
  });

  constructor() {
    effect(() => {
      const isGroupType = this.isGroupType();
      const rules = this.currentColumns().map((column) => ({
        column,
        asc: (isGroupType ? column.groupSortType : column.sortType) === 'asc',
      }));
      this.rules.set(rules);
    });
  }

  protected addColumn(column: TableColumn) {
    this.rules.update((arr) => [...arr, { column, asc: true }]);
  }

  protected removeColumn(index: number) {
    this.rules.update((arr) => arr.filter((_, i) => i !== index));
  }

  protected toggleAsc(item: OrderingRule) {
    this.rules.update((arr) => arr.map((i) => (i === item ? { ...i, asc: !i.asc } : i)));
  }

  protected applyChanges() {
    this.apply.emit([...this.rules()]);
  }

  protected onDropped(event: CdkDragDrop<OrderingRule[]>) {
    const newItems = [...this.rules()];
    moveItemInArray(newItems, event.previousIndex, event.currentIndex);
    this.rules.set(newItems);
  }
}
