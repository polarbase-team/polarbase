import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ImageModule } from 'primeng/image';

import { ChatBotComponent } from '../../features/chatbot/chatbot.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, ToastModule, ButtonModule, TooltipModule, ImageModule, ChatBotComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  standalone: true,
})
export class MainLayoutComponent {
  protected chatbotVisible = signal<boolean>(false);
  protected chatbotFullscreen = signal<boolean>(false);

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi', '_blank');
  }
}
