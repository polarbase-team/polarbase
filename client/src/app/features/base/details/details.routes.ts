import { Routes } from '@angular/router';

import { IndexManagementComponent } from './indexes/index-management.component';
import { ApiKeyManagementComponent } from './api-keys/api-key-management.component';

export const routes: Routes = [
  {
    path: 'indexes',
    component: IndexManagementComponent,
    data: { shouldReuse: true },
  },
  {
    path: 'api-keys',
    component: ApiKeyManagementComponent,
    data: { shouldReuse: true },
  },
  {
    path: '',
    redirectTo: 'indexes',
    pathMatch: 'full',
  },
];
