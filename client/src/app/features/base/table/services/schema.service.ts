import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '@environments/environment';

import { ApiResponse } from '@app/core/models/api-response';

export interface EnumTypeDefinition {
  schemaName: string;
  enumName: string;
  enumValues: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SchemaService {
  private apiUrl = `${environment.apiUrl}/rest`;

  constructor(private http: HttpClient) {}

  getEnumTypes() {
    return this.http
      .get<ApiResponse<EnumTypeDefinition[]>>(`${this.apiUrl}/enum-types`)
      .pipe(map((res) => res.data));
  }
}
