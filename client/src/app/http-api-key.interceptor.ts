import { HttpInterceptorFn } from '@angular/common/http';

export const httpApiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = 'my-api-key';

  const modifiedReq = req.clone({
    headers: req.headers.set('x-api-key', apiKey),
  });

  return next(modifiedReq);
};
