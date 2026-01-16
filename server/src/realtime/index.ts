import Elysia, { sse } from 'elysia';

import { WebSocket } from '../plugins/web-socket';
import { apiKeyAuth } from '../api-keys/auth';
import { CDC_EVENTS, cdcEmitter, setupReplication, startCDC } from './cdc';

const REALTIME_PATH = process.env.REALTIME_PATH || '/realtime';
const REALTIME_MAX_CLIENTS = Number(process.env.REALTIME_MAX_CLIENTS) || 1000;
const REALTIME_EVENT_NAME = 'db_change';

export async function enableRealtime(app: Elysia) {
  await setupReplication();
  await startCDC();

  cdcEmitter.on(CDC_EVENTS.CHANGE, (message) => {
    WebSocket.broadcast({
      event: REALTIME_EVENT_NAME,
      payload: message,
      timestamp: new Date().toISOString(),
    });
  });

  // WebSocket endpoint
  app.ws(`${REALTIME_PATH}`, {
    async open(ws) {
      if (
        REALTIME_MAX_CLIENTS > 0 &&
        WebSocket.getClients().size >= REALTIME_MAX_CLIENTS
      ) {
        ws.close(1013, 'Server full: Too many connections');
        return;
      }

      const apiKey = ws.data.query['x-api-key'];
      if (!apiKey) {
        ws.close(1008, 'Missing API Key');
        return;
      }
      try {
        const authData = await apiKeyAuth(apiKey);
        if (!authData.scopes.realtime) {
          ws.close(
            1008,
            'Access denied: you do not have permission to access this resource.'
          );
          return;
        }

        ws.data = { ...authData } as any;
        WebSocket.addClient(ws as any);
      } catch {
        ws.close(1008, 'Invalid API Key');
      }
    },
    close(ws) {
      const { id } = (ws as any).data.query || {};
      if (id) WebSocket.removeClient(id);
    },
  });

  // SSE endpoint
  app.get(`${REALTIME_PATH}`, async function* ({ set, request, query }) {
    set.headers['content-type'] = 'text/event-stream';
    set.headers['cache-control'] = 'no-cache';
    set.headers['connection'] = 'keep-alive';
    set.headers['keep-alive'] = 'timeout=600';

    const apiKey = request.headers.get('x-api-key') || query['apiKey'];

    if (!apiKey) {
      set.status = 401;
      return { error: 'Missing API Key' };
    }

    try {
      const authData = await apiKeyAuth(apiKey);
      if (!authData.scopes.realtime) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
    } catch {
      set.status = 401;
      return { error: 'Invalid API Key' };
    }

    const signal = request.signal;
    let resolve: (value: unknown) => void;
    let promise = new Promise((r) => (resolve = r));
    const queue: any[] = [];

    const listener = (data: any) => {
      queue.push(data);
      resolve(true);
    };

    cdcEmitter.on('cdc:change', listener);

    try {
      // First chunk sends headers and primes the connection
      yield sse(': ok');

      while (!signal.aborted) {
        const timeoutPromise = new Promise((r) =>
          setTimeout(() => r('timeout'), 15000)
        );

        // Wait for activity
        // Since this is a generator, we await the promise inside the loop
        await Promise.race([promise, timeoutPromise]);

        if (signal.aborted) break;

        // Send pending events from queue using the documented 'sse' helper
        while (queue.length > 0) {
          const data = queue.shift();
          yield sse({
            event: REALTIME_EVENT_NAME,
            data: data,
          });
        }

        // Heartbeat
        yield sse(': heartbeat');

        // Reset for next event
        promise = new Promise((r) => (resolve = r));
      }
    } finally {
      cdcEmitter.off('cdc:change', listener);
    }
  });
}
