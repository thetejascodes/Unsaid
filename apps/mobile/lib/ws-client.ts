const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://10.0.2.2:8000';

export const connectSocket = (
  accessToken: string,
  onMessage: (event: any) => void
) => {
  const ws = new WebSocket(`${WS_BASE_URL}/ws?accessToken=${accessToken}`);

  ws.onopen = () => {
    console.log("WS OPEN:", WS_BASE_URL);
  };

  ws.onmessage = (event) => {
    const parsed = JSON.parse(event.data);
    onMessage(parsed);
  };

  ws.onerror = (err) => {
    console.log("WS ERROR:", JSON.stringify(err));
  };

  ws.onclose = (event) => {
    console.log("WS CLOSED. code:", event.code, "reason:", event.reason);
  };

  return ws;
};

export const sendEvent = (ws: WebSocket, type: string, payload: object) => {
  ws.send(JSON.stringify({ type, ...payload }));
};