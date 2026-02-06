import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  isLoading = signal(false);

  private activeRequests = 0;

  setLoading(loading: boolean) {
    if (loading) {
      this.activeRequests++;
    } else {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
    }
    this.isLoading.set(this.activeRequests > 0);
  }
}
