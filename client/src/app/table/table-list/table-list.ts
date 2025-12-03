import { Component, DestroyRef, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';

import { TableService } from '../table.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-table-list',
  imports: [Button, Divider],
  providers: [TableService],
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
      .subscribe(({ data }: any) => {
        this.tables.set(data);
      });
  }
}
