import { BASE_HOST } from './api';
export function startWebSocketListener() {
  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;
  function connect() {
    const wsUrl = BASE_HOST.replace(/^http/, 'ws');
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('[WS] Connected to backend');
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          const customEvent = new CustomEvent(data.event.toLowerCase(), { detail: data.data });
          window.dispatchEvent(customEvent);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };
    ws.onclose = () => {
      console.log('[WS] Connection lost. Reconnecting in 3 seconds...');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onerror = (err) => {
      console.error('[WS] Connection error:', err);
      if (ws) ws.close();
    };
  }
  connect();
  return () => {
    clearTimeout(reconnectTimer);
    if (ws) ws.close();
  };
}
