import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { map } from 'rxjs';

import { environment } from '@environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface StreamEvent {
  type: 'text' | 'tool';
  value: string;
}

@Injectable()
export class AgentService {
  private apiUrl = `${environment.apiUrl}/agent`;
  private lastReadIndex = 0;

  constructor(private http: HttpClient) {}

  chat(messages: ChatMessage[]) {
    this.lastReadIndex = 0;

    return this.http
      .post(
        `${this.apiUrl}/chat`,
        { messages },
        {
          observe: 'events',
          responseType: 'text',
          reportProgress: true,
        },
      )
      .pipe(
        map((event: any) => {
          if (event.type === HttpEventType.DownloadProgress) {
            const fullContent = event.partialText as string;
            const newChunk = fullContent.substring(this.lastReadIndex);
            this.lastReadIndex = fullContent.length;

            return this.parseComplexChunk(newChunk);
          }
          return [];
        }),
      );
  }

  private parseComplexChunk(chunk: string) {
    const events: StreamEvent[] = [];

    const objectRegex = /\{.*?\}(?=\{|$)/g;
    let match: any;

    while ((match = objectRegex.exec(chunk)) !== null) {
      try {
        const obj = JSON.parse(match[0]);

        if (obj.type === 'text-delta') {
          events.push({ type: 'text', value: obj.delta });
        } else if (obj.type === 'tool-input-start') {
          events.push({ type: 'tool', value: obj.toolName });
        }
      } catch {}
    }

    return events;
  }
}
