# Hex Settlers

Hex Settlers is a browser-based, server-authoritative hex strategy game. It supports account-backed online lobbies, classic and 5–6-player maps, multiple seafaring scenarios, spectators, game history, custom texture packs, and test/normal/expert/neural AI opponents.

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

Set `DATA_DIR` to keep mutable data outside the repository. Railway uses `RAILWAY_VOLUME_MOUNT_PATH` automatically when a volume is attached.

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
| `HEX_ADMIN_PASSWORD` | generated once when absent | Initial password for the built-in administrator; set this securely in Railway |
| `HEX_ADMIN_FORCE_PASSWORD_SYNC` | `false` | One-restart override that forces the environment password onto the built-in administrator |
| `HEX_PUBLIC_BASE_URL` | inferred from request | Public origin used in verification and password-reset links |
| `HEX_EMAIL_FROM` | `Hex Settlers <no-reply@send.tenthson.com>` | Sender identity for account email; use a verified sending domain you control |
| `HEX_EMAIL_MODE` | `none` | Use `resend` for the recommended free HTTPS delivery; `cloudflare`, `direct`, and `smtp` are optional overrides |
| `RESEND_API_KEY` | unset | Private sending-only Resend API key stored in Railway |
| `RESEND_TIMEOUT_MS` | `15000` | Timeout for a Resend API request |
| `HEX_EMAIL_CLOUDFLARE_ENDPOINT` | public URL + `/api/internal/send-email` | HTTPS endpoint for the Cloudflare mail bridge |
| `HEX_EMAIL_BRIDGE_SECRET` | unset | Shared secret stored in both Railway and the Cloudflare Worker secret store |
| `HEX_EMAIL_EHLO_NAME` | sender domain | Public hostname used only by optional direct SMTP delivery |
| `SMTP_HOST` and `SMTP_*` | unset | Optional authenticated relay override when `HEX_EMAIL_MODE=smtp` |
| `AI_FAST` | off | Accelerated AI ticks for simulations only |

The built-in administrator uses username **Benleethom** and player name **Ben**. When `HEX_ADMIN_PASSWORD` is omitted on the first production start, the server prints a one-time random temporary password in the deploy log. Ben sees every registered account in **User Management**, can reset non-admin passwords, and can permanently remove non-admin accounts after typing the username. Ordinary players see only their own account in **My Account**. Signed-in users can change their own password and verify a recovery email. The Railway + Cloudflare deployment sends verification and reset messages through Resend's HTTPS API, avoiding Railway's blocked direct-SMTP path and Cloudflare's paid Email Sending requirement. See `ADMIN_SETUP.md` for setup details and optional delivery overrides.

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

The Electron wrapper opens the hosted game at `https://hexsettlers.up.railway.app/`.

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
