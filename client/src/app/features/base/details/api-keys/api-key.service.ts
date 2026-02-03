import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  scopes: {
    rest: boolean;
    agent: boolean;
    mcp: boolean;
    realtime: boolean;
  };
  createdAt: string;
  revoked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  private apiUrl = `${environment.apiUrl}/api-keys`;

  constructor(private http: HttpClient) {}

  getKeys() {
    return this.http.get<ApiKey[]>(this.apiUrl);
  }

  createKey(key: ApiKey) {
    return this.http.post<ApiKey>(this.apiUrl, key);
  }

  revokeKey(key: ApiKey) {
    return this.http.delete(`${this.apiUrl}/${key.id}`);
  }
}
