import { DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, filter } from 'rxjs';

import { environment } from '@environments/environment';

import { getApiKey } from '@app/core/guards/api-key.guard';
import { WebSocketMessage, WebsocketService } from '@app/shared/websocket/websocket.service';
import { RecordData, TableService } from './table.service';

export type RealtimeChange<T = RecordData> =
  | { tag: 'insert'; old: undefined; new: T; key: undefined }
  | { tag: 'update'; old: null; new: T; key: null }
  | { tag: 'delete'; old: null; new: undefined; key: T };

export interface RealtimePayload<T = RecordData> {
  tag: 'insert' | 'update' | 'delete';
  relation: {
    name: string;
    keyColumns: string[];
  };
  old: RealtimeChange<T>['old'];
  new: RealtimeChange<T>['new'];
  key: RealtimeChange<T>['key'];
}

export type TableRealtimeMessage<T = RecordData> = {
  tableName: string;
  tableKeyColumn: string;
  action: 'insert' | 'update' | 'delete';
  record: {
    old: RealtimeChange<T>['old'];
    new: RealtimeChange<T>['new'];
    key: RealtimeChange<T>['key'];
  };
  metadata: RealtimePayload<T>;
};

const REALTIME_EVENT_NAME = 'db_change';

@Injectable({
  providedIn: 'root',
})
export class TableRealtimeService {
  private wsUrl = `${environment.wsUrl}/realtime`;
  private sseUrl = `${environment.apiUrl}/realtime`;
  private messages$ = new Subject<TableRealtimeMessage>();

  constructor(
    private destroyRef: DestroyRef,
    private websocketService: WebsocketService,
    private tableService: TableService,
  ) {}

  /**
   * Enable WebSocket for realtime updates
   */
  enableWS() {
    const apiKey = getApiKey();
    const wsUrl = `${this.wsUrl}${this.wsUrl.includes('?') ? '&' : '?'}x-api-key=${apiKey}`;

    this.websocketService
      .connect(wsUrl)
      .pipe(
        filter(
          ({
            data,
          }: WebSocketMessage<{
            event: string;
            payload: RealtimePayload;
            timestamp: string;
          }>) =>
            data.event === REALTIME_EVENT_NAME &&
            data.payload.relation.name === this.tableService.selectedTable()?.tableName,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => this.emitMessage(data.payload),
        error: (err) => console.error('WebSocket error:', err),
      });

    return this.messages$;
  }

  /**
   * Enable Server-Sent Events for realtime updates
   */
  enableSSE() {
    const apiKey = getApiKey();
    const sseUrl = `${this.sseUrl}?apiKey=${apiKey}`;

    const sseStream$ = new Observable<RealtimePayload>((observer) => {
      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener(REALTIME_EVENT_NAME, (event) => {
        try {
          observer.next(JSON.parse(event.data));
        } catch (e) {
          console.error('Failed to parse SSE payload', e);
        }
      });

      eventSource.onerror = (err) => {
        console.error('SSE Connection Error:', err);
      };

      return () => eventSource.close();
    });

    sseStream$
      .pipe(
        filter((data) => data.relation.name === this.tableService.selectedTable()?.tableName),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => this.emitMessage(data),
        error: (err) => console.error('SSE Stream error:', err),
      });

    return this.messages$;
  }

  private emitMessage(data: RealtimePayload) {
    this.messages$.next({
      tableName: data.relation.name,
      tableKeyColumn: data.relation.keyColumns[0] || 'id',
      action: data.tag,
      record: { old: data.old, new: data.new, key: data.key },
      metadata: data,
    });
  }
}
