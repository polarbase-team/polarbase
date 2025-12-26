import { ChangeDetectionStrategy, Component, DestroyRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

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
    private destroyRef: DestroyRef,
    private router: Router,
    private authService: AuthService,
  ) {}

  onSubmit() {
    const apiKey = this.apiKey.trim();

    this.loading = true;
    this.authService
      .validate(apiKey)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          setApiKey(apiKey);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.error.set(err || '');
        },
      });
  }
}
