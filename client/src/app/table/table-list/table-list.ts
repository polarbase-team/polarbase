import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';

import { TableService, TableDefinition } from '../table.service';

@Component({
  selector: 'app-table-list',
  imports: [Button, Divider],
  templateUrl: './table-list.html',
})
export class AppTableList {
  protected tables = signal<any>([]);

  constructor(
    private destroyRef: DestroyRef,
    private tableService: TableService,
  ) {}

  ngAfterViewInit() {
    this.tableService
      .getTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
      });
  }

  onTableSelected(table: TableDefinition) {
    this.tableService.selectedTable.set(table);
  }
}
