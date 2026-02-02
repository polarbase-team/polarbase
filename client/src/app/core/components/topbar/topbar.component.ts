import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'topbar',
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {}
