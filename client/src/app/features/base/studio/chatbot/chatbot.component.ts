import {
  Component,
  signal,
  effect,
  computed,
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
import { MenuModule } from 'primeng/menu';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';

import { TableService } from '../table/services/table.service';
import { MarkdownPipe } from './pipes/markdown.pipe';
import { AgentService, ChatMessage, StreamEvent } from './services/agent.service';
import { models } from './resources/models';
import { promptTemplates } from './resources/prompt-templates';

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
    MenuModule,
    ContextMenuModule,
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
  protected readonly promptTemplates = promptTemplates;
  protected mentionMenuItems: MenuItem[];
  protected selectedModel = 'default';
  protected selectedModelLabel = 'Default';
  protected modelMenuItems: MenuItem[] = models.map((opt) => ({
    label: opt.label,
    command: () => {
      this.selectedModel = opt.value;
      this.selectedModelLabel = opt.label;
    },
  }));

  private scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  private editor = viewChild<ElementRef>('editor');
  private mentionContextMenu = viewChild<ContextMenu>('mentionContextMenu');

  constructor(
    private destroyRef: DestroyRef,
    private agentService: AgentService,
    private tableService: TableService,
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

    if (target.innerText.endsWith('@')) {
      setTimeout(() => this.showMentionContextMenuAtCaret(), 0);
    }
  }

  protected onEnter(event: KeyboardEvent) {
    if (!event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected onEditorContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.mentionContextMenu()?.show(event);
  }

  protected onMentionContextMenuShow() {
    this.mentionMenuItems = this.tableService.tables().map((table) => ({
      label: table.presentation?.uiName ?? table.name,
      icon: 'icon icon-table-2',
      command: () => this.insertTableMention(table.name),
    }));
  }

  private showMentionContextMenu() {
    const el = this.editor()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: rect.left,
      clientY: rect.bottom - 4,
    });
    this.mentionContextMenu()?.show(ev);
  }

  private showMentionContextMenuAtCaret() {
    const el = this.editor()?.nativeElement;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.showMentionContextMenu();
      return;
    }
    const ev = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: rect.left,
      clientY: rect.bottom + 2,
    });
    this.mentionContextMenu()?.show(ev);
  }

  private insertTableMention(tableName: string) {
    const el = this.editor()?.nativeElement;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;
    if (
      node.nodeType === Node.TEXT_NODE &&
      offset > 0 &&
      node.textContent?.charAt(offset - 1) === '@'
    ) {
      range.setStart(node, offset - 1);
      range.setEnd(node, offset);
      range.deleteContents();
    }
    range.insertNode(document.createTextNode(`@${tableName} `));
    range.collapse(false);
    this.onInput({ target: el } as InputEvent);
  }
}
