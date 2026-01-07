import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { environment } from '@environments/environment';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
})
export class AuthLayoutComponent {
  protected readonly appVersion = environment.version;
}
