import _ from 'lodash';
import { Component, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';

import { AppTableList } from './table/table-list/table-list';
import { AppTableDetail } from './table/table-detail/table-detail';

@Component({
  selector: 'app-root',
  imports: [Button, Divider, AppTableList, AppTableDetail],
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
