import { inject, Injectable } from '@angular/core';
import { CanMatch, Router, Route, UrlSegment } from '@angular/router';

export const hasApiKey = (): boolean => {
  return document.cookie.split(';').some((item) => item.trim().startsWith('apiKey='));
};

export const getApiKey = (): string | null => {
  const match = document.cookie.match(/(^|;) ?apiKey=([^;]*)(;|$)/);
  return match ? decodeURIComponent(match[2]) : null;
};

@Injectable({ providedIn: 'root' })
export class ApiKeyGuard implements CanMatch {
  private router = inject(Router);

  canMatch(_route: Route, _segments: UrlSegment[]): boolean {
    if (hasApiKey()) {
      return true;
    }
    this.router.navigate(['/']);
    return false;
  }
}
