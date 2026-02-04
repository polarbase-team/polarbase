import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, mergeMap, of, startWith } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { removeApiKey } from '../../core/guards/api-key.guard';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ToastModule, ImageModule, TooltipModule],
})
export class MainLayoutComponent implements OnInit {
  protected title = signal('');

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.route),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.title || of('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((title) => {
        this.title.set(title);
      });
  }

  protected reload() {
    window.location.href = '/';
  }

  protected openGitHub() {
    window.open('https://github.com/polarbase-team/polarbase', '_blank');
  }

  protected logout() {
    removeApiKey();
    this.router.navigate(['/auth/login']);
  }
}
