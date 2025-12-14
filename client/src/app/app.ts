import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { ChatBotComponent } from './chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ToastModule, ButtonModule, TooltipModule, ChatBotComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  protected chatbotVisible = signal<boolean>(false);
  protected chatbotFullscreen = signal<boolean>(false);

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi', '_blank');
  }
}
