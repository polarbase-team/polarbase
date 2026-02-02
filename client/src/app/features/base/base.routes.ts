import { Routes } from '@angular/router';

import { BaseStudioComponent } from './studio/studio.component';
import { BaseDetailsComponent } from './details/details.component';

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
  },
  { path: '**', redirectTo: 'studio' },
];
