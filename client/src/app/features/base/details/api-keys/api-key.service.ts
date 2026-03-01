import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

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

@Injectable()
export class ApiKeyService {
  private apiUrl = `${environment.apiUrl}/api-keys`;

  constructor(private http: HttpClient) {}

  getKeys() {
    return lastValueFrom(this.http.get<ApiKey[]>(this.apiUrl));
  }

  createKey(key: ApiKey) {
    return lastValueFrom(this.http.post<ApiKey>(this.apiUrl, key));
  }

  revokeKey(key: ApiKey) {
    return lastValueFrom(this.http.delete(`${this.apiUrl}/${key.id}`));
  }
}
