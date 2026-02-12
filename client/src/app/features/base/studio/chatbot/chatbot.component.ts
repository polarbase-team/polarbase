import {
  Component,
  signal,
  effect,
  viewChild,
  ElementRef,
  DestroyRef,
  output,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { ImageModule } from 'primeng/image';
import { TabsModule } from 'primeng/tabs';
import { MenuModule } from 'primeng/menu';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { PopoverModule } from 'primeng/popover';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';

import { TableService } from '../table/services/table.service';
import { MarkdownPipe } from './pipes/markdown.pipe';
import { AgentService, ChatMessage, StreamEvent } from './services/agent.service';
import { models } from './resources/models';
import { promptTemplates } from './resources/prompt-templates';

interface UserChatMessage extends ChatMessage {
  role: 'user';
  _selectedFiles?: File[];
}

interface AssistantChatMessage extends ChatMessage {
  role: 'assistant';
  _isGenerating?: boolean;
  _toolCallId?: string | null;
}

const CHATBOT_SELECTED_MODEL_KEY = 'chatbot_selected_model';
const CHATBOT_SUB_AGENTS_KEY = 'chatbot_sub_agents';
const CHATBOT_GENERATION_CONFIG_KEY = 'chatbot_generation_config';

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
    ImageModule,
    TabsModule,
    MenuModule,
    ContextMenuModule,
    PopoverModule,
    ToggleSwitchModule,
    InputNumberModule,
    DividerModule,
    MarkdownPipe,
  ],
  providers: [AgentService],
})
export class ChatBotComponent {
  visible = input(false);

  fullscreen = output<boolean>();
  onClose = output<void>();

  scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  editor = viewChild<ElementRef>('editor');
  mentionContextMenu = viewChild<ContextMenu>('mentionContextMenu');
  fileInput = viewChild<ElementRef>('fileInput');

  protected readonly promptTemplates = promptTemplates;
  protected messages = signal<ChatMessage[]>([]);
  protected selectedFiles = signal<File[]>([]);
  protected isDragging = signal(false);
  protected isStreaming = signal(false);
  protected inputText = '';
  protected isFullscreen = false;

  protected mentionMenuItems: MenuItem[];
  protected mentions: { tables: string[] } = { tables: [] };

  protected selectedModel: string;
  protected selectedModelLabel: string;
  protected modelMenuItems: MenuItem[] = [{ label: 'Default', value: undefined }, ...models].map(
    (opt) => ({
      label: opt.label,
      command: () => {
        this.selectedModel = opt.value;
        this.selectedModelLabel = opt.label;
        localStorage.setItem(
          CHATBOT_SELECTED_MODEL_KEY,
          JSON.stringify({ value: opt.value, label: opt.label }),
        );
      },
    }),
  );

  protected subAgents = {
    builder: true,
    editor: true,
    query: true,
  };

  protected generationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 2048,
  };

  private currentChatSubscription?: Subscription;

  constructor(
    private destroyRef: DestroyRef,
    private agentService: AgentService,
    private tableService: TableService,
  ) {
    const model = JSON.parse(localStorage.getItem(CHATBOT_SELECTED_MODEL_KEY) || '{}');
    this.selectedModel = model.value;
    this.selectedModelLabel = model.label;

    this.subAgents = {
      ...this.subAgents,
      ...JSON.parse(localStorage.getItem(CHATBOT_SUB_AGENTS_KEY) || '{}'),
    };
    this.generationConfig = {
      ...this.generationConfig,
      ...JSON.parse(localStorage.getItem(CHATBOT_GENERATION_CONFIG_KEY) || '{}'),
    };

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
    const el = this.editor()?.nativeElement;
    if (!el) return;
    this.focusEditorAtOffset(el.innerText.length);
  }

  blur() {
    const el = this.editor()?.nativeElement;
    if (!el) return;
    el.blur();
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
    const el = this.editor()?.nativeElement;
    if (!el) return;
    el.innerHTML = this.inputText = prompt;
    this.focus();
  }

  protected onFilesSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files) return;
    this.selectedFiles.set([...files]);
  }

  protected onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files?.length > 0) {
      this.selectedFiles.update((current) => [...current, ...Array.from(files)]);
    }
  }

  protected removeFile(file: File) {
    this.selectedFiles.update((files) => files.filter((f) => f !== file));
  }

  protected clearFiles() {
    this.selectedFiles.set([]);
    this.fileInput().nativeElement.value = '';
  }

  protected saveSubAgents() {
    localStorage.setItem(CHATBOT_SUB_AGENTS_KEY, JSON.stringify(this.subAgents));
  }

  protected saveGenerationConfig() {
    localStorage.setItem(CHATBOT_GENERATION_CONFIG_KEY, JSON.stringify(this.generationConfig));
  }

  protected sendMessage() {
    const text = this.inputText;
    if (!text) return;

    const attachments = this.selectedFiles();
    const mentions = this.mentions;
    const model = this.selectedModel;
    const subAgents = this.subAgents;
    const generationConfig = this.generationConfig;

    const userMessage: UserChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
      _selectedFiles: attachments,
    };
    const messages = [...this.messages(), userMessage];
    this.messages.set(messages);
    this.scrollToBottom();

    this.isStreaming.set(true);

    const botMessage: AssistantChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      _isGenerating: true,
      _toolCallId: null,
    };
    this.messages.update((prev) => [...prev, botMessage]);

    this.currentChatSubscription = this.agentService
      .chat({
        messages,
        attachments,
        mentions,
        model,
        subAgents,
        generationConfig,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events: StreamEvent[]) => {
          if (!events.length) return;

          botMessage._isGenerating = false;

          events.forEach((event) => {
            if (event.type === 'text') {
              botMessage.content += event.value;
              this.messages.update((messages) => [...messages]);
              this.scrollToBottom();
            } else if (event.type === 'tool') {
              botMessage._toolCallId = event.value;
              this.messages.update((messages) => [...messages]);
              this.scrollToBottom();
            }
          });
        },
        complete: () => {
          this.isStreaming.set(false);
          botMessage._isGenerating = false;
          botMessage._toolCallId = null;
          this.messages.update((messages) => [...messages]);
        },
      });

    this.inputText = this.editor().nativeElement.innerHTML = '';
    this.mentions = { tables: [] };
    this.clearFiles();
  }

  protected stopGeneration() {
    if (this.currentChatSubscription) {
      this.currentChatSubscription.unsubscribe();
      this.currentChatSubscription = undefined;
    }
    this.isStreaming.set(false);

    // Update the last message state
    const messages = this.messages();
    const lastMessage = messages[messages.length - 1] as AssistantChatMessage;
    if (lastMessage?.role === 'assistant') {
      if (lastMessage._isGenerating) {
        messages.pop();
      } else {
        lastMessage._isGenerating = false;
        lastMessage._toolCallId = null;
      }
      this.messages.set(messages);
    }
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
      command: () => {
        this.insertTableMention(table.name);
        this.mentions.tables.push(table.name);
      },
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

    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'mention-chip';
    mentionSpan.textContent = `@${tableName}`;
    mentionSpan.setAttribute('contenteditable', 'false');
    range.insertNode(mentionSpan);
    range.collapse(false);
    range.insertNode(document.createTextNode(' '));
    range.collapse(false);

    this.onInput({ target: el } as InputEvent);
  }

  private focusEditorAtOffset(offset: number) {
    const el = this.editor()?.nativeElement;
    if (!el) return;

    el.focus();

    const range = document.createRange();
    const selection = window.getSelection();
    if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
      range.setStart(el.firstChild, offset);
      range.setEnd(el.firstChild, offset);
    } else {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
