import _ from 'lodash';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';

import { TableService, TableDefinition } from '../table.service';
import { Observable } from 'rxjs';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    DrawerModule,
    TextareaModule,
  ],
})
export class AppTableList {
  protected tblService = inject(TableService);
  protected tables = signal<TableDefinition[]>([]);
  protected filteredTables = signal<TableDefinition[]>([]);
  protected isLoading = signal<boolean>(false);
  protected isSaving = signal<boolean>(false);
  protected searchQuery = '';
  protected visibleTableEditorDrawer = false;
  protected updatedTable: TableDefinition = {} as TableDefinition;
  protected updatedTableMode: 'add' | 'edit' = 'add';

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

  protected saveTable() {
    this.isSaving.set(true);

    let fn: Observable<any>;

    if (this.updatedTableMode === 'edit') {
      fn = this.tblService.updateTable(this.updatedTable);
    } else {
      fn = this.tblService.createTable(this.updatedTable);
    }

    fn.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isSaving.set(false);
      this.visibleTableEditorDrawer = false;
      this.refreshTables();
    });
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
