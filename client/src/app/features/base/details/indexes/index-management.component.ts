import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';
import { AutoFocusModule } from 'primeng/autofocus';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';

import {
  ColumnDefinition,
  TableDefinition,
  TableService,
} from '../../studio/table/services/table.service';
import { Index, IndexService } from './index.service';

const DEFAULT_VALUE = {
  type: 'btree',
} as Index;

@Component({
  selector: 'index-management',
  templateUrl: './index-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ClipboardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    DrawerModule,
    AutoFocusModule,
    MessageModule,
    DividerModule,
    CheckboxModule,
    TooltipModule,
    SelectModule,
    MultiSelectModule,
  ],
  providers: [ConfirmationService, MessageService, IndexService],
})
export class IndexManagementComponent implements OnInit {
  // List
  protected indexes = signal<Index[]>([]);
  protected filteredIndexes = signal<Index[]>([]);
  protected searchQuery: string = '';

  // Management
  protected indexForm = viewChild<NgForm>('indexForm');
  protected isSaving = signal(false);
  protected isDrawerVisible = false;
  protected activeIndex: Index = { ...DEFAULT_VALUE };
  protected isViewMode = signal(false);

  // Data
  protected tables = signal<TableDefinition[]>([]);
  protected columns = signal<ColumnDefinition[]>([]);
  protected indexTypes = [
    {
      label: 'B-Tree',
      value: 'btree',
      description: 'Default. Best for most common queries (equality and ranges).',
    },
    { label: 'Hash', value: 'hash', description: 'Fast equality matches only.' },
    {
      label: 'GiST',
      value: 'gist',
      description: 'Best for coordinates, ranges, and full-text search.',
    },
    {
      label: 'GIN',
      value: 'gin',
      description: 'Best for arrays, JSONB, and multi-value searches.',
    },
    {
      label: 'BRIN',
      value: 'brin',
      description: 'Efficient for massive tables sorted by time or sequence.',
    },
    {
      label: 'SP-GiST',
      value: 'spgist',
      description: 'Specialized for data like phone numbers or IP addresses.',
    },
  ];

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private tableService: TableService,
    private indexService: IndexService,
  ) {
    effect(() => {
      this.filteredIndexes.set([...this.indexes()]);
      this.searchQuery = '';
    });
  }

  ngOnInit() {
    this.loadIndexes();
  }

  protected async loadIndexes() {
    try {
      const indexes = await this.indexService.getIndexes();
      this.indexes.set(indexes);
    } catch (err) {
      console.error('Failed to load indexes', err);
    }
  }

  protected searchByName() {
    const indexes = this.indexes();

    let query = this.searchQuery.trim();
    if (!query) {
      this.filteredIndexes.set([...indexes]);
      return;
    }

    query = query.toLowerCase();
    this.filteredIndexes.set(
      indexes.filter((index) => index.name.toLowerCase().includes(this.searchQuery.toLowerCase())),
    );
  }

  protected viewIndex(index: Index) {
    this.activeIndex = { ...index };
    this.isViewMode.set(true);
    this.onTableChange();
    this.isDrawerVisible = true;
  }

  protected deleteIndex(index: Index) {
    this.confirmationService.confirm({
      target: null,
      header: 'Delete index',
      message: `Are you sure you want to delete "${index.name}"?`,
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
        try {
          await this.indexService.deleteIndex(index);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Index has been deleted',
          });
          this.indexes.update((arr) => arr.filter((key) => key.name !== index.name));
        } catch (err) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not delete index',
          });
        }
      },
    });
  }

  protected async onEditorOpen() {
    try {
      const tables = await this.tableService.getTables();
      this.tables.set(tables);
    } catch (err) {
      console.error('Failed to load tables', err);
    }
  }

  protected onEditorClose() {
    this.indexForm()?.reset();
    this.activeIndex = { ...DEFAULT_VALUE };
    this.isViewMode.set(false);
    this.columns.set([]);
  }

  protected async onTableChange() {
    const tableName = this.activeIndex.tableName;
    if (!tableName) {
      this.columns.set([]);
      return;
    }

    try {
      const columns = await this.tableService.getTableSchema(tableName);
      this.columns.set(columns);
    } catch (err) {
      console.error('Failed to load columns', err);
    }
  }

  protected async onIndexFormSubmit() {
    this.isSaving.set(true);
    try {
      await this.indexService.createIndex(this.activeIndex);
      this.isDrawerVisible = false;
      this.loadIndexes();
    } catch (err) {
      console.error('Failed to create index', err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
