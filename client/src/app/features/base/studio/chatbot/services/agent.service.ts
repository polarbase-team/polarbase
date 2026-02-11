import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

import { FileMetadata } from '@app/shared/file/file-upload.service';
import { getApiKey } from '@app/core/guards/api-key.guard';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileMetadata[];
  _selectedFiles?: File[];
}

export interface StreamEvent {
  type: 'text' | 'tool';
  value: string;
}

@Injectable()
export class AgentService {
  openAIChatbot = signal(false);

  private apiUrl = `${environment.apiUrl}/agent`;

  chat({
    messages,
    attachments,
    mentionedTables,
    subAgents,
    model,
  }: {
    messages: ChatMessage[];
    attachments?: File[];
    mentionedTables?: string[];
    subAgents?: {
      builder: boolean;
      editor: boolean;
      query: boolean;
    };
    model?: string;
  }): Observable<StreamEvent[]> {
    return new Observable((observer) => {
      const formData = new FormData();
      formData.append('messages', JSON.stringify(messages));
      if (attachments?.length) {
        attachments.forEach((file) => formData.append('attachments', file, file.name));
      }
      if (mentionedTables?.length) {
        formData.append('mentionedTables', JSON.stringify(mentionedTables));
      }
      if (subAgents) {
        formData.append('subAgents', JSON.stringify(subAgents));
      }
      if (model) {
        formData.append('model', model);
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
            let startIdx = 0;
            let depth = 0;

            for (let i = 0; i < buffer.length; i++) {
              if (buffer[i] === '{') {
                depth++;
              } else if (buffer[i] === '}') {
                depth--;

                // When depth reaches 0, we've found a complete JSON object
                if (depth === 0) {
                  const jsonStr = buffer.substring(startIdx, i + 1);
                  try {
                    const obj = JSON.parse(jsonStr);

                    if (obj.type === 'text-delta') {
                      events.push({ type: 'text', value: obj.delta });
                    } else if (obj.type === 'tool-input-start') {
                      events.push({ type: 'tool', value: obj.toolName });
                    } else if (obj.type === 'error') {
                      events.push({ type: 'text', value: obj.errorText ?? 'An error occurred.' });
                    }
                  } catch (e) {
                    console.error('Parsing error:', e, jsonStr);
                  }
                  // Move the start index to the next character
                  startIdx = i + 1;
                }
              }
            }

            // Keep only the remaining partial JSON in the buffer
            buffer = buffer.substring(startIdx);

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
}
