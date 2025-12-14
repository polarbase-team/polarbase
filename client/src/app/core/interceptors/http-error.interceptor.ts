import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError(({ error }: HttpErrorResponse) => {
      console.log(error);
      // Show toast notification
      messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error || 'An unknown error occurred',
        life: 6000,
      });

      // Re-throw the error so components can still handle it if needed
      return throwError(() => error);
    }),
  );
};
