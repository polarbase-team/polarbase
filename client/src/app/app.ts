import { Component, signal } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

import { AppTableList } from './table/table-list/table-list.component';
import { AppTableDetail } from './table/table-detail/table-detail.component';
import { AppChatBot } from './chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  imports: [ToastModule, ButtonModule, AppTableList, AppTableDetail, AppChatBot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  sidebarVisible = signal<boolean>(true);
  chatbotVisible = signal<boolean>(false);
  chatbotFullscreen = signal<boolean>(false);

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi', '_blank');
  }
}
