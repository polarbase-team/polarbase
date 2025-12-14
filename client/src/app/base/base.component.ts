import { Component, inject, signal } from '@angular/core';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';

import { TableListComponent } from './table/table-list/table-list.component';
import { TableDetailComponent } from './table/table-detail/table-detail.component';
import { TableService } from './table/table.service';

@Component({
  selector: 'base',
  imports: [
    TabsModule,
    ButtonModule,
    ImageModule,
    TooltipModule,
    TableListComponent,
    TableDetailComponent,
  ],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  standalone: true,
})
export class BaseComponent {
  protected tblService = inject(TableService);
  protected sidebarVisible = signal<boolean>(true);

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }
}
