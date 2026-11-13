# Native private-state restore

`hex_state_restore` retrieves account, room, and supporting files through the
existing private Cloudflare Container state bridge. It validates the account
and room envelopes, walks texture-list pages, and publishes the snapshot as
a new private directory after every read succeeds. Restore mode reads R2. Use
a fresh destination for each restore.

Build and test with Docker Desktop in Linux mode from the repository root.

```powershell
docker build --platform linux/amd64 --target test -f native/hex-server/Dockerfile -t hex-settlers-state-restore:test .
docker run --rm --network none hex-settlers-state-restore:test
docker build --platform linux/amd64 -f native/hex-server/Dockerfile -t hex-settlers-state-restore:local .
```

Inside a Cloudflare Container that has the private outbound host mapping,
the invocation is:

```sh
CLOUDFLARE_STATE_ENDPOINT=http://hex-state.internal hex_state_restore /snapshots/current
```

The bridge hostname is provided by the Worker and is available inside the
Cloudflare Container. The integration test exercises the same paths against
a local HTTP fixture without connecting to Cloudflare.

## Explicit snapshot import

`hex_state_restore --publish /path/to/active_rooms.json` sends a validated
snapshot with a known content length and requires HTTP 201 from the bridge.
The same command accepts `users.json`. Use it only with an isolated bucket
or while every other writer is stopped. The existing bridge replaces the
entire object on each PUT.

The binary exits after restoring a snapshot. A production replacement still
requires a native process that loads the snapshot, runs the game, serves
HTTP and WebSockets, and persists subsequent changes.

## Offline turn replay

The image also contains `hex_turn_replay`. It accepts a JSON fixture with
`game` (a saved game object), `pairedTurns` (a boolean), and `actions` (an array
of action objects with `playerId`). Supported actions are `end_turn` and
`bank_trade`. Bank-trade fixtures also provide the resolved scenario
`bankCap`. It prints the resulting
game JSON to stdout. The C++ transition handles ordinary end turns and both
paired-turn stages. The replay covers turn-state fields. The server's timer,
log, statistics, and multiplayer behavior still run in JavaScript.

For a replay against a private test bucket, include `roomCode` and run
`hex_state_restore --replay-room FIXTURE.json`. The fixture's initial
`game` must match the saved game. The tool applies the whole action list in
memory and publishes one updated rooms document after the actions succeed.
Run with exclusive write access to the bucket. The bridge has no conditional
PUT for the room document, so the initial comparison cannot protect against
a concurrent writer. The replay is an offline tool and does not run live
turn timers, statistics, or client sessions.

## Local HTTP and WebSocket harness

`hex_state_restore --serve-local /tmp/hex.sock CONFIG.json` listens on an
owner-only Unix socket. Use a fresh socket path in a private directory.
The config provides `roomCode`, `playerId`, `pairedTurns`, and `bankCap`.
`GET /health` checks the harness, and `/ws` accepts text messages of type
`game_action` for bank trades and end turns. The harness acknowledges the
action only after the private bridge returns HTTP 201. Use a dedicated test
bucket with one writer. A failed or interrupted request may leave the
outcome uncertain, so reload saved state before retrying.

This service checks the existing `hexsettlers_session` cookie against
unexpired SHA-256 session records for the configured player. It sends
`hello`, `auth_ok`, `auth_required`, and `server_pong` for the exercised
protocol paths. It has no browser login endpoints, room broadcasts, or
TCP listener. Its `action_committed` reply is specific to the harness.
