import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';

import { TableColumn } from '../../models/table-column';

@Component({
  selector: 'column-view-options',
  templateUrl: './column-view-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
})
export class ColumnViewOptionsComponent {
  sourceColumns = input.required<TableColumn[]>();
  visibleColumns = input.required<TableColumn[]>();

  onToggle = output<{ column: TableColumn; hidden: boolean }>();
  onMove = output<{ column: TableColumn; newIndex: number }>();

  columns = signal<TableColumn[]>([]);

  constructor() {
    effect(() => {
      this.columns.set([...this.sourceColumns()]);
    });
  }

  protected toggleHidden(column: TableColumn) {
    this.onToggle.emit({ column, hidden: !column.hidden });
  }

  protected onDropped(event: CdkDragDrop<TableColumn[]>) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const newColumns = [...this.columns()];
    const column = newColumns[previousIndex];
    moveItemInArray(newColumns, previousIndex, currentIndex);
    this.columns.set(newColumns);

    const visibleColumns = new Set(this.visibleColumns());
    if (!visibleColumns.has(column)) return;

    let newIndex = 0;
    for (let i = 0; i < currentIndex; i++) {
      if (visibleColumns.has(newColumns[i])) newIndex++;
    }

    this.onMove.emit({ column, newIndex });
  }
}
