import _ from 'lodash';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

import { TableService, TableDefinition } from '../table.service';

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, IconFieldModule, InputIconModule, InputTextModule],
})
export class AppTableList {
  protected tables = signal<TableDefinition[]>([]);
  protected filteredTables = signal<TableDefinition[]>([]);
  protected isLoading = signal<boolean>(false);
  protected searchQuery = '';

  protected tblService = inject(TableService);

  constructor(private destroyRef: DestroyRef) {}

  ngAfterViewInit() {
    this.tblService
      .getTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
        this.filteredTables.set(tables);
      });
  }

  protected onTableSearch(query: string) {
    const tables = this.tables();
    if (query.length) {
      this.filteredTables.set(
        tables.filter(
          (t) => t.tableName.search(query) !== -1 || (t.tableComment || '').search(query) !== -1,
        ),
      );
    } else {
      this.filteredTables.set([...tables]);
    }
  }

  protected onTableSelected(table: TableDefinition) {
    this.tblService.selectedTable.set(table);
  }

  protected refreshTables = _.debounce(() => this.getTables(), 1000, { leading: true });

  private getTables() {
    this.isLoading.set(true);
    this.tblService
      .getTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
        this.filteredTables.set(tables);
        this.searchQuery = '';
        this.isLoading.set(false);
      });
  }
}
