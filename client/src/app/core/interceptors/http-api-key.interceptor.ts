import { HttpInterceptorFn } from '@angular/common/http';

import { getApiKey } from '../guards/api-key.guard';

export const httpApiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = getApiKey();

  if (apiKey) {
    const modifiedReq = req.clone({
      headers: req.headers.set('x-api-key', apiKey),
    });
    return next(modifiedReq);
  }

  return next(req);
};
