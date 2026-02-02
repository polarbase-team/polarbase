import { Routes } from '@angular/router';

import { ApiKeyGuard } from './core/guards/api-key.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ApiKeyManagementComponent } from './features/api-keys/api-key-manangement/api-key-manangement.component';
import { BaseComponent } from './features/base/base.component';
import { routes as BaseRoutes } from './features/base/base.routes';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [{ path: 'login', component: LoginComponent }],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [ApiKeyGuard],
    children: [
      { path: 'base', component: BaseComponent, title: 'Base', children: BaseRoutes },
      { path: 'api-keys', component: ApiKeyManagementComponent, title: 'Api Keys' },
      { path: '**', redirectTo: '/base' },
    ],
  },
  { path: '**', redirectTo: '' },
];
