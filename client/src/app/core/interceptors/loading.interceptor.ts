import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip loading indicator for certain requests if needed
  if (req.headers.has('X-Skip-Loading')) {
    return next(req);
  }

  loadingService.setLoading(true);

  return next(req).pipe(
    finalize(() => {
      loadingService.setLoading(false);
    }),
  );
};
