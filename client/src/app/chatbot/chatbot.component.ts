import { Component, signal, effect, viewChild, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpDownloadProgressEvent, HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ImageModule } from 'primeng/image';
import { SafeHtmlPipe } from 'primeng/menu';

import { AgentService } from './agent.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ScrollPanelModule,
    ProgressSpinnerModule,
    ImageModule,
    SafeHtmlPipe,
  ],
  providers: [AgentService],
  templateUrl: './chatbot.component.html',
})
export class AppChatBot {
  messages = signal<Message[]>([]);

  inputText = signal('');
  isTyping = signal(false);
  isStreaming = signal(false);

  private scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  private editor = viewChild<ElementRef>('editor');

  constructor(
    private destroyRef: DestroyRef,
    private agentService: AgentService,
  ) {
    effect(() => {
      this.messages();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  scrollToBottom() {
    this.scrollContainer()!.scrollTop(999999);
  }

  protected sendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

    this.messages.update((m) => [...m, { role: 'user', content: text, timestamp: new Date() }]);
    this.editor()!.nativeElement.innerHTML = '';
    this.inputText.set('');
    this.isTyping.set(true);
    this.isStreaming.set(true);
    this.scrollToBottom();

    const message: Message = { role: 'assistant', content: '', timestamp: new Date() };
    this.messages.update((m) => [...m, message]);
    this.agentService
      .chat(text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.isTyping.set(false);

        if (event.type === HttpEventType.DownloadProgress) {
          const progressEvent = event as HttpDownloadProgressEvent;
          message.content = progressEvent.partialText || '';
          this.messages.update((m) => [...m]);
        } else if (event.type === HttpEventType.Response) {
          message.content = event.body as string;
          this.messages.update((m) => [...m]);
          this.isStreaming.set(true);
        }
      });
  }

  protected onInput(event: InputEvent) {
    const target: any = event.target;

    const text = target.innerHTML;
    this.inputText.set(text);

    const trimmed = target.innerText.trim();
    if (trimmed === '') target.innerHTML = '';
  }

  protected onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
