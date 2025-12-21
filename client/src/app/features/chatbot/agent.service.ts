import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';

@Injectable()
export class AgentService {
  private apiUrl = `${environment.apiUrl}/agent`;

  constructor(private http: HttpClient) {}

  chat(prompt: string) {
    return this.http.post(
      `${this.apiUrl}/chat`,
      { messages: [{ role: 'user', content: prompt }] },
      {
        observe: 'events',
        responseType: 'text',
        reportProgress: true,
      },
    );
  }
}
