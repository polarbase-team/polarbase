import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { TableListComponent } from './table/pages/table-list/table-list.component';
import { TableDetailComponent } from './table/pages/table-detail/table-detail.component';
import { TableService } from './table/services/table.service';
import { TableRealtimeService } from './table/services/table-realtime.service';

@Component({
  selector: 'base',
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TabsModule,
    ButtonModule,
    ImageModule,
    TooltipModule,
    TableListComponent,
    TableDetailComponent,
  ],
})
export class BaseComponent {
  protected sidebarVisible = signal<boolean>(true);

  constructor(
    protected tblService: TableService,
    protected tblRealtimeService: TableRealtimeService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
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

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }

  protected onTabChange(tableName: string) {
    this.tblService.selectTable(tableName);
  }
}
