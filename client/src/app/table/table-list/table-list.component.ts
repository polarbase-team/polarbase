import _ from 'lodash';

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { Observable } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';
import { TextareaModule } from 'primeng/textarea';
import { Menu, MenuModule } from 'primeng/menu';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { AutoFocusModule } from 'primeng/autofocus';

import { TableService, TableDefinition } from '../table.service';

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
    MenuModule,
    ConfirmDialogModule,
    CheckboxModule,
    MessageModule,
    AutoFocusModule,
  ],
  providers: [ConfirmationService],
})
export class AppTableList {
  protected tblService = inject(TableService);
  protected tables = signal<TableDefinition[]>([]);
  protected filteredTables = signal<TableDefinition[]>([]);
  protected isLoading = false;
  protected isSaving = false;
  protected searchQuery = '';
  protected menuItems: MenuItem[] | undefined;
  protected visibleTableEditorDrawer = false;
  protected updatedTableName: string;
  protected updatedTable: TableDefinition = {} as TableDefinition;
  protected updatedTableMode: 'add' | 'edit' = 'add';
  protected isCascadeDeleteEnabled = false;

  constructor(
    private destroyRef: DestroyRef,
    private confirmationService: ConfirmationService,
  ) {}

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

  protected saveUpdatedTable() {
    this.isSaving = true;

    let fn: Observable<any>;

    if (this.updatedTableMode === 'edit') {
      fn = this.tblService.updateTable(this.updatedTableName, this.updatedTable);
    } else {
      fn = this.tblService.createTable(this.updatedTable);
    }

    fn.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updatedTable = {} as TableDefinition;
      this.isSaving = false;
      this.visibleTableEditorDrawer = false;
      this.refreshTables();
    });
  }

  protected editTable(table: TableDefinition) {
    this.updatedTableName = table.tableName;
    this.updatedTable = { ...table };
    this.updatedTableMode = 'edit';
    this.visibleTableEditorDrawer = true;
  }

  protected deleteTable(table: TableDefinition) {
    this.confirmationService.confirm({
      target: null,
      message: 'Do you want to delete this table?',
      header: 'Delete table',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: () => {
        this.isLoading = true;
        this.tblService
          .deleteTable(table.tableName, this.isCascadeDeleteEnabled)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.isLoading = false;
            this.refreshTables();
          });
        this.isCascadeDeleteEnabled = false;
      },
    });
  }

  protected openTableActionMenu(event: Event, table: TableDefinition, menu: Menu) {
    event.stopPropagation();
    this.menuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.editTable(table),
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.deleteTable(table),
      },
    ];
    menu.show(event);
  }

  protected refreshTables = _.debounce(() => this.getTables(), 1000, { leading: true });

  private getTables() {
    this.isLoading = true;
    this.tblService
      .getTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
        this.filteredTables.set(tables);
        this.searchQuery = '';
        this.isLoading = false;
      });
  }
}
