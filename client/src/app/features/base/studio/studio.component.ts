import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { TableListComponent } from './table/pages/table-list/table-list.component';
import { TableDetailComponent } from './table/pages/table-detail/table-detail.component';
import { TableService } from './table/services/table.service';
import { TableRealtimeService } from './table/services/table-realtime.service';
import { ChatBotComponent } from './chatbot/chatbot.component';

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
  protected chatbotVisible = signal(false);
  protected chatbotFullscreen = signal(false);

  constructor(
    protected tblService: TableService,
    protected tblRealtimeService: TableRealtimeService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    this.sidebarVisible.set(
      Boolean(JSON.parse(localStorage.getItem(SIDEBAR_VISIBLE_KEY) || 'true')),
    );

    effect(() => {
      const activeTable = this.tblService.activeTable();
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { table: activeTable?.name },
        queryParamsHandling: 'merge',
      });
    });

    this.tblRealtimeService.enableSSE();
  }

  toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
    localStorage.setItem(SIDEBAR_VISIBLE_KEY, this.sidebarVisible().toString());
  }

  toggleChatbot() {
    this.chatbotVisible.update((v) => !v);
  }

  protected onTabChange(tableName: string) {
    this.tblService.selectTable(tableName);
  }

  protected onTabDrop(event: CdkDragDrop<string[]>) {
    this.tblService.selectedTables.update((tables) => {
      moveItemInArray(tables, event.previousIndex, event.currentIndex);
      return [...tables];
    });

    const activeTable = this.tblService.activeTable();
    if (activeTable) {
      this.tblService.activeTable.set(null);
      setTimeout(() => {
        this.tblService.activeTable.set(activeTable);
      }, 0);
    }
  }
}
