import { Injectable, signal } from '@angular/core';
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
  openAIChatbot = signal(false);

  private apiUrl = `${environment.apiUrl}/agent`;
  private lastReadIndex = 0;
  private buffer = '';

  constructor(private http: HttpClient) {}

  chat(messages: ChatMessage[]) {
    this.lastReadIndex = 0;
    this.buffer = '';

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
          let content: string | null = null;
          if (event.type === HttpEventType.DownloadProgress) {
            const fullContent = event.partialText as string;
            content = fullContent.substring(this.lastReadIndex);
            this.lastReadIndex = fullContent.length;
          } else if (event.type === HttpEventType.Response && event.body) {
            const fullContent = typeof event.body === 'string' ? event.body : '';
            content = fullContent.substring(this.lastReadIndex);
            this.lastReadIndex = fullContent.length;
          }
          return content ? this.parseComplexChunk(content) : [];
        }),
      );
  }

  private parseComplexChunk(chunk: string) {
    const events: StreamEvent[] = [];
    this.buffer += chunk;

    let start = 0;
    let depth = 0;
    let inString = false;
    let escape = false;
    const quote = '"';

    for (let i = 0; i < this.buffer.length; i++) {
      const c = this.buffer[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\' && inString) {
        escape = true;
        continue;
      }
      if (!inString) {
        if (c === quote) {
          inString = true;
          continue;
        }
        if (c === '{') {
          if (depth === 0) start = i;
          depth++;
          continue;
        }
        if (c === '}') {
          depth--;
          if (depth === 0) {
            try {
              const obj = JSON.parse(this.buffer.slice(start, i + 1));
              if (obj.type === 'text-delta') {
                events.push({ type: 'text', value: obj.delta ?? '' });
              } else if (obj.type === 'tool-input-start') {
                events.push({ type: 'tool', value: obj.toolName ?? '' });
              }
            } catch {
              // Ignore parse errors
            }
          }
          continue;
        }
      } else if (c === quote) {
        inString = false;
      }
    }

    this.buffer = depth > 0 ? this.buffer.slice(start) : '';
    return events;
  }
}
