import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '@environments/environment';

export interface EnumTypeDefinition {
  schemaName: string;
  enumName: string;
  enumValues: string[];
}

interface Response<T = any> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class SchemaService {
  private apiUrl = `${environment.apiUrl}/rest`;

  constructor(private http: HttpClient) {}

  getEnumTypes() {
    return this.http
      .get<Response<EnumTypeDefinition[]>>(`${this.apiUrl}/enum-types`)
      .pipe(map((res) => res.data));
  }
}
