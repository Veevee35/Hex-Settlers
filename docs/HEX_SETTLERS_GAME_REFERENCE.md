# Hex Settlers: Player and Diagnostic Reference

**Public edition | Version 1.0 | 6 November 2026**

This booklet explains how the game works, what every major control does, how the supported maps differ, and what to check when play does not look right. It describes the public game and contains no account records, email addresses, room data, session tokens, chat messages, or other user data.

> **Fast answer:** The server is authoritative. A highlighted choice is a preview; the result is final only after the server accepts it and sends the updated game state to every player.

## Index

1. [Quick start](#1-quick-start)
2. [Game objective and scoring](#2-game-objective-and-scoring)
3. [Accounts, portal, and joining](#3-accounts-portal-and-joining)
4. [Lobby and game setup](#4-lobby-and-game-setup)
5. [Setup placement](#5-setup-placement)
6. [A normal turn](#6-a-normal-turn)
7. [Production, Gold Fields, and rolling 7](#7-production-gold-fields-and-rolling-7)
8. [Building, pieces, and placement](#8-building-pieces-and-placement)
9. [Trading](#9-trading)
10. [Development cards](#10-development-cards)
11. [Robber, pirate, and Friendly Robber](#11-robber-pirate-and-friendly-robber)
12. [Longest Road and Largest Army](#12-longest-road-and-largest-army)
13. [Ships and Seafarers rules](#13-ships-and-seafarers-rules)
14. [Maps and scenarios](#14-maps-and-scenarios)
15. [Five- and six-player paired turns](#15-five--and-six-player-paired-turns)
16. [Ranked play and rating](#16-ranked-play-and-rating)
17. [AI players](#17-ai-players)
18. [Game tools and accessibility](#18-game-tools-and-accessibility)
19. [Pause, undo, ending, rematch, and departure](#19-pause-undo-ending-rematch-and-departure)
20. [Spectators, history, replay, and summaries](#20-spectators-history-replay-and-summaries)
21. [Connection, refresh, caching, and recovery](#21-connection-refresh-caching-and-recovery)
22. [Privacy and security boundaries](#22-privacy-and-security-boundaries)
23. [Troubleshooting index](#23-troubleshooting-index)
24. [Diagnostic report - 6 November 2026](#24-diagnostic-report---6-november-2026)
25. [Feature verification matrix](#25-feature-verification-matrix)
26. [Glossary](#26-glossary)

---

## 1. Quick start

1. Sign in, then choose **Unranked** to create or join a configurable lobby, or **Ranked** to enter the competitive queue.
2. In an unranked lobby, the host selects the map, scenario, timers, dice system, bank size, discard limit, victory target, development deck, and optional rules.
3. Every human player marks themselves **Ready**. The host starts when the lobby meets the selected map's player requirements.
4. During setup, place a settlement and connected route when the game highlights legal positions. Setup uses forward order, then reverse order.
5. On a normal turn: optionally play an eligible card (and, in Seafarers, optionally move an end ship), roll, resolve any required choice, build/trade/play, then select **End Turn**.
6. The first player to reach the selected victory-point target wins immediately.

### Default game values

| Setting | Default |
| --- | --- |
| Map | Classic |
| Victory target | 10 VP |
| Bank | 19 cards of each resource; expanded maps normally use 24 |
| Discard threshold | More than 7 cards |
| Timers | 60 s setup / 30 s normal turn / 15 s micro choice |
| Dice | Random |
| Development deck | 25 cards |
| Friendly Robber | Off |
| Seafarers exploration points | On |

## 2. Game objective and scoring

Reach the lobby's victory target before anyone else. The server recalculates score after scoring actions and ends the game as soon as the target is reached.

| Source | Value |
| --- | ---: |
| Settlement | 1 VP |
| City | 2 VP total (it replaces the settlement's 1 VP) |
| Longest Road | 2 VP while held |
| Largest Army | 2 VP while held |
| Played Victory Point card | 1 VP |
| Scenario exploration bonus | Usually 2 VP when enabled; see the scenario |

The host may change the unranked target from a scenario's default. Ranked targets and rules are server-owned.

## 3. Accounts, portal, and joining

### Account flow

- The landing page provides log in, account creation, password recovery, Terms of Service, and Privacy Policy.
- Browser authentication uses an HTTP-only, same-site session cookie. The game can migrate an older locally stored token into that cookie.
- A verified recovery email supports password reset. Public game views do not display email addresses.
- The account menu provides Player Stats, Game Log/history access, account management, and log out. Administrative controls are shown only to an authorized administrator.

### Ways to enter a game

- **Create Lobby:** creates a new configurable unranked room.
- **Join by room code:** joins a known room as a player when a seat is available.
- **Direct invite link:** opens the intended lobby after authentication and takes priority over a saved ranked/unranked choice.
- **Spectator link:** opens the room without occupying a player seat.
- **Rejoin Last Room:** recovers the authenticated player's seat after a disconnect, reload, or browser restart when the room still exists.
- **Ranked queue:** collects four ready human players, then opens a timed scenario ballot.

## 4. Lobby and game setup

Only the unranked host can change the lobby rule set. The server retains the authoritative copy and broadcasts changes to all members.

### Configurable rules

- **Map:** Classic, Classic 5-6, Seafarers, or Seafarers 5-6.
- **Scenario:** the choices listed in [Maps and scenarios](#14-maps-and-scenarios).
- **Victory target:** scenario defaults may be overridden in unranked play.
- **Timer speed:** Fast is half the normal setup/turn/micro duration; Slow is double. Discard remains 30 seconds.
- **Dice algorithm:** Random, Balanced Bag, Probability Corrected, or Streak Breaker.
- **Bank size:** cards available per individual resource type, from 1 through 40.
- **Discard limit:** hand size above which a rolled 7 requires a discard.
- **Friendly Robber:** protects low-score players as described below.
- **Exploration VP:** enables or disables scenario exploration awards.
- **Development deck:** 13, 25, or 38 cards.
- **Random map at start:** withholds the final randomized layout until the game starts.
- **AI seats and difficulty:** available in unranked play.

### Dice algorithms

| Mode | Behavior |
| --- | --- |
| Random | Independent fair six-sided dice on every roll. |
| Balanced Bag | Shuffles all 36 ordered dice pairs, producing the exact 2d6 distribution once per 36-roll cycle. |
| Probability Corrected | Remains random but gently boosts totals that are behind their expected frequency. |
| Streak Breaker | Fair random rolls except the same total cannot appear three times consecutively. |

### Development-deck options

| Deck | Knights | Road Building | Invention | Monopoly | Victory Point |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 13 | 7 | 1 | 1 | 1 | 3 |
| 25 | 14 | 2 | 2 | 2 | 5 |
| 38 | 21 | 3 | 3 | 3 | 8 |

## 5. Setup placement

Setup uses snake order:

1. Players place one settlement and a connected route in seating order.
2. The order reverses for the second settlement and route.
3. A Classic route is a road. A Seafarers setup route may be a road or ship.
4. After the second settlement, the player collects one matching resource from each adjacent standard producing land tile, if the bank can supply it. Gold Fields do not pay setup resources.
5. The distance rule and scenario-specific starting-area restrictions always apply.

The setup timer is server-authoritative. If it expires, the game resolves a legal automatic choice when possible so play can continue.

## 6. A normal turn

### Standard turn

1. **Pre-roll options:** play one eligible development card. In Seafarers, the player may also use their one legal end-ship move before rolling.
2. **Roll:** roll two dice. The server resolves production or the special 7 sequence.
3. **Required choices:** complete discards, Gold choices, robber/pirate movement, steals, or other prompted actions before continuing.
4. **Action phase:** build, trade, buy a development card, play an eligible card (if the one-card limit has not been used), or move an end ship if that move remains available.
5. **End:** select **End Turn**. The game will not advance while a mandatory choice is unresolved.

### Timing

- Normal defaults: 60 seconds per setup placement, 30 seconds per turn, 15 seconds per short choice.
- A successful player trade adds 10 seconds to the initiator's current turn.
- A successful bank trade can add 5 seconds to the live turn segment.
- Opening a trade window does not pause time.
- An end-turn warning sounds six seconds before a live countdown expires, subject to the local audio setting.

## 7. Production, Gold Fields, and rolling 7

When a number is rolled, each adjacent settlement normally receives one matching card and each adjacent city receives two. Sea and desert do not produce. A robber-blocked tile produces nothing.

If supply is insufficient, the bank pays only what can legally be distributed from its remaining cards. The resource summary distinguishes actual gains/losses from blocked production opportunities.

### Gold Fields

Gold is not a sixth hand resource. An eligible player chooses a standard resource from the bank for each Gold production owed. The choice uses the micro timer. A Fog Island Gold discovery also prompts a single resource choice.

### Rolling 7

1. Every player above the configured limit discards half their hand, rounded down, within 30 seconds.
2. After all required discards, the roller moves the robber or, in Seafarers, may choose the pirate.
3. The roller may steal one random resource from an eligible adjacent opponent.

## 8. Building, pieces, and placement

| Item | Cost | Purpose |
| --- | --- | --- |
| Road | 1 brick + 1 lumber | Extends a land/coastal network. |
| Ship | 1 lumber + 1 wool | Extends a Seafarers sea/coastal route. |
| Settlement | 1 brick + 1 lumber + 1 wool + 1 grain | Adds production and 1 VP. |
| City | 2 grain + 3 ore | Upgrades a settlement to double production and 2 VP total. |
| Development card | 1 wool + 1 grain + 1 ore | Draws the top card of the selected deck. |

### Placement rules

- Settlements must be at least two edges from every settlement or city.
- Outside setup, a settlement must connect to the player's route network.
- A city can only replace that player's existing settlement.
- A road must occupy a legal land or coastal edge and connect to the player's network or building.
- A ship must occupy a legal sea or coastal edge and connect through ships or the player's building.
- Piece supply, paid cost, terrain, ownership, blockers, phase, and current player are all validated by the server.
- New roads, ships, settlements, and cities receive a brief enlarged visual emphasis to make the accepted placement easy to spot.

## 9. Trading

### Bank and ports

- Default bank rate: 4 of one resource for 1 desired resource.
- Generic port: 3 of one resource for 1.
- Specific port: 2 of the pictured resource for 1.
- Mixed-resource bank baskets are supported: each offered resource must independently satisfy its applicable ratio, and each completed outgoing group earns one incoming card.
- A trade cannot both give and receive the same resource.

### Player trade

- The initiator selects resources offered and requested.
- Eligible players can accept, reject, close, and reopen the same live offer; reopening does not erase their response.
- The initiator may revise an offer. A revised offer prompts participants again.
- Completed and expired offers cannot be reopened.
- Private hands remain private; the server sends each participant only the hand data they are allowed to see.
- Spectators and replay viewers cannot trade. Player-to-player trading is unavailable during a paired Player 2 turn.

## 10. Development cards

- **Knight:** counts toward Largest Army; moves the robber or pirate and may produce a steal.
- **Road Building:** places up to two free roads, or in Seafarers two roads/ships in any combination. Each placement remains subject to legality and piece supply.
- **Invention:** takes exactly two chosen resources from the bank.
- **Monopoly:** names one resource and takes all of it held by other active players. The private log shows affected players the details; public history remains appropriately generic.
- **Victory Point:** adds one revealed VP and may be played immediately, including on the purchase turn.

A newly purchased non-VP card cannot be played that same turn. At most one non-VP development card may be played per turn. A played card is consumed and removed from the hand.

## 11. Robber, pirate, and Friendly Robber

### Robber

- Must move to a different land tile.
- Blocks all production from that tile.
- May steal from an opponent with a building adjacent to the destination.

### Pirate

- Exists in Seafarers and must move to a different legal sea tile.
- Blocks building and moving ships on adjacent edges.
- May steal from an opponent with a ship adjacent to the destination.
- In Fog Island, it cannot occupy an unrevealed fog tile.

### Friendly Robber

When enabled, the robber cannot move beside an active player's building while that player has 2 VP or fewer. The equivalent protection applies to pirate moves beside a protected player's ships. Setup, human targeting, server validation, timer fallback, and AI behavior share this rule.

## 12. Longest Road and Largest Army

- Longest Road requires a continuous route of at least five of the player's roads; in Seafarers, roads and ships combine.
- An edge cannot count twice. An opponent building blocks continuation through its intersection.
- Largest Army requires at least three played Knights.
- Taking either title from its holder requires strictly exceeding the holder's recorded total. A tie is not enough.
- If no eligible current holder exists and the lead is tied, the title remains unclaimed.
- If a title holder departs, the recorded title and points remain until an active player strictly surpasses the benchmark.

## 13. Ships and Seafarers rules

- Ships cost 1 lumber and 1 wool and use sea or coastal edges.
- Ships and roads combine for Longest Road when connected through the player's building/network.
- Once per turn, before or after rolling, a player may move one ship from an open route end to another legal connected edge.
- An enclosed ship cannot move. A ship placed during the current normal or paired action opportunity cannot immediately move.
- The pirate blocks adjacent ship placement and movement.
- Gold Fields grant chosen standard resources.
- Unless a scenario says otherwise, the first settlement a player builds on each new island after setup grants 2 exploration VP when the option is enabled.

## 14. Maps and scenarios

### Classic

Two to four players, roads only, normal robber, standard ports and development cards. No ships, pirate, Gold Fields, fog, exploration bonuses, or paired turns. Default target: 10 VP.

### Classic 5-6

Five or six players on an expanded land board with 11 ports, larger default bank, and paired turns. No Seafarers elements. Default target: 10 VP unless changed.

### Four Islands

Two to four players. Normal Seafarers setup across island groups. A player's first settlement on each newly reached island is normally worth 2 bonus VP. Default target: 13 VP.

### Six Islands

Five or six players on the expanded Seafarers layout. Uses 11 ports (normally two per island except one on the top-center island), exploration bonuses, and paired turns. Default target: 13 VP.

### Through the Desert

Players place both starting settlements on the designated main starting area; Gold intersections are not starting positions. Ports cover outer islands and land beyond the desert. The four-player scenario grants a one-time 2 VP beyond-desert bonus in addition to eligible new-island scoring. The expanded version has multiple eligible desert regions; one settlement can claim at most one such region bonus. Default target: 14 VP.

### Fog Island

Starting settlements are restricted to revealed starting islands. Fog acts as sea until explored. Placing or moving a road or ship beside fog reveals one adjacent hidden tile from a revealed edge. A normal revealed resource tile awards one matching resource if available; revealed Gold prompts a choice; sea grants nothing. Pirate placement remains on revealed sea. Newly revealed land masses can earn exploration VP. Four-player default target: 12 VP; the expanded map uses paired turns.

### Heading for New Shores

Both starting settlements go on the main island. Each outer island has a port and contains Gold Fields. Players sail outward; the first eligible settlement on each new island normally grants 2 VP. Default target: 14 VP.

### Cartographer

Before normal settlement setup, players take turns placing tiles from personal inventories into legal positions. After the draft, the server assigns numbers, robber, pirate, and ports. Desert divides land masses for exploration scoring. Number assignment never places a 6 or 8 on Gold. Four-player default target: 12 VP; the expanded draft uses paired turns.

### Scattered Tiles

The server builds a randomized Cartographer-style Seafarers board before normal setup. Coastlines, resources, and routes vary. Desert divides land masses for exploration scoring, and Gold never receives 6 or 8. Four-player default target: 12 VP; the expanded version uses paired turns.

### Test Builder

A sandbox in which the host paints tile types/numbers and places typed ports on valid shoreline edges. Ports cannot share a corner and are removed if later painting makes the edge invalid. Sea and desert ignore number selection. The standard frame supports solo testing; the expanded frame supports five or six players. After lock-in, normal Seafarers rules apply wherever the custom terrain allows. Test Builder is unranked only.

## 15. Five- and six-player paired turns

Expanded Classic and Seafarers games use a two-part cycle:

1. **Player 1** rolls and receives a full action phase.
2. If the game has not ended, the third remaining player to Player 1's left becomes **Player 2**.
3. Player 2 receives an action-only phase: no roll or production, and only bank/port trading is permitted.
4. Play advances to the next Player 1.

The UI displays a prominent paired-turn indicator. Timers, undo snapshots, ship-move locks, and trade restrictions distinguish the two opportunities.

## 16. Ranked play and rating

- Ranked matchmaking uses one server-authoritative queue for four human players.
- When four ready players are present, the server offers a 30-second, three-option scenario ballot. Players may revise or abstain.
- Ranked candidates come from Classic, Four Islands, Through the Desert, Fog Island, Heading for New Shores, Cartographer, and Scattered Tiles. Test Builder is excluded.
- The server locks the final scenario rules: normal timers, Friendly Robber off, Probability Corrected dice, scenario default victory target, and no surprise map.
- Ranked Back and End Game controls are disabled.
- Ratings start at 1000. In an equal four-player result, the winner gains 24 and each loser loses 8. The multiplayer calculation preserves the point pool and accounts for rating expectations.
- AI players never enter the rating pool. Invalid or duplicate outcomes cannot change rating.
- Player Stats separates Ranked, Unranked, and Combined views; unranked results do not change rating.
- Ranked rematch returns the player to a ready state and never silently re-enqueues them.

## 17. AI players

Unranked games support three AI families:

- **Normal:** rules-aware baseline actions.
- **Expert:** heuristic tactical scoring for production, routes, building, robber/pirate targeting, victims, and configurable expert weights.
- **Neural:** a trained policy with resource, Gold-income, opponent-progress, blocked-production, fast-victory, and opponent-denial signals.

AI actions remain server-authoritative and follow the same costs, phase restrictions, Friendly Robber rules, dice outcomes, placement validation, and victory target as humans. Training and simulation modes can accelerate internal ticks, but normal human games use the live game cadence.

## 18. Game tools and accessibility

### Information tools

- **Resources:** bank supply, public card counts, pieces, played Knights, titles, and the local player's exact hand.
- **Game Log:** rolls, builds, trades, cards, scoring, and other actions, with private detail filtered by viewer.
- **Dice Stats:** total-frequency and player/probability views.
- **Resource Summary:** gains and losses by source, including Gold and blocked production.
- **Chat:** room communication.
- **Rules:** active settings, map/scenario, timers, deck, discard limit, dice mode, and bank maximum.

### Local presentation controls

- Separate audio sliders exist for turn bell, paired turn, own/other dice, Gold, robber/pirate, stolen-from, building, own/other end-turn warnings, development card, trade events, and win/loss sounds.
- Audio preferences are stored per current account/owner where available; legacy settings migrate.
- Colorblind mode adds token markers and persists locally.
- Game-tool panels support local scaling. The board supports zoom/pan and auto-fit.
- Mobile uses a draggable split divider between board and sidebar; touch, pointer, and keyboard resizing persist locally.
- The action bar, prompts, trade UI, and postgame tabs adapt to small screens.
- Custom texture packs can be uploaded/shared in unranked rooms, downloaded by other players, selected in game, and removed by their owner; **Simplified** is a complete built-in alternative.

## 19. Pause, undo, ending, rematch, and departure

- The host can pause and resume. Gameplay actions stop while paused, although participants may inspect an existing trade.
- **Back/previous turn** proposes a server-authoritative vote and restores the saved beginning of the previous player turn only after approval. The restored game stays paused until **Play**.
- Ending an unranked active game requires the remaining players' unanimous vote. AI-only opposition uses a five-second withdrawal window. Ranked early-end is disabled.
- **Main Menu** leaves the room and restores the appropriate game-type screen.
- **Rematch** creates/reuses one persisted rematch room code and transfers only players who click it; it does not drag other participants out of the completed room.
- When a player leaves, their hand returns to the bank. Built roads, ships, settlements, and cities remain and continue to affect routes and blocking.
- A new eligible host is selected when the host leaves.

## 20. Spectators, history, replay, and summaries

- Spectators do not take a seat or turn. A dedicated spectator invite joins directly.
- A live spectator may inspect an active player's exact resources/development cards through the Resources tool; ordinary active players retain private-hand filtering.
- Completed games store metadata, final/postgame state, public/private-safe logs, ranked flag, and applicable rating changes.
- Replay provides previous/next controls and a full-width action scrubber. Each successful recorded state can be reconstructed without recursively embedding the replay.
- Postgame tabs cover the overview, players, resources, development cards, dice, log, and replay/history tools. Mobile cards and charts reflow for narrow screens.
- Winner and loser audio is sent only to the matching local player.

## 21. Connection, refresh, caching, and recovery

### What the client does

- One WebSocket carries live room/game events. Retired sockets are ignored, and only one reconnect timer is retained.
- A heartbeat detects proxy connections that look open but have stopped passing messages.
- On interruption, the client preserves local room context, reconnects with increasing delay, authenticates via cookie, and requests authoritative room state.
- Safe room-scoped messages wait until rejoin is confirmed.
- Active room snapshots survive a clean server restart; socket objects and transient previews are excluded from persisted data.
- PNG and WAV assets are cached by a versioned service worker. Old cache generations are removed on activation.
- Board draws are coalesced to one animation frame and use a single layout read per paint burst.

### Human recovery sequence

1. Wait for **Connected** or **Reconnecting to the room** to settle.
2. If the seat does not return, use **Rejoin Last Room**.
3. A normal reload is safe; the server remains authoritative.
4. If a newly deployed visual or sound asset still looks old, reload once after the deployment has completed. The unified cache build now rolls app, style, image, and sound generations consistently.
5. If another browser/tab owns the same room session, the game tells the player to use **Rejoin Last Room** in the preferred tab to take the seat back.

## 22. Privacy and security boundaries

- Passwords are salted and hashed; password verification is asynchronous.
- Session tokens are stored as hashes; browser sessions use HTTP-only, same-site cookies and Secure when TLS is trusted.
- Authentication attempts are rate-limited.
- Same-host or explicitly configured WebSocket origins are allowed; forwarded security headers are trusted only when proxy trust is enabled.
- Ordinary messages have a strict size limit; texture packs use a separate controlled upload path and allowance.
- Public state never exposes another active player's exact hand. Private steal and Monopoly details go only to authorized viewers; public history uses generic text.
- Administrative account and room operations are server-authorized.
- Persistence uses serialized atomic replacement and clean-shutdown flushing.
- The legal-document modal permits only same-origin framing; third-party sites remain blocked from framing the game.
- This booklet contains architecture and gameplay information only. It contains no runtime user database contents, personal emails, passwords, hashes, tokens, chat, room snapshots, IP addresses, or private game hands.

## 23. Troubleshooting index

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Page only looks correct after refresh | Old asset generation or an interrupted initial connection | Wait for Connected, then reload once. Confirm app/style URLs share the current release tag. |
| Disconnected/reconnecting message | WebSocket interruption or proxy idle connection | Wait for automatic reconnect; use Rejoin Last Room if needed. |
| Session active in another tab | A newer socket claimed the same room seat | Use Rejoin Last Room in the tab you want to keep. |
| First click makes a robotic sound | Old client briefly primed all pooled audio audibly | Deploy the 6 Nov 2026 fix; current priming is silent. Reload once after deployment. |
| Sound is missing | Browser gesture lock or a local slider at 0 | Click/tap once, then inspect Audio sliders. |
| Sound is too loud | A local per-effect slider can reach 200% | Reduce the specific effect rather than muting all audio. |
| Board feels laggy during bursts | Many state/image/resize events or an underpowered device | Current client coalesces paints once per frame. Close duplicate tabs and reset board zoom if needed. |
| Cannot build where expected | Wrong phase, insufficient resources/pieces, distance/connectivity rule, terrain, or blocker | Read the on-screen error and verify highlighted legal targets. |
| Cannot move a ship | Not an open end, already moved, newly placed this opportunity, pirate block, or illegal destination | Select another open end or wait for the next turn opportunity. |
| Cannot trade with a player | Pre-roll/required phase, paused state, spectator/replay, or paired Player 2 turn | Finish required actions; paired Player 2 may use only bank/ports. |
| Production seems short | Robber block or bank shortage | Check Resource Summary and bank supply. |
| Title did not transfer on a tie | Strict-surpass rule | Exceed the holder's total; tying is not sufficient. |
| Fog tile did not reveal | Route was not legally adjacent from a revealed edge | Begin exploration from revealed terrain and use a legal road/ship placement or move. |
| Terms/Privacy says refused to connect | Old server used frame-deny headers | Deploy the 6 Nov 2026 same-origin framing fix. |
| Mobile panels are cramped | Split ratio or tool scale is locally persisted | Drag/keyboard-adjust the divider and reduce the panel scale. |
| A texture pack is unavailable | Room confirmation/download incomplete or owner removed it | Wait for confirmed room state, fetch it from the lobby row, or select a built-in pack. |
| Game action appears ignored | Socket changed between click and send or server rejected it | Check the connection/error message; the client reconnects safely without inventing state. |

## 24. Diagnostic report - 6 November 2026

### Scope

The reliability pass covered production build, syntax, unit rules, browser/client behavior, live HTTP/WebSocket integration, restart recovery, persistence, security, every standard playable map, ranked flow, six-player latency, texture transfer, mobile layout contracts, audio routing, and a live browser first-load/reload/legal-viewer smoke test.

### Defects found and corrected

1. **Audible audio priming caused a robotic startup burst.** On the first pointer/key interaction, every element in every sound pool briefly played at its configured volume before pausing. The pool now saves the target volume, primes at volume zero, pauses/rewinds, and restores the configured value on success or failure.
2. **Asset cache release IDs were inconsistent.** The HTML and service worker used `mobile-summary-v22`, while the client registered `ranked-lobby-v20`. The client now uses the same release ID as the shell and service-worker cache, making deployment rollover deterministic.
3. **In-app legal documents were blocked by the server's own framing policy.** The modal iframe showed a refusal page. Security headers now allow same-origin framing only (`SAMEORIGIN` and CSP `frame-ancestors 'self'`), preserving cross-origin clickjacking protection.

### Automated results

- **263 tests passed, 0 failed, 0 skipped** in the first complete run after the cache/audio fix.
- Production TypeScript bootstrap compiled successfully.
- `server.js` and `public/app.js` passed syntax checks.
- Live six-player action-to-state timing measured **7.0 to 8.3 ms locally**, host first; this is well below one animation-frame budget before real network latency.
- The added targeted regression group passed **14/14** after the legal-viewer correction.
- Every map/scenario preview produced valid ports; completed Seafarers maps started with a valid pirate.
- Authentication, lobby, chat, expert tuning, game start, cookies, texture sharing, heartbeat replacement, account management, email recovery test transport, persistence, and clean restart passed live integration coverage.

### Live browser results

- First load reached the login landing screen with current `app.js` and `styles.css` release tags.
- Reload returned to the same usable landing state without browser warnings/errors.
- Terms opened inside the game modal after the header correction and exposed the complete document accessibility tree.
- No browser console warnings or errors were observed in the tested first-load, reload, or corrected legal-viewer flow.

### Performance assessment

The code already contains two important anti-lag controls: board updates are coalesced to one `requestAnimationFrame`, and each paint burst reads the canvas layout once. Networking rejects stale sockets and queues safe room messages until recovery. The measured local server path is fast; perceived lag in deployment will primarily depend on client rendering capacity, texture sizes, and network distance/quality. This pass did not claim a synthetic Internet latency value.

### Residual operational checks

- Run the complete check before every release.
- After deployment, test first visit and one reload in a clean browser profile on desktop and a physical phone.
- Confirm the deployed HTML, client registration, and service-worker cache all carry the same release identifier.
- Watch server health, reconnect frequency, action round-trip time, and client console errors without collecting private hand/chat content.
- Keep mutable runtime data outside the repository and retain backups appropriate to the hosting platform.

## 25. Feature verification matrix

| Area | Verified behavior | Evidence type |
| --- | --- | --- |
| Build/runtime | TypeScript bootstrap builds and serves current entry point | Build + integration |
| Core rules | Production, costs, placement, 7/discards, titles, cards | Unit + integration |
| Maps | Classic, expanded, all standard Seafarers, both Test Builders | Unit + simulation/integration |
| Multiplayer | Two through six players, readiness, private hands, chat | Integration |
| Ranked | Queue, ready state, ballot, locked rules, rating updates | Unit + integration |
| Trading | Bank, ports, mixed baskets, player proposals/revisions/timers | Unit + client contracts |
| Audio | Routing, local sliders, targeted win/loss/stolen sounds, silent priming | Unit + code/browser smoke |
| Networking | Single reconnect timer, stale-socket guards, heartbeat, rejoin | Unit + integration |
| Persistence | Users, active rooms, history/model, atomic writes, restart | Unit + integration |
| Mobile | Split layout, keyboard/touch divider, action/prompt/postgame layouts | Client contract tests |
| Rendering | Board auto-fit and one-paint-per-frame burst behavior | Client rendering tests |
| Security | Cookies, origin/proxy policy, rate limit, safe projections, framing | Unit + integration + browser |
| Privacy | Hand filtering and private/public log separation | Integration + unit |
| Replay/history | Action patches, scrubber, postgame tabs, saved frames | Unit/client contracts |
| Texture packs | Built-in Simplified pack and shared upload/download/select flow | Unit + integration |
| Legal UI | Terms/Privacy actions and same-origin in-modal rendering | Unit + live browser |

## 26. Glossary

- **Action phase:** the post-roll portion of a normal turn, or the whole action-only paired Player 2 opportunity.
- **Active player:** the human or AI currently authorized to act.
- **Bank:** the server-tracked supply of standard resource cards.
- **Blocked production:** resources that would have been produced but for the robber; recorded as opportunity loss, not a hand loss.
- **Exploration VP:** optional scenario points, usually awarded for the first settlement a player establishes on a new land mass.
- **Gold Field:** a producing tile that lets the receiving player choose a standard resource.
- **Micro phase:** a short required choice such as a steal target or Gold resource.
- **Paired turn:** the expanded-map Player 1 full turn followed by Player 2's action-only opportunity.
- **Private state:** information sent only to an authorized viewer, such as the viewer's exact hand.
- **Server-authoritative:** the server validates and decides the official result; the browser displays and requests actions.
- **Snapshot:** a recoverable serialized room/game state that omits live sockets.
- **Spectator:** a viewer who does not occupy an active seat or take turns.

---

### Maintainer note

Keep this Markdown file as the public source of truth. Rebuild the PDF after material rule, UI, scenario, or diagnostic changes, and update the date, test totals, and release identifier. Do not paste runtime logs or persistence files into the public booklet.
