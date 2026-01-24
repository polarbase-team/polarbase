import _ from 'lodash';

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';

import { TableService, TableDefinition, TableFormData } from '../../services/table.service';
import { TableEditorDrawerComponent } from '../../components/table-editor/table-editor-drawer.component';

@Component({
  selector: 'table-list',
  templateUrl: './table-list.component.html',
  host: { class: 'flex flex-col h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    ConfirmDialogModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    SkeletonModule,
    ToastModule,
    TableEditorDrawerComponent,
  ],
  providers: [ConfirmationService, MessageService],
})
export class TableListComponent {
  protected tables = signal<TableDefinition[]>([]);
  protected filteredTables = signal<TableDefinition[]>([]);
  protected isLoading = signal(false);
  protected isSaving = signal(false);
  protected searchQuery = '';
  protected menuItems: MenuItem[] | undefined;
  protected visibleTableEditorDrawer = false;
  protected updatedTable: TableDefinition;
  protected updatedTableMode: 'add' | 'edit' = 'add';
  protected tableToDelete = '';
  protected isCascadeDeleteEnabled = false;
  protected refreshTables = _.debounce(() => this.getTables(), 1000, { leading: true });

  constructor(
    private destroyRef: DestroyRef,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    protected tblService: TableService,
  ) {
    let tableFromQueryParam: string;

    this.activatedRoute.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        tableFromQueryParam = params['table'];
        if (!this.tables().length) {
          this.getTables(tableFromQueryParam);
        }
      });
  }

  private getTables(tableNameWillSelect?: string) {
    this.isLoading.set(true);
    this.tblService
      .getTables()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tables) => {
        this.tables.set(tables);
        this.filteredTables.set(tables);
        this.searchQuery = '';

        if (tableNameWillSelect) {
          const table = tables.find((t) => t.tableName === tableNameWillSelect);
          this.selectTable(table);
        }
      });
  }

  protected searchTable() {
    const tables = this.tables();

    let query = this.searchQuery.trim();
    if (!query) {
      this.filteredTables.set([...tables]);
      return;
    }

    query = query.toLowerCase();
    this.filteredTables.set(
      tables.filter(
        (t) =>
          t.tableName.toLowerCase().includes(query) ||
          (t.tableComment || '').toLowerCase().includes(query),
      ),
    );
  }

  protected selectTable(table: TableDefinition) {
    this.tblService.selectTable(table);
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { table: table.tableName },
      queryParamsHandling: 'merge',
    });
  }

  protected addNewTable() {
    this.updatedTableMode = 'add';
    this.visibleTableEditorDrawer = true;
  }

  protected editTable(table: TableDefinition) {
    this.updatedTable = table;
    this.updatedTableMode = 'edit';
    this.visibleTableEditorDrawer = true;
  }

  protected deleteTable(table: TableDefinition) {
    this.tableToDelete = '';
    this.isCascadeDeleteEnabled = false;
    this.confirmationService.confirm({
      target: null,
      message: `Are you sure you want to delete "${table.tableName}"?`,
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
        if (this.tableToDelete !== table.tableName) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Table name confirmation does not match.',
            life: 3000,
          });
          return;
        }
        this.isLoading.set(true);
        this.tblService
          .deleteTable(table.tableName, this.isCascadeDeleteEnabled)
          .pipe(
            finalize(() => this.isLoading.set(false)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe(() => {
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
        icon: 'icon icon-pencil',
        command: () => this.editTable(table),
      },
      {
        label: 'Delete',
        icon: 'icon icon-trash',
        command: () => this.deleteTable(table),
      },
    ];
    menu.show(event);
  }

  protected onTableEditorSave(savedTable: TableFormData) {
    this.getTables(savedTable.tableName);
  }
}
