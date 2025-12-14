import { Component, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';

import { TableListComponent } from './table/table-list/table-list.component';
import { TableDetailComponent } from './table/table-detail/table-detail.component';

@Component({
  selector: 'base',
  imports: [ButtonModule, TableListComponent, TableDetailComponent],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  standalone: true,
})
export class BaseComponent {
  sidebarVisible = signal<boolean>(true);

  protected toggleSidebar() {
    this.sidebarVisible.update((v) => !v);
  }
}
