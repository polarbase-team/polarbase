import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { TableService, TableDefinition } from '../table.service';

@Component({
  selector: 'app-table-list',
  imports: [ButtonModule, DividerModule],
  templateUrl: './table-list.html',
})
export class AppTableList {
  protected tables = signal<TableDefinition[]>([]);

  protected tblService = inject(TableService);

  constructor(private destroyRef: DestroyRef) {}

  ngAfterViewInit() {
    this.tblService
      .getTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
      });
  }

  onTableSelected(table: TableDefinition) {
    this.tblService.selectedTable.set(table);
  }
}
