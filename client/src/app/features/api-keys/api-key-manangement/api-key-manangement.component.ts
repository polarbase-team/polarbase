import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-api-key-management',
  templateUrl: './api-key-management.component.html',
  standalone: true,
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
    DatePipe,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ApiKeyManagementComponent implements OnInit {
  apiKeys: ApiKey[] = [];
  filteredKeys: ApiKey[] = [];
  searchValue: string = '';
  protected isLoading = signal(true);

  constructor(
    private destroyRef: DestroyRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private apiKeyService: ApiKeyService,
  ) {}

  ngOnInit() {
    this.loadApiKeys();
  }

  protected loadApiKeys() {
    this.isLoading.set(true);
    this.apiKeyService
      .getKeys()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((apiKeys) => {
        this.apiKeys = apiKeys;
      });
  }

  protected searchByName() {
    if (!this.searchValue.trim()) {
      this.filteredKeys = this.apiKeys;
    } else {
      this.filteredKeys = this.apiKeys.filter((key) =>
        key.name.toLowerCase().includes(this.searchValue.toLowerCase()),
      );
    }
  }

  protected revokeKey(event: Event, apiKey: ApiKey) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to revoke the key "${apiKey.name}"?`,
      icon: 'icon icon-exclamation-triangle',
      acceptLabel: 'Revoke',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.apiKeyService.revokeKey(apiKey).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Key has been revoked',
            });
            this.apiKeys.push(apiKey);
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
}
