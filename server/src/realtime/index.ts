import Elysia from 'elysia';

import { WebSocket } from '../plugins/web-socket';
import { apiKeyAuth } from '../api-keys/auth';
import { setupReplication, startCDC } from './cdc';

const REALTIME_PATH = process.env.REALTIME_PATH || '/realtime';

export async function enableRealtime(app: Elysia) {
  setupReplication();
  startCDC();

  app.ws(`${REALTIME_PATH}`, {
    open(ws) {
      const apiKey = ws.data.headers['x-api-key'];
      if (!apiKey) {
        ws.close(1008, 'Missing API Key');
        return;
      }
      apiKeyAuth(apiKey)
        .then((data) => {
          ws.data = { ...data } as any;
          WebSocket.addClient(ws as any);
        })
        .catch(() => ws.close(1008, 'Invalid API Key'));
    },
    close(ws) {
      const { id } = (ws as any).data.query || {};
      if (id) WebSocket.removeClient(id);
    },
  });
}
