'use strict';

// The one authoritative game process must never accept unlimited sockets.
// Refuse excess sockets at upgrade so clients can retry without allocating
// a WebSocket, and disconnect peers that cannot read outgoing state.
function canAcceptConnection(current, limit) {
  return Number.isFinite(current) && current < limit;
}
function isBackpressured(ws, maxBytes) {
  return !!ws && Number(ws.bufferedAmount || 0) > maxBytes;
}
function closeSlowClient(ws) {
  try { ws.close(1013, 'Connection too slow; reconnect'); } catch (_) {
    try { ws.terminate(); } catch (_) {}
  }
}
module.exports = { canAcceptConnection, isBackpressured, closeSlowClient };
