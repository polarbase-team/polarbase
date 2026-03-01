import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { FluidModule } from 'primeng/fluid';

import { setApiKey } from '@app/core/guards/api-key.guard';
import { AuthService } from '../auth.service';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class LoginComponent {
  protected apiKey = '';
  protected loading = false;
  protected error = signal('');

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  async onSubmit() {
    const apiKey = this.apiKey.trim();

    this.loading = true;
    try {
      await this.authService.validate(apiKey);
      setApiKey(apiKey);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || err || 'Unknown error');
    } finally {
      this.loading = false;
    }
  }
}
