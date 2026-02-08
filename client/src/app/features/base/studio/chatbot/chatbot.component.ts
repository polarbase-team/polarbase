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
import { TabsModule } from 'primeng/tabs';

import { MarkdownPipe } from './pipes/markdown.pipe';
import { AgentService, ChatMessage, StreamEvent } from './services/agent.service';

const setSelectionRangeCE = (element: HTMLElement, startOffset: number, endOffset: number) => {
  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();

  if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
    range.setStart(element.firstChild, startOffset);
    range.setEnd(element.firstChild, endOffset);
  } else {
    console.error('Content is complex. Cannot set selection with simple logic.');
    return;
  }

  selection.removeAllRanges();
  selection.addRange(range);
};

@Component({
  selector: 'chatbot',
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ScrollPanelModule,
    ProgressSpinnerModule,
    ImageModule,
    TabsModule,
    MarkdownPipe,
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
  protected promptTemplates = [
    {
      label: 'Structure',
      prompts: [
        'Build a table for sales leads',
        'Add a "Priority" column to my tasks',
        'Create a new database for my team',
      ],
    },
    {
      label: 'Manage',
      prompts: [
        'List all overdue invoices',
        'Add a new customer named Jane Doe',
        'Update my last order to "Paid"',
        'Remove all completed projects',
      ],
    },
  ];

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
          this.focus();
        }, 100);
      }
    });
  }

  scrollToBottom() {
    this.scrollContainer().scrollTop(999999);
  }

  focus() {
    const el = this.editor().nativeElement;
    el.focus();
    setSelectionRangeCE(el, el.innerText.length, el.innerText.length);
  }

  blur() {
    this.editor().nativeElement.blur();
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
    this.focus();
  }

  protected setPrompt(prompt: string) {
    const el = this.editor().nativeElement;
    el.innerHTML = this.inputText = prompt;
    this.focus();
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
    const target = event.target as HTMLElement;
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
