import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  signal,
} from '@angular/core';
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
import { AgentService } from './chatbot/agent.service';

const SIDEBAR_VISIBLE_KEY = 'sidebar_visible';

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
  protected chatbotVisible = computed(() => this.agentService.openAIChatbot());
  protected chatbotFullscreen = signal(false);

  constructor(
    protected tableService: TableService,
    protected tableRealtimeService: TableRealtimeService,
    private destroyRef: DestroyRef,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private agentService: AgentService,
  ) {
    this.sidebarVisible.set(
      Boolean(JSON.parse(localStorage.getItem(SIDEBAR_VISIBLE_KEY) || 'true')),
    );

    effect(() => {
      const activeTable = this.tableService.activeTable();
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { table: activeTable?.name },
        queryParamsHandling: 'merge',
      });
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
    localStorage.setItem(SIDEBAR_VISIBLE_KEY, this.sidebarVisible().toString());
  }

  protected toggleChatbot() {
    this.agentService.openAIChatbot.update((v) => !v);
  }

  protected onCloseChatbot() {
    this.agentService.openAIChatbot.set(false);
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
}
