import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';

import { environment } from '@environments/environment';

import { TopbarComponent } from '@app/core/components/topbar/topbar.component';
import { AgentService } from './studio/chatbot/agent.service';

@Component({
  selector: 'base',
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, FormsModule, ButtonModule, SelectButtonModule, TopbarComponent],
  providers: [AgentService],
})
export class BaseComponent {
  protected view = computed(() => this.router.url.split('?')[0].split('/')[2]);
  protected options = [
    {
      label: 'Studio',
      icon: 'icon icon-layout-grid',
      value: 'studio',
      routerLink: '/base/studio',
    },
    {
      label: 'Details',
      icon: 'icon icon-sliders-horizontal',
      value: 'details',
      routerLink: '/base/details',
    },
  ];

  constructor(
    private router: Router,
    private agentService: AgentService,
  ) {}

  protected openAPIDocs() {
    window.open(`${environment.apiUrl}/rest/openapi`, '_blank');
  }

  protected toggleChatbot() {
    this.agentService.openAIChatbot.update((v) => !v);
  }
}
