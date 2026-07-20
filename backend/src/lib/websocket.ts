import { WebSocketServer, WebSocket } from 'ws';
let wss: WebSocketServer | null = null;
export function initWebSocketServer(server: any) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  });
}
export function broadcast(event: string, data: any = {}) {
  if (!wss) return;
  const payload = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
