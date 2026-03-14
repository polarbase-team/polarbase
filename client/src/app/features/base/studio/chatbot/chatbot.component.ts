import {
  Component,
  signal,
  effect,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
  model,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { TooltipModule } from 'primeng/tooltip';

import { TableService } from '../table/services/table.service';
import { MarkdownPipe } from './pipes/markdown.pipe';
import { AgentService, ChatMessage, Model, StreamEvent } from './services/agent.service';
import { modelGroups } from './resources/models';
import { promptTemplates } from './resources/prompt-templates';

interface UserChatMessage extends ChatMessage {
  role: 'user';
  _selectedFiles?: File[];
}

interface TextPart {
  type: 'text';
  content: string;
}

interface ReasoningPart {
  type: 'reasoning';
  content: string;
  expanded?: boolean;
}

interface ToolInvocationPart {
  type: 'tool-invocation';
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  expanded?: boolean;
}

interface AssistantChatMessage extends ChatMessage {
  role: 'assistant';
  _parts: (TextPart | ReasoningPart | ToolInvocationPart)[];
  _isGenerating?: boolean;
  _isStreaming?: boolean;
}

interface Session {
  id: string;
  title: string;
}

const CHATBOT_SELECTED_MODEL_KEY = 'chatbot_selected_model';
const CHATBOT_AGENTS_KEY = 'chatbot_agents';
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
    TooltipModule,
    MarkdownPipe,
  ],
  providers: [AgentService],
})
export class ChatBotComponent {
  visible = model(false);
  fullscreen = model(false);

  scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  editor = viewChild<ElementRef>('editor');
  mentionContextMenu = viewChild<ContextMenu>('mentionContextMenu');
  fileInput = viewChild<ElementRef>('fileInput');

  protected readonly promptTemplates = promptTemplates;
  protected title = signal('');
  protected messages = signal<ChatMessage[]>([]);
  protected currentSessionId = signal<string>(crypto.randomUUID());
  protected selectedFiles = signal<File[]>([]);
  protected isDragging = signal(false);
  protected isChatting = signal(false);
  protected inputText = '';

  protected sessions = signal<Session[]>([]);
  protected sessionMenuItems = signal<MenuItem[]>([]);

  protected mentions: { tables: string[] } = { tables: [] };
  protected mentionMenuItems: MenuItem[];

  protected selectedModel: Model | undefined;
  protected selectedModelLabel: string;
  protected modelMenuItems: MenuItem[] = [
    {
      label: 'Models',
      items: [
        {
          label: 'Default',
          command: () => {
            this.selectedModel = undefined;
            this.selectedModelLabel = 'Default';
            localStorage.removeItem(CHATBOT_SELECTED_MODEL_KEY);
          },
        },
      ],
    },
    ...modelGroups.map((group) => ({
      label: group.label,
      items: group.items.map((opt) => ({
        label: opt.label,
        disabled: opt.disabled,
        command: () => {
          this.selectedModel = opt.value;
          this.selectedModelLabel = opt.label;
          localStorage.setItem(
            CHATBOT_SELECTED_MODEL_KEY,
            JSON.stringify({ value: opt.value, label: opt.label }),
          );
        },
      })),
    })),
  ];

  protected agents = {
    database: {
      builder: true,
      editor: true,
      query: true,
    },
    browser: true,
    fetchApi: true,
  };

  protected generationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 2048,
  };

  private currentChatAbortController?: AbortController;

  constructor(
    private agentService: AgentService,
    private tableService: TableService,
  ) {
    const model = JSON.parse(localStorage.getItem(CHATBOT_SELECTED_MODEL_KEY) || '{}');
    this.selectedModel = model.value;
    this.selectedModelLabel = model.label;

    const savedAgents = JSON.parse(localStorage.getItem(CHATBOT_AGENTS_KEY) || '{}');
    this.agents = {
      database: {
        builder: savedAgents.database?.builder ?? this.agents.database.builder,
        editor: savedAgents.database?.editor ?? this.agents.database.editor,
        query: savedAgents.database?.query ?? this.agents.database.query,
      },
      browser: savedAgents.browser ?? this.agents.browser,
      fetchApi: savedAgents.fetchApi ?? this.agents.fetchApi,
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

    effect(
      () => {
        this.sessionMenuItems.set([
          {
            label: 'Past Conversations',
            items:
              this.sessions().length > 0
                ? this.sessions().map((s) => ({
                    label: s.title,
                    icon: 'icon icon-message-square',
                    command: () => {
                      this.title.set(s.title);
                      this.loadHistory(s.id);
                    },
                    data: {
                      sessionId: s.id,
                      delete: () => this.deleteSession(s.id),
                    },
                  }))
                : [{ label: 'No items available', disabled: true }],
          },
        ]);
      },
      { allowSignalWrites: true },
    );
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

  reset() {
    this.isChatting.set(false);
    this.messages.set([]);
    this.inputText = this.editor().nativeElement.innerHTML = '';
    this.mentions = { tables: [] };
    this.clearFiles();
  }

  protected toggleFullscreen() {
    this.fullscreen.update((v) => !v);
  }

  protected closeChatbot() {
    this.fullscreen.set(false);
    this.visible.set(false);
  }

  protected startNewChat() {
    const newId = crypto.randomUUID();
    this.currentSessionId.set(newId);
    this.reset();
    this.focus();
  }

  protected async loadHistory(sessionId: string) {
    try {
      const history = await this.agentService.getHistory(sessionId);
      this.messages.set(history);
      setTimeout(() => this.scrollToBottom(), 100);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }

  protected async loadSessions() {
    try {
      const sessions = await this.agentService.getSessions();
      this.sessions.set(sessions);
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  }

  protected async deleteSession(sessionId: string) {
    try {
      await this.agentService.deleteSession(sessionId);
      if (this.currentSessionId() === sessionId) {
        this.startNewChat();
      } else {
        this.sessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
      }
    } catch (e) {
      console.error('Failed to delete session', e);
    }
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

  protected saveAgents() {
    localStorage.setItem(CHATBOT_AGENTS_KEY, JSON.stringify(this.agents));
  }

  protected saveGenerationConfig() {
    localStorage.setItem(CHATBOT_GENERATION_CONFIG_KEY, JSON.stringify(this.generationConfig));
  }

  protected sendMessage() {
    const text = this.inputText;
    if (!text) return;

    const userMessage: UserChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
      _selectedFiles: this.selectedFiles(),
    };
    this.startChat(userMessage);

    this.inputText = this.editor().nativeElement.innerHTML = '';
    this.mentions = { tables: [] };
    this.clearFiles();
  }

  protected retryMessage(msg: ChatMessage) {
    const index = this.messages().indexOf(msg);
    if (index !== -1) {
      this.messages.update((messages) => messages.slice(0, index));
      const userMessage = msg as UserChatMessage;
      this.startChat(userMessage);
    }
  }

  protected copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  private async startChat(message: ChatMessage) {
    this.isChatting.set(true);

    const messages = [...this.messages(), message];
    this.messages.set(messages);

    const botMessage: AssistantChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      _parts: [],
      _isGenerating: true,
      _isStreaming: false,
    };
    this.messages.set([...messages, botMessage]);

    this.currentChatAbortController = new AbortController();

    try {
      await this.agentService.chat({
        messages: messages.reduce((acc, msg) => {
          acc.push({
            role: msg.role,
            content: msg.content,
          });
          return acc;
        }, [] as ChatMessage[]),
        sessionId: this.currentSessionId(),
        attachments: this.selectedFiles(),
        mentions: this.mentions,
        model: this.selectedModel,
        agents: this.agents,
        generationConfig: this.generationConfig,
        signal: this.currentChatAbortController.signal,
        onEvents: (events: StreamEvent[]) => {
          botMessage._isGenerating = false;
          botMessage._isStreaming = true;

          events.forEach((event) => {
            const parts = botMessage._parts;

            switch (event.type) {
              case 'text': {
                let lastPart = parts[parts.length - 1] as TextPart;
                if (lastPart?.type !== 'text') {
                  lastPart = { type: 'text', content: '' };
                  parts.push(lastPart);
                }
                lastPart.content += event.value;
                botMessage.content += event.value;
                break;
              }
              case 'reasoning': {
                let lastPart = parts[parts.length - 1] as ReasoningPart;
                if (lastPart?.type !== 'reasoning') {
                  lastPart = { type: 'reasoning', content: '', expanded: true };
                  parts.push(lastPart);
                }
                lastPart.content += event.value;
                break;
              }
              case 'tool': {
                parts.push({
                  type: 'tool-invocation',
                  toolCallId: event.value.toolCallId,
                  toolName: event.value.toolName || event.value.method,
                  args: {},
                });
                break;
              }
              case 'tool-input': {
                const part = (parts as ToolInvocationPart[]).find(
                  (p) => p.toolCallId === event.value.toolCallId,
                );
                if (part) {
                  part.args = event.value.input;
                }
                break;
              }
              case 'tool-output': {
                const part = (parts as ToolInvocationPart[]).find(
                  (p) => p.toolCallId === event.value.toolCallId,
                );
                if (part) {
                  part.result = event.value.output;
                }
                break;
              }
            }
          });

          this.messages.update((messages) => [...messages]);
          this.scrollToBottom();
        },
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error('Generation failed', err);
      }
    } finally {
      this.isChatting.set(false);
      botMessage._isGenerating = false;
      botMessage._isStreaming = false;
      this.currentChatAbortController = undefined;
      this.messages.update((messages) => [...messages]);
    }
  }

  protected async stopGeneration() {
    if (this.currentChatAbortController) {
      this.currentChatAbortController.abort();
      this.currentChatAbortController = undefined;
    }
    this.isChatting.set(false);

    // Update the last message state
    const messages = this.messages();
    const lastMessage = messages[messages.length - 1] as AssistantChatMessage;
    if (lastMessage?.role === 'assistant') {
      if (lastMessage._isGenerating) {
        messages.pop();
      } else {
        lastMessage._isGenerating = false;
      }
      this.messages.set(messages);
    }
  }

  protected onInput(event: InputEvent) {
    const target = event.target as HTMLElement;
    const trimmed = target.innerText.trim();

    if (trimmed === '') target.innerText = '';

    this.inputText = trimmed;
    this.syncMentions();

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
    mentionSpan.textContent = tableName;
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

  private syncMentions() {
    const el = this.editor()?.nativeElement as HTMLElement;
    if (!el) return;
    const chips = el.querySelectorAll('.mention-chip') as NodeListOf<HTMLElement>;
    const tableNames = Array.from(chips)
      .map((chip) => chip.textContent || '')
      .filter((name) => !!name);
    this.mentions.tables = [...new Set(tableNames)];
  }
}
