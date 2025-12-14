import { inject, Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';

export const hasApiKey = (): boolean => {
  return document.cookie.split(';').some((item) => item.trim().startsWith('apiKey='));
};

export const getApiKey = (): string | null => {
  const match = document.cookie.match(/(^|;) ?apiKey=([^;]*)(;|$)/);
  return match ? decodeURIComponent(match[2]) : null;
};

export const setApiKey = (key: string) => {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `apiKey=${encodeURIComponent(key)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

@Injectable({ providedIn: 'root' })
export class ApiKeyGuard implements CanActivate {
  private router = inject(Router);

  canActivate() {
    if (hasApiKey()) {
      return true;
    }
    this.router.navigate(['/entry']);
    return false;
  }
}
