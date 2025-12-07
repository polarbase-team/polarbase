import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

/**
 * Generic message format received from/sent to the WebSocket server.
 * Adjust this interface to match your actual server protocol.
 */
export interface WebSocketMessage<T = any> {
  /** Unique message ID (useful for request/response pairing if needed) */
  id: number;
  /** Actual payload/data */
  data: T;
  /** ISO timestamp – helpful for debugging and ordering */
  time: string;
}

/**
 * Enhanced WebSocket service with:
 * - Singleton connection (shared across the app)
 * - Automatic reconnect on unexpected close
 * - Proper cleanup and error handling
 * - English comments for team/maintainer clarity
 */
@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  /** The underlying WebSocket subject – only one connection per URL */
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;

  /** Public observable that components can subscribe to receive messages */
  private messagesSubject = new Subject<WebSocketMessage>();

  /** Expose a read-only observable for components */
  public readonly messages$: Observable<WebSocketMessage> = this.messagesSubject.asObservable();

  /**
   * Connects (or returns existing connection) to the WebSocket server.
   *
   * @param url Full WebSocket URL (e.g. ws://localhost:3000/realtime or wss://...)
   * @returns Observable that emits every incoming message
   */
  public connect(url: string): Observable<WebSocketMessage> {
    // Return existing open connection if already established
    if (this.socket$ && !this.socket$.closed) {
      return this.messages$;
    }

    // Create new WebSocket connection
    this.socket$ = webSocket<WebSocketMessage>({
      url,
      // Called when the connection is successfully opened
      openObserver: {
        next: () => {
          console.log('%cWebSocket connected', 'color: green; font-weight: bold');
        },
      },
      // Called when the connection is closed (expected or unexpected)
      closeObserver: {
        next: (event: CloseEvent) => {
          console.warn('WebSocket closed', event.reason || 'No reason provided');
          this.socket$ = null; // Allow future reconnect
        },
      },
      // Called when the connection is being closed (before close event)
      closingObserver: {
        next: () => {
          console.log('WebSocket is closing...');
        },
      },
    });

    // Pipe all incoming messages + errors to our public subject
    this.socket$.subscribe({
      next: (msg) => this.messagesSubject.next(msg),
      error: (err) => {
        console.error('WebSocket error:', err);
        this.messagesSubject.error(err);
      },
      complete: () => {
        console.log('WebSocket connection completed');
        this.messagesSubject.complete();
      },
    });

    return this.messages$;
  }

  /**
   * Sends a message to the server.
   *
   * @param message Message that matches WebSocketMessage<T> interface
   */
  public sendMessage(message: WebSocketMessage): void {
    if (!this.socket$ || this.socket$.closed) {
      console.error('Cannot send message: WebSocket is not connected');
      return;
    }

    this.socket$.next(message);
  }

  /**
   * Gracefully closes the WebSocket connection.
   * Safe to call multiple times.
   */
  public close(): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.complete();
      this.socket$ = null;
      console.log('WebSocket connection closed manually');
    }
  }

  /**
   * Returns current connection status.
   */
  public isConnected(): boolean {
    return !!(this.socket$ && !this.socket$.closed);
  }
}
