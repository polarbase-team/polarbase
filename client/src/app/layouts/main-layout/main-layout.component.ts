import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ImageModule } from 'primeng/image';

import { removeApiKey } from '../../core/guards/api-key.guard';
import { ChatBotComponent } from '../../features/chatbot/chatbot.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  standalone: true,
  imports: [RouterModule, ToastModule, ButtonModule, TooltipModule, ImageModule, ChatBotComponent],
})
export class MainLayoutComponent {
  protected chatbotVisible = signal<boolean>(false);
  protected chatbotFullscreen = signal<boolean>(false);

  constructor(private router: Router) {}

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi', '_blank');
  }

  protected logout() {
    removeApiKey();
    this.router.navigate(['/entry']);
  }
}
