export function startWebSocketListener() {
  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;

  function connect() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
      console.log('[WS] Connected to backend');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          // Dispatch standard CustomEvent to window target
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
