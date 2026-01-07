import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { TableListComponent } from './table/pages/table-list/table-list.component';
import { TableDetailComponent } from './table/pages/table-detail/table-detail.component';
import { TableService } from './table/services/table.service';

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
  protected tblService = inject(TableService);
  protected sidebarVisible = signal<boolean>(true);

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }
}
