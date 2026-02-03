import { Routes } from '@angular/router';

import { ApiKeyManagementComponent } from './api-keys/api-key-manangement/api-key-manangement.component';

export const routes: Routes = [
  {
    path: 'api-keys',
    component: ApiKeyManagementComponent,
    data: { shouldReuse: true },
  },
];
