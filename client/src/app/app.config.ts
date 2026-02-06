import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { definePreset, palette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { httpApiKeyInterceptor } from './core/interceptors/http-api-key.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { provideCustomRouteReuseStrategy } from './core/strategies/custom-route-reuse.strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([loadingInterceptor, httpApiKeyInterceptor, httpErrorInterceptor]),
    ),

    // PrimeNG UI Library
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: palette('{cyan}'),
          },
        }),
        options: {
          darkModeSelector: false,
        },
      },
    }),

    // Route Reuse Strategy
    provideCustomRouteReuseStrategy(),
    provideRouter(routes),

    // Global Services
    MessageService,
  ],
};
