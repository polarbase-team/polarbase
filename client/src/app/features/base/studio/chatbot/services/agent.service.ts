import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal } from '@angular/core';
import { Observable, lastValueFrom, map } from 'rxjs';

import { environment } from '@environments/environment';

import { getApiKey } from '@app/core/guards/api-key.guard';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface Model {
  provider: string;
  name: string;
}

export interface StreamEvent {
  type: 'text' | 'tool';
  value: string;
}

@Injectable()
export class AgentService {
  openAIChatbot: WritableSignal<boolean>;

  private apiUrl = `${environment.apiUrl}/agent`;

  constructor(private http: HttpClient) {}

  chat({
    messages,
    sessionId,
    attachments,
    mentions,
    model,
    agents,
    generationConfig,
  }: {
    messages: ChatMessage[];
    sessionId: string;
    attachments?: File[];
    mentions?: {
      tables: string[];
    };
    model?: Model;
    agents?: {
      database?: {
        builder?: boolean;
        editor?: boolean;
        query?: boolean;
      };
      browser?: boolean;
    };
    generationConfig?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
    };
  }): Observable<StreamEvent[]> {
    return new Observable((observer) => {
      const formData = new FormData();
      formData.append('messages', JSON.stringify(messages));
      formData.append('sessionId', sessionId);
      if (attachments?.length) {
        attachments.forEach((file) => formData.append('attachments', file, file.name));
      }
      if (mentions?.tables?.length) {
        formData.append('mentions', JSON.stringify(mentions));
      }
      if (model) {
        formData.append('model', JSON.stringify(model));
      }
      if (agents) {
        formData.append('agents', JSON.stringify(agents));
      }
      if (generationConfig) {
        formData.append('generationConfig', JSON.stringify(generationConfig));
      }

      const abortController = new AbortController();

      (async () => {
        try {
          const apiKey = getApiKey();
          const response = await fetch(`${this.apiUrl}/chat`, {
            method: 'POST',
            body: formData,
            signal: abortController.signal,
            headers: { 'x-api-key': apiKey },
          });

          if (!response.body) throw new Error('No response body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events: StreamEvent[] = [];

            // Attempt to extract all complete JSON objects from the buffer
            while (buffer.includes('{') && buffer.includes('}')) {
              let lastIndex = -1;
              let depth = 0;
              let found = false;

              // Find the bounds of the FIRST complete JSON object
              for (let i = 0; i < buffer.length; i++) {
                if (buffer[i] === '{') depth++;
                if (buffer[i] === '}') {
                  depth--;
                  if (depth === 0) {
                    lastIndex = i;
                    found = true;
                    break;
                  }
                }
              }

              if (found) {
                const jsonStr = buffer.substring(0, lastIndex + 1);
                buffer = buffer.substring(lastIndex + 1); // Remove processed part from buffer

                try {
                  const obj = JSON.parse(jsonStr);
                  if (obj.type === 'text-delta') {
                    events.push({ type: 'text', value: obj.delta });
                  } else if (obj.type === 'tool-input-start' || obj.type === 'tool-call') {
                    events.push({ type: 'tool', value: obj.toolName ?? obj.method });
                  } else if (obj.type === 'error') {
                    events.push({ type: 'text', value: obj.errorText ?? 'An error occurred.' });
                  }
                } catch (e) {
                  // If it fails, it's likely a partial chunk; log it and keep moving
                  console.warn('Skipping invalid chunk:', jsonStr);
                }
              } else {
                // If we have braces but depth never hit 0, we're waiting for more data
                break;
              }
            }

            if (events.length > 0) {
              observer.next(events);
            }
          }
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();

      return () => abortController.abort();
    });
  }

  getSessions(): Promise<{ id: string; title: string; updated_at: string }[]> {
    return lastValueFrom(
      this.http.get<{ id: string; title: string; updated_at: string }[]>(`${this.apiUrl}/sessions`),
    );
  }

  getHistory(sessionId: string): Promise<ChatMessage[]> {
    return lastValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/history/${sessionId}`).pipe(
        map((history) =>
          history.map((h) => ({
            role: h.role,
            content: h.content,
            timestamp: new Date(h.timestamp),
          })),
        ),
      ),
    );
  }

  updateSessionTitle(sessionId: string, title: string): Promise<any> {
    return lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/sessions/${sessionId}/title`, { title }),
    );
  }

  deleteSession(sessionId: string): Promise<any> {
    return lastValueFrom(this.http.delete<any>(`${this.apiUrl}/sessions/${sessionId}`));
  }
}
