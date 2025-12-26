import Elysia from 'elysia';

import { WebSocket } from '../plugins/web-socket';
import { apiKeyAuth } from '../api-keys/auth';
import { setupReplication, startCDC } from './cdc';

const REALTIME_PATH = process.env.REALTIME_PATH || '/realtime';
const REALTIME_MAX_CLIENTS = Number(process.env.REALTIME_MAX_CLIENTS) || 1000;

export async function enableRealtime(app: Elysia) {
  await setupReplication();
  await startCDC();

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
}
