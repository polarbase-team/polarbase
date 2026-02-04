import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '@environments/environment';

import { ApiResponse } from '@app/core/models/api-response';

export interface Index {
  name: string;
  tableName: string;
  columnNames: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin' | 'spgist';
}

@Injectable()
export class IndexService {
  private apiUrl = `${environment.apiUrl}/rest/db/indexes`;

  constructor(private http: HttpClient) {}

  getIndexes() {
    return this.http.get<ApiResponse<Index[]>>(this.apiUrl).pipe(map((res) => res.data));
  }

  createIndex(index: Index) {
    return this.http.post<ApiResponse<Index>>(this.apiUrl, index).pipe(map((res) => res.data));
  }

  deleteIndex(index: Index) {
    return this.http.delete(`${this.apiUrl}/${index.name}`);
  }
}
