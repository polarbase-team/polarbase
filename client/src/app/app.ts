import { Component, signal } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { AppTableList } from './table/table-list/table-list.component';
import { AppTableDetail } from './table/table-detail/table-detail.component';

@Component({
  selector: 'app-root',
  imports: [ToastModule, ButtonModule, DividerModule, AppTableList, AppTableDetail],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  sideBarVisible = signal<boolean>(true);

  toggleSideBar() {
    this.sideBarVisible.update((v) => !v);
  }

  openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi', '_blank');
  }
}
