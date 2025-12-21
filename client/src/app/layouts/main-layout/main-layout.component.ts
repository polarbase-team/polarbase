import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, mergeMap, startWith } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ImageModule } from 'primeng/image';

import { environment } from '@environments/environment';

import { removeApiKey } from '../../core/guards/api-key.guard';
import { ChatBotComponent } from '../../features/chatbot/chatbot.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ToastModule, ButtonModule, TooltipModule, ImageModule, ChatBotComponent],
})
export class MainLayoutComponent implements OnInit {
  protected chatbotVisible = signal<boolean>(false);
  protected chatbotFullscreen = signal<boolean>(false);
  protected title = signal<string>('');

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
        mergeMap((route) => route.title),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((title) => {
        this.title.set(title);
      });
  }

  protected reload() {
    window.location.href = '/';
  }

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected openAPIDocs() {
    window.open(`${environment.apiUrl}/rest/openapi`, '_blank');
  }

  protected logout() {
    removeApiKey();
    this.router.navigate(['/entry']);
  }
}
