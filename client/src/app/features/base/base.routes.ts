import { Routes } from '@angular/router';

import { BaseStudioComponent } from './studio/studio.component';
import { BaseDetailsComponent } from './details/details.component';
import { routes as DetailRoutes } from './details/details.routes';

export const routes: Routes = [
  {
    path: 'studio',
    component: BaseStudioComponent,
    data: { shouldReuse: true },
  },
  {
    path: 'details',
    component: BaseDetailsComponent,
    data: { shouldReuse: true },
    children: DetailRoutes,
  },
  { path: '**', redirectTo: 'studio' },
];
