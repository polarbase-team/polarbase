import {
  Component,
  signal,
  effect,
  viewChild,
  ElementRef,
  DestroyRef,
  output,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ImageModule } from 'primeng/image';
import { SafeHtmlPipe } from 'primeng/menu';

import { AgentService, ChatMessage, StreamEvent } from './agent.service';

@Component({
  selector: 'chatbot',
  templateUrl: './chatbot.component.html',
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
export class ChatBotComponent {
  visible = input(false);

  fullscreen = output<boolean>();
  onClose = output<void>();

  protected messages = signal<ChatMessage[]>([]);
  protected isTyping = signal(false);
  protected isStreaming = signal(false);
  protected callingTool = signal('');
  protected inputText = '';
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
          this.editor().nativeElement.focus();
        }, 100);
      }
    });
  }

  scrollToBottom() {
    this.scrollContainer().scrollTop(999999);
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
    this.inputText = this.editor().nativeElement.innerHTML = '';
    this.editor().nativeElement.focus();
  }

  protected sendMessage() {
    const text = this.inputText;
    if (!text) return;

    this.inputText = this.editor().nativeElement.innerHTML = '';

    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    const messages = [...this.messages(), userMessage];
    this.messages.set(messages);
    this.scrollToBottom();

    this.isTyping.set(true);
    this.isStreaming.set(true);

    const botMessage: ChatMessage = { role: 'assistant', content: '', timestamp: new Date() };
    this.agentService
      .chat(this.messages())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events: StreamEvent[]) => {
          if (!events.length) return;

          this.isTyping.set(false);

          events.forEach((event) => {
            if (event.type === 'text') {
              botMessage.content += event.value;
              this.messages.set([...messages, botMessage]);
              this.scrollToBottom();
            } else if (event.type === 'tool') {
              this.callingTool.set(event.value);
            }
          });
        },
        complete: () => {
          this.isTyping.set(false);
          this.isStreaming.set(false);
          this.callingTool.set('');
        },
      });
  }

  protected onInput(event: InputEvent) {
    const target: any = event.target;

    const trimmed = target.innerText.trim();
    if (trimmed === '') target.innerText = '';

    this.inputText = trimmed;
  }

  protected onEnter(event: KeyboardEvent) {
    if (!event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
