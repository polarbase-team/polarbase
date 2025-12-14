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

@Component({
  selector: 'app-api-key-entry',
  standalone: true,
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
  templateUrl: './api-key-entry.component.html',
})
export class ApiKeyEntryComponent {
  apiKey = '';
  loading = false;

  constructor(private router: Router) {}

  save() {
    const key = this.apiKey.trim();

    this.loading = true;

    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10);
    document.cookie = `apiKey=${encodeURIComponent(key)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    this.router.navigate(['/']);
  }
}
