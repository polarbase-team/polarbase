import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ButtonModule } from 'primeng/button';

import { environment } from '@environments/environment';

import { TopbarComponent } from '@app/core/components/topbar/topbar.component';
import { BaseStudioComponent } from './studio/studio.component';

@Component({
  selector: 'base',
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TopbarComponent, BaseStudioComponent],
})
export class BaseComponent {
  protected openAPIDocs() {
    window.open(`${environment.apiUrl}/rest/openapi`, '_blank');
  }
}
