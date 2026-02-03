import { Routes } from '@angular/router';

import { ApiKeyManagementComponent } from './api-keys/api-key-management.component';

export const routes: Routes = [
  {
    path: 'api-keys',
    component: ApiKeyManagementComponent,
    data: { shouldReuse: true },
  },
];
