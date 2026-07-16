# Persistent Lobby Fix

This build hardens lobby persistence against WebSocket replacement, idle proxy timeouts, and short Railway restarts.

- Room-scoped browser messages now carry the room code.
- The server restores an authenticated member's room binding automatically when a socket is replaced.
- Browser and server heartbeat traffic keeps idle lobby connections alive.
- The client keeps the lobby visible while reconnecting instead of immediately falling into a false "Not in a room" state.
- A host can reconstruct a missing pre-game lobby under the same room code, including rules, AI seats, and the current map preview.
- New rooms are written to active-room storage before the server acknowledges creation.
- Browser cache-busting identifiers were updated so Railway serves the fixed client immediately.

Validation: all 104 automated tests pass, including a socket-replacement and transient-room-loss integration test.
