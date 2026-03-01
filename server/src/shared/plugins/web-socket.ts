import { ServerWebSocket } from 'bun';
import { Context } from 'elysia';

import { log } from '../utils/logger';

const clients = new Map<
  string,
  ServerWebSocket<{ id: string; data: Context }>
>();

export class WebSocket {
  static getClients() {
    return clients;
  }

  static addClient(ws: ServerWebSocket<{ id: string; data: Context }>) {
    const id = ws.data.id;
    clients.set(id, ws);
    log.debug(`Client ${id} added to service`);
  }

  static removeClient(id: string) {
    clients.delete(id);
    log.debug(`Client ${id} removed from service`);
  }

  static sendToClient(id: string, data: any) {
    const ws = clients.get(id);
    if (ws) {
      ws.send(
        JSON.stringify({
          id,
          data,
          time: Date.now(),
        })
      );
      return true;
    }
    return false;
  }

  static broadcast(data: any) {
    const count = clients.size;
    clients.forEach((ws, id) => {
      ws.send(
        JSON.stringify({
          id,
          data,
          time: Date.now(),
        })
      );
    });
    return count;
  }
}
