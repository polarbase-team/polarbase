import _ from 'lodash';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';

import { AppTableList } from './table-list/table-list';
import { AppTableDetail } from './table-detail/table-detail';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Button, Divider, AppTableList, AppTableDetail],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  openAPIDocs() {
    window.open('http://localhost:3000/rest/openapi/', '_blank');
  }
}
