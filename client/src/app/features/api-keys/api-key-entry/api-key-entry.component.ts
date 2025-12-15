import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { FluidModule } from 'primeng/fluid';

import { setApiKey } from '../../../core/guards/api-key.guard';

@Component({
  selector: 'api-key-entry',
  templateUrl: './api-key-entry.component.html',
  imports: [
    FormsModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    FluidModule,
  ],
})
export class ApiKeyEntryComponent {
  protected apiKey = '';
  protected loading = false;

  constructor(private router: Router) {}

  save() {
    const key = this.apiKey.trim();

    this.loading = true;

    setApiKey(key);

    this.router.navigate(['/']);
  }
}
