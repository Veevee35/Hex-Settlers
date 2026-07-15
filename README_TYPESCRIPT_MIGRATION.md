# Hex Settlers – Railway TypeScript Migration (Stage 1)

This package preserves your **current game features and texture pack** exactly as-is, while adding a **TypeScript bootstrap layer** for safer Railway deployment and future migration.

## What changed
- Added `src/server.ts` (TypeScript bootstrap)
- Added `dist/server.js` (compiled bootstrap used at runtime)
- Added `tsconfig.bootstrap.json`
- `npm start` now launches `dist/server.js` (which validates env + loads legacy `server.js`)
- `npm run start:legacy` still runs the original server directly

## Why this is useful
A full feature-for-feature rewrite of both the 7k+ line client and 8k+ line server into another language is a large project.
This keeps the game running now on Railway **without losing assets/features**, while creating a safer path to migrate the codebase in stages.

## Best long-term language choice
For this game (heavy browser UI + custom textures + realtime multiplayer), the strongest path is:
- **TypeScript** for client and server (highest compatibility and lowest migration risk)
- Optional later: **Rust** or **Go** for the authoritative rules engine/server core, while keeping a TypeScript UI

## Railway deploy
- Create/point Railway project to this folder/repo
- Start command: `npm start`
- Railway should detect Node automatically
- Ensure `PORT` is provided by Railway (it usually is)

## Next migration stages (recommended)
1. Convert `server.js` into typed modules (`src/server/*`)
2. Add shared protocol types (`src/shared/protocol.ts`) for client/server messages
3. Migrate `public/app.js` into `src/client` TypeScript in slices (board, UI, networking, rules UI)
4. Add runtime schema validation for WS messages (e.g., Zod/Valibot)
5. Add persistence + replayable game-state snapshots/tests

