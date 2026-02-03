import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, SlicePipe } from '@angular/common';
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

import { ApiKey, ApiKeyService } from './api-key.service';

const DEFAULT_VALUE = {
  scopes: {
    rest: true,
    agent: true,
    mcp: true,
    realtime: true,
  },
} as ApiKey;

@Component({
  selector: 'api-key-management',
  templateUrl: './api-key-management.component.html',
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
    DatePipe,
    SlicePipe,
  ],
  providers: [ConfirmationService, MessageService, ApiKeyService],
})
export class ApiKeyManagementComponent implements OnInit {
  // List
  protected apiKeys = signal<ApiKey[]>([]);
  protected filteredKeys = signal<ApiKey[]>([]);
  protected searchQuery: string = '';

  // Management
  protected apiKeyForm = viewChild<NgForm>('apiKeyForm');
  protected isSaving = signal(false);
  protected isDrawerVisible = false;
  protected activeApiKey: ApiKey = { ...DEFAULT_VALUE };
  protected isViewMode = signal(false);

  constructor(
    private destroyRef: DestroyRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private apiKeyService: ApiKeyService,
  ) {
    effect(() => {
      this.filteredKeys.set([...this.apiKeys()]);
      this.searchQuery = '';
    });
  }

  ngOnInit() {
    this.loadApiKeys();
  }

  protected onEditorOpen() {
    // No metadata to load for now
  }

  protected onEditorClose() {
    this.apiKeyForm()?.reset();
    this.activeApiKey = { ...DEFAULT_VALUE };
    this.isViewMode.set(false);
  }

  protected loadApiKeys() {
    this.apiKeyService
      .getKeys()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((apiKeys) => {
        this.apiKeys.set(apiKeys);
      });
  }

  protected viewApiKey(apiKey: ApiKey) {
    this.activeApiKey = { ...apiKey };
    this.isViewMode.set(true);
    this.isDrawerVisible = true;
  }

  protected searchByName() {
    const apiKeys = this.apiKeys();

    let query = this.searchQuery.trim();
    if (!query) {
      this.filteredKeys.set([...apiKeys]);
      return;
    }

    query = query.toLowerCase();
    this.filteredKeys.set(
      apiKeys.filter((key) => key.name.toLowerCase().includes(this.searchQuery.toLowerCase())),
    );
  }

  protected revokeKey(apiKey: ApiKey) {
    this.confirmationService.confirm({
      target: null,
      header: 'Revoke key',
      message: `Are you sure you want to revoke "${apiKey.name}"?`,
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Revoke',
        severity: 'danger',
      },
      accept: () => {
        this.apiKeyService.revokeKey(apiKey).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Key has been revoked',
            });
            this.apiKeys.update((arr) =>
              arr.map((key) => (key.id === apiKey.id ? { ...key, revoked: true } : key)),
            );
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not revoke key',
            });
          },
        });
      },
    });
  }

  protected onCopyKey() {
    this.messageService.add({
      severity: 'info',
      summary: 'Copied!',
      detail: 'API Key has been copied',
    });
  }

  protected onApiKeyFormSubmit() {
    this.isSaving.set(true);
    this.apiKeyService
      .createKey(this.activeApiKey)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isDrawerVisible = false;
        this.loadApiKeys();
      });
  }
}
