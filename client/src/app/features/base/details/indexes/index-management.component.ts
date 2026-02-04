import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { finalize } from 'rxjs';

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

import { ColumnDefinition, TableService } from '../../studio/table/services/table.service';
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
  protected tables = computed(() => this.tableService.tables());
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
    private destroyRef: DestroyRef,
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

  protected loadIndexes() {
    this.indexService
      .getIndexes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((indexes) => {
        this.indexes.set(indexes);
      });
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
      accept: () => {
        this.indexService.deleteIndex(index).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Index has been deleted',
            });
            this.indexes.update((arr) => arr.filter((key) => key.name !== index.name));
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not delete index',
            });
          },
        });
      },
    });
  }

  protected onEditorOpen() {
    this.tableService.getTables().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected onEditorClose() {
    this.indexForm()?.reset();
    this.activeIndex = { ...DEFAULT_VALUE };
    this.isViewMode.set(false);
    this.columns.set([]);
  }

  protected onTableChange() {
    const tableName = this.activeIndex.tableName;
    if (!tableName) {
      this.columns.set([]);
      return;
    }

    this.tableService
      .getTableSchema(tableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((columns) => {
        this.columns.set(columns);
      });
  }

  protected onIndexFormSubmit() {
    this.isSaving.set(true);
    this.indexService
      .createIndex(this.activeIndex)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isDrawerVisible = false;
        this.loadIndexes();
      });
  }
}
