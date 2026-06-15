// server-sent events hub: the dashboard subscribes to /api/events and the server
// pushes { entity, type, id, data } change events as sessions/messages mutate.
const clients = new Set();

export function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcast(event) {
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(frame); } catch { clients.delete(res); }
  }
}
