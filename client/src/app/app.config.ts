import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { definePreset, palette } from '@primeuix/themes';

import { httpApiKeyInterceptor } from './http-api-key.interceptor';
import { httpErrorInterceptor } from './http-error.interceptor';
import { routes } from './app.routes';

const AuraSky = definePreset(Aura, {
  semantic: {
    primary: palette('{sky}'), // Use the 'sky' palette
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpApiKeyInterceptor, httpErrorInterceptor])),
    providePrimeNG({
      theme: {
        preset: AuraSky,
        options: {
          darkModeSelector: false,
        },
      },
    }),
    MessageService,
    provideRouter(routes),
  ],
};
