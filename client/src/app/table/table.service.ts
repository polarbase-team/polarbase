import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private apiUrl = 'http://localhost:3000/rest/tables';

  constructor(private http: HttpClient) {}

  getTables(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getTableSchema(tableName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rest/${tableName}/schema`);
  }

  getData(tableName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rest/${tableName}`);
  }
}
