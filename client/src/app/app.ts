import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { AppTableList } from './table/table-list/table-list';
import { AppTableDetail } from './table/table-detail/table-detail';

@Component({
  selector: 'app-root',
  imports: [ButtonModule, DividerModule, AppTableList, AppTableDetail],
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
