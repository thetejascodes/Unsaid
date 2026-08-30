const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:8000';


export const connectSocket = (
  accessToken: string,
  onMessage: (event: any) => void
) => {
  const ws = new WebSocket(`${WS_BASE_URL}/ws?accessToken=${accessToken}`);

  ws.onmessage = (event) => {
    const parsed = JSON.parse(event.data);
    onMessage(parsed);
  };

  return ws;
};

export const sendEvent = (ws: WebSocket, type: string, payload: object) => {
  ws.send(JSON.stringify({ type, ...payload }));
};