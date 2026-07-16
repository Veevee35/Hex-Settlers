# Persistent lobby repair — persistent-lobby-v3

## Failure addressed

The prior browser client treated a delayed reconnect handshake as an expired account after three seconds. It cleared local authentication and destroyed the visible lobby state. The server also allowed only one authenticated WebSocket per account, so a second tab or a replacement transport could cause the two browser sockets to repeatedly evict one another.

That combination produced the observed pattern: lobby creation succeeded, then the client fell into `Not in a room` or `Room not found` shortly afterward.

## Changes

- Removed the destructive three-second lobby/session timeout.
- Added browser-to-server and server-to-browser WebSocket heartbeats.
- Added bounded reconnect/rejoin recovery while retaining the current lobby UI and setup selections.
- Added `roomCode` to room-scoped requests so a replacement socket can repair its room binding.
- Added authenticated room-binding recovery from persisted room membership.
- Allowed multiple tabs to authenticate without globally disconnecting one another.
- Made room-seat replacement explicit: only the tab that takes over the same room seat displaces the old room transport, and the displaced client does not auto-reconnect in a loop.
- Detached a socket from its old room before binding it to a new room.
- Persisted a newly created room before sending the `joined` acknowledgment.
- Added `/health` and `/api/health` with build and instance information.
- Bumped browser asset identifiers to `persistent-lobby-v3`.

## Validation

`npm run check` passes all 104 tests. Added coverage verifies heartbeat replies, immediate room persistence, multiple authenticated sockets, room-seat takeover without a reconnect war, automatic room-binding recovery, and continued lobby rule changes after recovery.

A separate 32-second production-bootstrap soak test kept the WebSocket open through the server heartbeat interval and confirmed that changed lobby settings remained intact.
