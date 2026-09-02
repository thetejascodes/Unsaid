const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://10.0.2.2:8000';

export const connectSocket = (
  accessToken: string,
  onMessage: (event: any) => void
) => {
  const ws = new WebSocket(`${WS_BASE_URL}/ws?accessToken=${accessToken}`);
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  ws.onopen = () => {
    console.log("WS OPEN:", WS_BASE_URL);
    // Send a small ping periodically so idle hotspot/router connections
    // aren't treated as dead and killed (fixes intermittent code 1006
    // disconnects seen when testing over a mobile hotspot).
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 15000);
  };

  ws.onmessage = (event) => {
    const parsed = JSON.parse(event.data);
    if (parsed.type === "PONG") {
      return; // heartbeat reply, nothing to render
    }
    onMessage(parsed);
  };

  ws.onerror = (err) => {
    console.log("WS ERROR:", JSON.stringify(err));
  };

  ws.onclose = (event) => {
    console.log("WS CLOSED. code:", event.code, "reason:", event.reason);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  return ws;
};

export const sendEvent = (ws: WebSocket, type: string, payload: object) => {
  ws.send(JSON.stringify({ type, ...payload }));
};