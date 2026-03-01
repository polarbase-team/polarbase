import _ from 'lodash';

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { take } from 'rxjs';

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

const TABLE_ORDER_KEY = 'table_list_order';

@Component({
  selector: 'table-list',
  templateUrl: './table-list.component.html',
  host: { class: 'flex flex-col h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DragDropModule,
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
  protected tableToConfirm = '';
  protected tableToDelete = '';
  protected isCascadeDeleteEnabled = false;
  protected refreshTables = _.debounce(() => this.getTables(), 1000, { leading: true });

  constructor(
    private activatedRoute: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    protected tableService: TableService,
  ) {
    let tableFromQueryParam: string;

    this.activatedRoute.queryParams.pipe(take(1)).subscribe((params) => {
      tableFromQueryParam = params['table'];
      if (!this.tables().length) {
        this.getTables(tableFromQueryParam);
      }
    });
  }

  protected arrangeTableList(event: CdkDragDrop<any>) {
    this.tables.update((tables) => {
      moveItemInArray(tables, event.previousIndex, event.currentIndex);
      return [...tables];
    });
    this.filteredTables.set([...this.tables()]);
    localStorage.setItem(TABLE_ORDER_KEY, JSON.stringify(this.tables().map((t) => t.name)));
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
          t.name.toLowerCase().includes(query) ||
          (t.presentation?.uiName || '').toLowerCase().includes(query),
      ),
    );
  }

  protected selectTable(tableName: string) {
    this.tableService.selectTable(tableName);
  }

  protected addNewTable() {
    this.updatedTable = null;
    this.updatedTableMode = 'add';
    this.visibleTableEditorDrawer = true;
  }

  protected editTable(table: TableDefinition) {
    this.updatedTable = table;
    this.updatedTableMode = 'edit';
    this.visibleTableEditorDrawer = true;
  }

  protected deleteTable(table: TableDefinition) {
    this.tableToConfirm = table.name;
    this.tableToDelete = '';
    this.isCascadeDeleteEnabled = false;
    this.confirmationService.confirm({
      target: null,
      message: `Are you sure you want to delete "${table.presentation?.uiName || table.name}"?`,
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
      accept: async () => {
        if (this.tableToDelete !== this.tableToConfirm) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Table name confirmation does not match.',
            life: 3000,
          });
          return;
        }
        this.isLoading.set(true);
        try {
          await this.tableService.deleteTable(this.tableToConfirm, this.isCascadeDeleteEnabled);
          this.refreshTables();
        } catch (err) {
          console.error('Failed to delete table', err);
        } finally {
          this.isLoading.set(false);
          this.isCascadeDeleteEnabled = false;
        }
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
    this.getTables(savedTable.name);
  }

  private async getTables(tableNameWillSelect?: string) {
    this.isLoading.set(true);
    try {
      let tables = await this.tableService.getTables();
      const tableOrder = localStorage.getItem(TABLE_ORDER_KEY);
      if (tableOrder) {
        tables = tables.sort((a, b) => {
          const aIndex = tableOrder.indexOf(a.name);
          const bIndex = tableOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
      }
      this.tables.set(tables);
      this.filteredTables.set(tables);
      this.searchQuery = '';

      this.selectTable(
        tableNameWillSelect ||
          this.tableService.selectedTables()[0]?.name ||
          this.tables()[0]?.name,
      );
    } catch (err) {
      console.error('Failed to fetch tables', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
