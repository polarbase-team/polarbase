import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ViewLayoutService {
  load(tableName: string) {
    const key = this.getTableKey(tableName);
    const layout = localStorage.getItem(key);
    try {
      return JSON.parse(layout);
    } catch (e) {
      return null;
    }
  }

  save(tableName: string, value: any, replace = false) {
    const key = this.getTableKey(tableName);
    if (replace) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    const layout = this.load(tableName);
    if (layout) {
      localStorage.setItem(key, JSON.stringify({ ...layout, ...value }));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  remove(tableName: string) {
    const key = this.getTableKey(tableName);
    localStorage.removeItem(key);
  }

  private getTableKey(tableName: string) {
    return `table_${tableName}_layout`;
  }
}
