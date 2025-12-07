import { Component, input, output, computed, signal, effect } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { TableColumn } from '../../models/table-column';

export interface OrderItem {
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
    PanelModule,
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

  apply = output<OrderItem[]>();

  items = signal<OrderItem[]>([]);

  protected isGroupType = computed(() => {
    return this.type() === 'group';
  });

  protected isReachLimitColumn = computed<boolean>(() => {
    return this.items().length >= this.limit();
  });

  protected menuItems = computed<MenuItem[]>(() => {
    const currentItems = this.items().map((i) => i.column.id);
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
      const items = this.currentColumns().map((column) => ({
        column,
        asc: (isGroupType ? column.groupSortType : column.sortType) === 'asc',
      }));
      this.items.set(items);
    });
  }

  protected addColumn(column: TableColumn) {
    this.items.update((arr) => [...arr, { column, asc: true }]);
  }

  protected removeColumn(index: number) {
    this.items.update((arr) => arr.filter((_, i) => i !== index));
  }

  protected toggleAsc(item: OrderItem) {
    this.items.update((arr) =>
      arr.map((i) => (i.column.id === item.column.id ? { ...i, asc: !i.asc } : i)),
    );
  }

  protected applyChanges() {
    this.apply.emit(this.items());
  }

  protected onDropped(event: CdkDragDrop<OrderItem[]>) {
    const newItems = [...this.items()];
    moveItemInArray(newItems, event.previousIndex, event.currentIndex);
    this.items.set(newItems);
  }
}
