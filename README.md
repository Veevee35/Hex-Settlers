# Hex Settlers

Hex Settlers is a browser-based, server-authoritative hex strategy game. It supports account-backed online lobbies, classic and 5–6-player maps, multiple seafaring scenarios, spectators, game history, custom texture packs, and test/normal/expert/neural AI opponents.

**Cloudflare-only deployment:** follow [`CLOUDFLARE_ONLY_DEPLOYMENT.md`](CLOUDFLARE_ONLY_DEPLOYMENT.md) to migrate saved Railway data to private R2 and deploy a Durable-Object-managed Cloudflare Container.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Other devices on the same network can use `http://YOUR_LAN_IP:3000` when local firewall rules permit it.

For direct development against the JavaScript server, use `npm run start:legacy`. The production command starts the compiled TypeScript bootstrap, validates the environment, and then loads the same game server.

## Verify a change

```bash
npm run check
```

The check builds the bootstrap, runs unit and end-to-end server tests, and syntax-checks both large JavaScript entry points. The integration coverage exercises registration, lobby creation/join, expert tuning, chat, game start, private hand filtering, browser-cookie authentication, clean shutdown, and restart recovery.

## Runtime data

Set `DATA_DIR` to keep mutable data outside the repository. Cloudflare Containers load backed-up state into `/data` from private R2; local Node runs can use `DATA_DIR`. Legacy Railway volumes are supported only for backup migration.

| File | Contents |
| --- | --- |
| `users.json` | Account profiles, verified recovery emails, password hashes, hashed one-time tokens, hashed session tokens, and aggregate stats |
| `game_history.json` | Completed-game metadata and postgame snapshots |
| `active_rooms.json` | Recoverable lobby and active-game snapshots |
| `neural_ai_model.json` | Neural AI parameters and training metadata |

Writes are serialized and use atomic replacement. Clean shutdown flushes all four stores. Password hashing runs asynchronously, login attempts are rate-limited, browser sessions use HTTP-only same-site cookies, and ordinary WebSocket messages have a separate size limit from texture-pack uploads.

## Configuration

Copy `.env.example` into your hosting environment; the server does not load `.env` files by itself.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `3000` | HTTP/WebSocket port |
| `DATA_DIR` | repository root | Local persistence directory |
| `HEX_TRUST_PROXY` | Railway-aware | Trust forwarded host, address, and TLS headers |
| `HEX_ALLOWED_ORIGINS` | same host | Comma-separated additional WebSocket/API origins; `*` allows all |
| `HEX_AUTH_ATTEMPTS_PER_MINUTE` | `12` | Password-auth limit per client address |
| `HEX_WS_MAX_PAYLOAD` | `50331648` | Transport ceiling needed by large texture packs |
| `HEX_BUILTIN_ADMIN_ENABLED` | on outside tests | Creates the reserved `Benleethom` administrator account |
| `HEX_ADMIN_PASSWORD` | unset | Required as a private Cloudflare secret to provision/synchronize the built-in administrator; never stored in the source |
| `HEX_ADMIN_FORCE_PASSWORD_SYNC` | `false` | One-restart override that forces the environment password onto the built-in administrator |
| `HEX_PUBLIC_BASE_URL` | inferred from request | Public origin used in verification and password-reset links |
| `HEX_EMAIL_FROM` | `no-reply@hexsettlers.org` | Fixed in Wrangler and enforced in server code; does not require dashboard edits |
| `HEX_EMAIL_MODE` | `none` | Use `resend` for the recommended free HTTPS delivery; `cloudflare`, `direct`, and `smtp` are optional overrides |
| `RESEND_API_KEY` | unset | Private sending-only Resend API key stored in Cloudflare secrets |
| `RESEND_TIMEOUT_MS` | `15000` | Timeout for a Resend API request |
| `HEX_EMAIL_CLOUDFLARE_ENDPOINT` | public URL + `/api/internal/send-email` | HTTPS endpoint for the Cloudflare mail bridge |
| `HEX_EMAIL_BRIDGE_SECRET` | unset | Legacy-only Cloudflare email bridge configuration; new Container uses Resend directly |
| `HEX_EMAIL_EHLO_NAME` | sender domain | Public hostname used only by optional direct SMTP delivery |
| `SMTP_HOST` and `SMTP_*` | unset | Optional authenticated relay override when `HEX_EMAIL_MODE=smtp` |
| `AI_FAST` | off | Accelerated AI ticks for simulations only |

The built-in administrator uses username **Benleethom** and player name **Ben**. No administrator password is printed in logs. New installations require an explicitly configured private administrator password. Ben sees every registered account in **User Management**, can reset non-admin passwords, and can permanently remove non-admin accounts after typing the username. Ordinary players see only their own account in **My Account**. Signed-in users can change their own password and verify a recovery email. The new Cloudflare Container can send verification and reset email using Resend's HTTPS API, without Railway. See `CLOUDFLARE_ONLY_DEPLOYMENT.md` for Cloudflare-only setup; `ADMIN_SETUP.md` retains legacy reference notes.

Expert AI weights also have optional `EXPERT_AI_*` environment overrides; see the defaults near the bottom of `server.js`.

## Neural AI training

The neural policy learns from every neural player's outcome in self-play. Its
`fast-victory-opponent-denial-v2` objective rewards earlier wins and a larger lead
over rivals, penalizes losses, and includes opponent victory progress and blocked
production as inputs. Winning immediately takes priority over further building
or blocking. The 17-input model preserves the original 12 learned inputs when
loading an older model.

To train 1,000 games in each of the 13 standard modes (PowerShell):

```powershell
$env:SIMS = '13000'
$env:MAP_SET = 'standard'
$env:SHARDS = '16'
$env:BATCH_SIZE = '100'
$env:CONCURRENCY = '8'
$env:GAME_TIMEOUT_MS = '600000'
$env:TRAINING_OUTPUT = 'scripts/output/neural_ai_13000_fast_victory_opponent_denial.json'
node scripts/train_neural_ai_distributed.js
```

`standard` includes Classic, Classic 5–6, and the eleven standard Seafarers
scenarios, including both Cartographer and Scattered Tiles sizes. The two Test
Builder modes are included only with `MAP_SET=all` (the default). Each game uses
its scenario's full victory target. Workers start with the same saved model and
their final parameters are averaged in proportion to completed games. A game
counts once only after a player reaches the victory target.

The trainer prints a checkpoint directory and saves each completed batch there.
It preserves failed runs for recovery and updates `neural_ai_model.json` only
after validating the complete curriculum. The report contains individual game
results, per-mode counts, turns to victory, victory margins, and model hashes.
Training servers omit browser replay recording; normal games retain replays.

## Project layout

- `server.js` — authoritative rules engine, lobby protocol, AI, HTTP and WebSocket runtime
- `server/` — tested security, persistence, protocol, configuration, rule-default, cookie, and room-snapshot modules
- `public/` — browser client and game assets
- `src/server.ts` — production bootstrap
- `src/shared/protocol.ts` — shared protocol vocabulary for incremental typing
- `scripts/` — playable-map simulations and expert/neural training utilities
- `test/` — unit and live-server compatibility tests

## Desktop releases

The optional desktop wrapper lives in `desktop/` and opens the hosted game at `https://hexsettlers.org/`. Electron dependencies are intentionally excluded from the Cloudflare/web-server installation. To build a desktop release, first run `npm ci --prefix desktop`.

```bash
npm run electron:dist -- --linux AppImage
```

Use `--win nsis` or `--mac dmg` on those platforms. Pushing a `v*` tag triggers the release workflow for Linux, Windows, and macOS.

See [README_RAILWAY.md](README_RAILWAY.md) for deployment and [README_TYPESCRIPT_MIGRATION.md](README_TYPESCRIPT_MIGRATION.md) for the migration boundary.

## Build versioning (v39 and later)

The two public entry screens display `V1.0.0` initially. The tracked
`build-version.json` file is the single source of truth. A GitHub Actions
workflow (`.github/workflows/version-on-push.yml`) increments the patch number
on each push to `main` or `master`, from `.0` through `.99`, then advances the
minor number and resets the patch. To start a new major release, manually edit
**only** the `major` number in `build-version.json`; on the next push the minor
and patch are automatically reset to `0`.

For local use:

```sh
node scripts/bump-version.cjs --sync   # render version without incrementing
node scripts/bump-version.cjs --bump   # increment and stamp HTML/CSS/JS/service worker
```

**GitHub setup:** Actions must have `contents: write` permissions and the
versioning bot must be allowed to push to the deployment branch. If using
Cloudflare's GitHub integration, verify it builds the follow-up bot commit.
Without that deployment, the public site may still show the earlier version.
See `V39_RELEASE_NOTES.md` for details.

### 7–8 player map workshop (v40)

Unranked Play offers **Classic 7–8 Player — Custom Map** and **Seafarers 7–8
Player — Custom Map**, with fixed, editable hex layouts based on the supplied
templates. Paint tile terrain (including hidden Fog), numbers, and ports on
existing hexes; adding/removing hexes is no longer exposed in the editor.
Export to JSON v2 with Download Map and re-import with Upload Map. These
custom types are unavailable in Casual and Ranked Play. See `V44_RELEASE_NOTES.md`
for current setup behavior and `V40_RELEASE_NOTES.md` for historical details.

## v47 Game Setup: map family and board size

In unranked lobbies, choose **Classic** or **Seafarers** and then select one of the board-size groups: **4 Player**, **5-6 Player**, or **7-8 Player**. For Seafarers, scenario choices automatically adjust to the group. The range sets the valid player-count minimum and maximum rather than an exact number of required seats. For large Scattered Tiles and Cartographer games, previews use the seven-player board until an eighth human or AI occupies a seat. Casual Play has the same setup format, limited to the 4-player and 5–6-player groups. Lobby invite links populate automatically, with one Copy Link button adjacent to the address.

### Release v48: rules accuracy, room health and security

- In-game Rules scenario names use the exact scenario catalog rather than
  outdated fallbacks to Four Islands; the active game is authoritative.
- WebSocket transport includes client pong RTT tracking and server-side ping,
  message-rate limits, and request-size checks before JSON parsing.
- No spectators receive a selected player's private hand or development cards.
- Idle/finished rooms are cleaned automatically; active connected games are
  never expired solely because no action is being taken.
- Obsolete `edit_preview_grid` tile-resizing requests are no longer accepted;
  custom tile painting, fog, and JSON imports/exports remain available.
- Cloudflare static assets are protected with CSP, no-sniff, framing and
  referrer headers. Configure optional Worker-to-origin secret in
  `README_CLOUDFLARE.md` to prevent backend bypass.
- Fresh builtin-admin bootstrap requires `HEX_ADMIN_PASSWORD`, and never logs
  a generated credential.

See `V48_RELEASE_NOTES.md` and `V48_SECURITY_AND_RELIABILITY_AUDIT.md`.

## Train Expert / Neural AI locally

See [`V1.0.52_NEURAL_TRAINER_DESKTOP_REPAIR.md`](V1.0.52_NEURAL_TRAINER_DESKTOP_REPAIR.md) for the full Windows/Codex training workflow, model safety, and neural strategy changes. After `npm ci`, run `npm run train:neural:smoke` for a **non-destructive single-match test**, or `npm run train:neural` to update the project's neural model from completed self-play games. Training is localhost-only and does not connect to the live game.


## Local neural training dashboard (V1.0.55)

Double-click **`Start-Neural-Trainer.cmd`** on Windows to open the local GUI for evolutionary self-play, optional CUDA batch refinement, checkpointing, live logs, and pause/resume. See [V1.0.55_LOCAL_NEURAL_TRAINER_CUDA_GUI.md](V1.0.55_LOCAL_NEURAL_TRAINER_CUDA_GUI.md).
