import { DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, filter } from 'rxjs';

import { WebSocketMessage, WebsocketService } from '../../../shared/websocket/websocket.service';
import { TableService } from './table.service';

export type RealtimeChange<T = Record<string, any>> =
  | { tag: 'insert'; old: undefined; new: T; key: undefined }
  | { tag: 'update'; old: null; new: T; key: null }
  | { tag: 'delete'; old: null; new: undefined; key: T };

export interface WSRealtimeMessage<T = Record<string, any>> {
  tag: 'insert' | 'update' | 'delete';
  relation: {
    name: string;
    keyColumns: string[];
  };
  old: RealtimeChange<T>['old'];
  new: RealtimeChange<T>['new'];
  key: RealtimeChange<T>['key'];
}

export type TableRealtimeMessage<T = Record<string, any>> = {
  tableName: string;
  tableKeyColumn: string;
  action: 'insert' | 'update' | 'delete';
  record: {
    old: RealtimeChange<T>['old'];
    new: RealtimeChange<T>['new'];
    key: RealtimeChange<T>['key'];
  };
  metadata: WSRealtimeMessage<T>;
};

@Injectable({
  providedIn: 'root',
})
export class TableRealtimeService {
  private wsUrl = 'ws://localhost:3000/realtime';
  private messages$ = new Subject<TableRealtimeMessage>();

  constructor(
    private destroyRef: DestroyRef,
    private websocketService: WebsocketService,
    private tableService: TableService,
  ) {}

  enable() {
    this.websocketService
      .connect(this.wsUrl)
      .pipe(
        filter(
          ({ data }: WebSocketMessage<WSRealtimeMessage>) =>
            data.relation.name === this.tableService.selectedTable()?.tableName,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }: WebSocketMessage<WSRealtimeMessage>) => {
          const tableName = data.relation.name;
          const tableKeyColumn = data.relation.keyColumns[0] || 'id';
          const action = data.tag;
          const record = { old: data.old, new: data.new, key: data.key };
          this.messages$.next({
            tableName,
            tableKeyColumn,
            action,
            record,
            metadata: data,
          });
        },
        error: (err) => console.error('WebSocket error:', err),
      });

    return this.messages$;
  }
}
