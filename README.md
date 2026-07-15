# Hex Settlers (4‑Player Online)

A lightweight, Catan‑style browser game with lobby codes + online multiplayer (WebSocket).
Uses the provided hex tile art in `public/assets/`.

## What you need
- Node.js 18+ installed on the host machine.
- Your friends just need a modern browser. 

## Run locally (same Wi‑Fi / LAN)
1) Open a terminal in this folder
2) Install deps:
   ```bash
   npm install
   ```
3) Start the server:
   ```bash
   npm start
   ```
4) Open:
   - Host: http://localhost:3000
   - Friends on your LAN: http://YOUR_LAN_IP:3000 (e.g. http://192.168.1.25:3000)

## Play over the internet
You need the server reachable publicly.

### Option A: Port forward (quick + DIY)
- Forward TCP port **3000** on your router to the host computer.
- Share your public IP: `http://YOUR_PUBLIC_IP:3000`

### Option B: Tunnel (fastest, no router changes)
Use a tunneling tool like `ngrok` or `cloudflared`:
- Start the server (`npm start`)
- Then run a tunnel to port 3000, and share the URL it prints.

### Option C: Deploy to a Node host (recommended)
Deploy this folder to any Node hosting provider (Render, Fly.io, Railway, etc.)
- It’s a single Node server serving static files + WebSocket.

## Electron desktop release deployment
This repo now includes an Electron wrapper that opens the hosted Railway game URL:
- `https://hexsettlers.up.railway.app/`

### Build locally
```bash
npm install
npm run electron:dist -- --linux AppImage
```
(Use `--win nsis` or `--mac dmg` on those platforms.)

### Automated release deploy (GitHub Actions)
Tag a version and push it:
```bash
git tag v1.0.0
git push origin v1.0.0
```
The workflow `.github/workflows/electron-release.yml` builds Linux/Windows/macOS installers and publishes them to the GitHub Release for that tag.

## How to start a game
1) Each player creates an account (or logs in) from the **Account** section in the lobby.
2) One player clicks **Create Lobby**, then shares the 4‑letter room code.
3) Friends click **Join Lobby** and enter the code.
4) Host clicks **Start Game** once enough players have joined.

## Controls (in game)
- Setup: place settlement, then road (twice, snake order).
- Main turns: Roll → Build (roads/settlements/cities) → End Turn.
- If 7 is rolled: click a tile to move the robber, then choose a player to steal 1 random resource from (discarding for 7 is still not implemented).

## Notes
- Server keeps game state in memory; restarting the server ends active games.

## Development cards
- Buy Dev Card (cost: wool + grain + ore)
- Knight: move the robber + steal (counts toward Largest Army)
- Road Building: place up to 2 free roads this turn
- Invention: take any 2 resources
- Monopoly: take all of one resource type from all other players
- Victory Point: play at any time on your turn for +1 VP (VP cards are the only dev card you can play the same turn you buy)

## Missing rules
- This is still an MVP “Catan‑style” ruleset: ports, player trading, and Longest Road are not implemented.
