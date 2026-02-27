import { ChangeDetectionStrategy, Component, DestroyRef, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { filter } from 'rxjs';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { TableListComponent } from './table/pages/table-list/table-list.component';
import { TableDetailComponent } from './table/pages/table-detail/table-detail.component';
import { TableService } from './table/services/table.service';
import { TableRealtimeService } from './table/services/table-realtime.service';
import { ChatBotComponent } from './chatbot/chatbot.component';
import { AgentService } from './chatbot/services/agent.service';

const SIDEBAR_VISIBILITY_KEY = 'sidebar_visibility';
const CHATBOT_VISIBILITY_KEY = 'chatbot_visibility';
const CHATBOT_FULLSCREEN_KEY = 'chatbot_fullscreen';
const CHATBOT_WIDTH_KEY = 'chatbot_width';
const DEFAULT_CHATBOT_WIDTH = 480; // 30rem

@Component({
  selector: 'base-studio',
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    TabsModule,
    ButtonModule,
    ImageModule,
    TooltipModule,
    TableListComponent,
    TableDetailComponent,
    ChatBotComponent,
  ],
})
export class BaseStudioComponent {
  protected sidebarVisible = signal(true);
  protected chatbotVisible = signal(false);
  protected chatbotInitialized = signal(false);
  protected chatbotFullscreen = signal(false);
  protected chatbotWidth = signal(DEFAULT_CHATBOT_WIDTH);

  protected isResizing = signal(false);
  private startX = 0;
  private startWidth = 0;

  constructor(
    protected tableService: TableService,
    protected tableRealtimeService: TableRealtimeService,
    private destroyRef: DestroyRef,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private agentService: AgentService,
  ) {
    this.agentService.openAIChatbot = this.chatbotVisible;

    this.sidebarVisible.set(
      Boolean(JSON.parse(localStorage.getItem(SIDEBAR_VISIBILITY_KEY) || 'true')),
    );
    this.chatbotVisible.set(
      Boolean(JSON.parse(localStorage.getItem(CHATBOT_VISIBILITY_KEY) || 'false')),
    );
    this.chatbotFullscreen.set(
      Boolean(JSON.parse(localStorage.getItem(CHATBOT_FULLSCREEN_KEY) || 'false')),
    );
    this.chatbotWidth.set(Number(localStorage.getItem(CHATBOT_WIDTH_KEY)) || DEFAULT_CHATBOT_WIDTH);

    effect(() => {
      const activeTable = this.tableService.activeTable();
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { table: activeTable?.name },
        queryParamsHandling: 'merge',
      });
    });

    effect(() => {
      const sidebarVisible = this.sidebarVisible();
      localStorage.setItem(SIDEBAR_VISIBILITY_KEY, sidebarVisible.toString());
    });

    effect(() => {
      const chatbotVisible = this.chatbotVisible();
      localStorage.setItem(CHATBOT_VISIBILITY_KEY, chatbotVisible.toString());

      if (chatbotVisible) {
        this.chatbotInitialized.set(true);
      }
    });

    effect(() => {
      const chatbotFullscreen = this.chatbotFullscreen();
      localStorage.setItem(CHATBOT_FULLSCREEN_KEY, chatbotFullscreen.toString());
    });

    effect(() => {
      const chatbotWidth = this.chatbotWidth();
      localStorage.setItem(CHATBOT_WIDTH_KEY, chatbotWidth.toString());
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const table = this.activatedRoute.snapshot.queryParams['table'];
        if (table) {
          this.tableService.selectTable(table);
        }
      });

    this.tableRealtimeService.enableSSE();
  }

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }

  protected toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected onTabChange(tableName: string) {
    this.tableService.selectTable(tableName);
  }

  protected onTabDrop(event: CdkDragDrop<string[]>) {
    this.tableService.selectedTables.update((tables) => {
      moveItemInArray(tables, event.previousIndex, event.currentIndex);
      return [...tables];
    });

    const activeTable = this.tableService.activeTable();
    if (activeTable) {
      this.tableService.activeTable.set(null);
      setTimeout(() => {
        this.tableService.activeTable.set(activeTable);
      }, 0);
    }
  }

  protected onResizeStart(event: MouseEvent) {
    this.isResizing.set(true);
    this.startX = event.clientX;
    this.startWidth = this.chatbotWidth();
    document.addEventListener('mousemove', this.onResizing);
    document.addEventListener('mouseup', this.onResizeEnd);
    document.body.style.cursor = 'col-resize';
    event.preventDefault();
  }

  private onResizing = (event: MouseEvent) => {
    if (!this.isResizing()) return;
    const diff = this.startX - event.clientX;
    const newWidth = Math.max(320, Math.min(window.innerWidth * 0.8, this.startWidth + diff));
    this.chatbotWidth.set(newWidth);
  };

  private onResizeEnd = () => {
    this.isResizing.set(false);
    document.removeEventListener('mousemove', this.onResizing);
    document.removeEventListener('mouseup', this.onResizeEnd);
    document.body.style.cursor = '';
  };
}
