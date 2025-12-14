import { Routes } from '@angular/router';

import { ApiKeyGuard } from './core/guards/api-key.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { ApiKeyEntryComponent } from './features/api-keys/api-key-entry/api-key-entry.component';
import { BaseComponent } from './features/base/base.component';

export const routes: Routes = [
  {
    path: 'entry',
    component: AuthLayoutComponent,
    children: [{ path: '', component: ApiKeyEntryComponent }],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [ApiKeyGuard],
    children: [
      { path: 'base', component: BaseComponent },
      { path: '**', redirectTo: '/base' },
    ],
  },
  { path: '**', redirectTo: '' },
];
