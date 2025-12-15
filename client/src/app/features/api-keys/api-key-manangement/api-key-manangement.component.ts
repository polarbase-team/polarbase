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

import { ApiKey, ApiKeyService } from '../api-key.service';
import { DrawerModule } from 'primeng/drawer';
import { AutoFocusModule } from 'primeng/autofocus';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';
import { Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'app-api-key-management',
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
    DatePipe,
    SlicePipe,
    Tooltip,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ApiKeyManagementComponent implements OnInit {
  // List
  protected apiKeys = signal<ApiKey[]>([]);
  protected filteredKeys = signal<ApiKey[]>([]);
  protected searchQuery: string = '';

  // Creation
  protected apiKeyForm = viewChild<NgForm>('apiKeyForm');
  protected isCreating = signal(false);
  protected isCreationMode = false;
  protected newApiKey: ApiKey = {
    scopes: { rest: true, agent: true, mcp: true, realtime: true },
  } as ApiKey;

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

  protected loadApiKeys() {
    this.apiKeyService
      .getKeys()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((apiKeys) => {
        this.apiKeys.set(apiKeys);
      });
  }

  protected searchByName() {
    if (!this.searchQuery.trim()) {
      this.filteredKeys.set([...this.apiKeys()]);
    } else {
      this.filteredKeys.set(
        this.apiKeys().filter((key) =>
          key.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
        ),
      );
    }
  }

  protected revokeKey(apiKey: ApiKey) {
    this.confirmationService.confirm({
      target: null,
      header: 'Revoke key',
      message: `Are you sure you want to revoke the key "${apiKey.name}"?`,
      acceptLabel: 'Revoke',
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
    this.isCreating.set(true);
    this.apiKeyService
      .createKey(this.newApiKey)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((apiKey) => {
        this.isCreationMode = false;
        this.loadApiKeys();
      });
  }
}
