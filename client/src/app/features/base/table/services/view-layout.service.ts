import { Injectable } from '@angular/core';
import { TableService } from './table.service';

@Injectable()
export class ViewLayoutService {
  constructor(private tblService: TableService) {}

  load() {
    const key = this.getTableKey();
    const layout = localStorage.getItem(key);
    try {
      return JSON.parse(layout);
    } catch (e) {
      return null;
    }
  }

  save(value: any, replace = false) {
    const key = this.getTableKey();
    if (replace) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    const layout = this.load();
    if (layout) {
      localStorage.setItem(key, JSON.stringify({ ...layout, ...value }));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private getTableKey() {
    const table = this.tblService.activeTable();
    return table ? `table_${table.name}_layout` : '';
  }
}
