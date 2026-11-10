# V58 — Live Engine: Start Your Adventure

## First-launch experience

- On accounts without a completed tutorial, **Start Your Adventure** occupies the former Casual Play position (the third game-type option).
- **All Games** and **Ranked Play** are visibly locked until the tutorial is completed. The server also rejects normal-room creation, joining and ranked queue entry from unfinished accounts.
- Completing the tutorial permanently unlocks All Games, Ranked and the regular Casual Play button for that account. The account's completion marker is saved with the existing users database.

## The real tutorial game

- Entering Start Your Adventure creates an actual private server-managed lobby, running the normal game engine.
- A standard 4-player Classic map (19 land hexes) is used, with **two occupied seats: one human player and one Easy AI**.
- The ordinary Game Setup panel and live map preview are displayed, but setup settings are read-only to keep the tutorial consistent.
- Timers are disabled and the AI plays first, slowing down between decisions so the learner can watch its settlement, road, dice and turn actions.
- A persistent on-screen guide highlights the actual game board and normal game controls, explains setup placement order and resource mechanics, and handles seven/robber rules when they occur.
- Completion is earned only through server-validated gameplay: the learner places **two settlements**, connects **two opening roads**, **rolls twice**, and **ends two normal turns**. This is not a mock screen or click-through overlay.
- Tutorial games are untracked: no ranked/unranked statistics or game history are affected.
- The tutorial room and game progress are included in active room serialization. On a short refresh/reconnect the client attempts to rejoin that same tutorial room. Exiting early does not unlock play.
- Existing unlocked players may replay Start Your Adventure from All Games.

## Deployment

Deploy this full project as before via the GitHub → Cloudflare workflow. No new environment variables or migrations are needed. Existing accounts without a tutorial completion marker will be prompted to complete it.

## Validation

- JavaScript syntax checks and TypeScript bootstrap compilation passed.
- Focused tests passed for this change and previous lobby/navigation changes (new tutorial tests, v53 through v58 and account/invite tests).
- The complete WebSocket end-to-end integration suite was **not** verified in this environment because the project `ws` npm dependency was not available locally. Test a new account and returning account on staging before production deployment.
