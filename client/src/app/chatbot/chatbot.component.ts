import {
  Component,
  signal,
  effect,
  viewChild,
  ElementRef,
  DestroyRef,
  ChangeDetectionStrategy,
  output,
  input,
} from '@angular/core';
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
  templateUrl: './chatbot.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
})
export class AppChatBot {
  visible = input(false);

  fullscreen = output<boolean>();
  onClose = output<void>();

  messages = signal<Message[]>([]);
  inputText = signal('');
  isTyping = signal(false);
  isStreaming = signal(false);

  protected isFullscreen = false;

  private scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  private editor = viewChild<ElementRef>('editor');

  constructor(
    private destroyRef: DestroyRef,
    private agentService: AgentService,
  ) {
    effect(() => {
      if (this.messages().length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    effect(() => {
      if (this.visible()) {
        setTimeout(() => {
          this.scrollToBottom();
          this.editor()!.nativeElement.focus();
        }, 100);
      }
    });
  }

  scrollToBottom() {
    this.scrollContainer()!.scrollTop(999999);
  }

  protected toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    this.fullscreen.emit(this.isFullscreen);
  }

  protected closeChatbot() {
    this.isFullscreen = false;
    this.fullscreen.emit(this.isFullscreen);
    this.onClose.emit();
  }

  protected startNewChat() {
    this.messages.set([]);
    this.inputText.set('');
    this.editor()!.nativeElement.innerHTML = '';
    this.editor()!.nativeElement.focus();
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
        if (event.type === HttpEventType.DownloadProgress) {
          const progressEvent = event as HttpDownloadProgressEvent;
          message.content = progressEvent.partialText || '';
          this.messages.update((m) => [...m]);
        } else if (event.type === HttpEventType.Response) {
          message.content = event.body as string;
          this.messages.update((m) => [...m]);
          this.isStreaming.set(false);
        }
        this.isTyping.set(false);
      });
  }

  protected onInput(event: InputEvent) {
    const target: any = event.target;

    const text = target.innerText;
    this.inputText.set(text);

    const trimmed = target.innerText.trim();
    if (trimmed === '') target.innerText = '';
  }

  protected onEnter(event: KeyboardEvent) {
    if (!event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
