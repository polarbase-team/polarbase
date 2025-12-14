import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class AgentService {
  private apiUrl = 'http://localhost:3000/agent';

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
