# Public lobby browsing and Casual texture controls

- Casual Play exposes only Default and Simplified texture packs. Import/export/delete controls are hidden and blocked, including the in-game texture dialog. Other game modes retain custom pack functions.
- Public lobby browser includes live search, map family, capacity, AI-free and timer filters, and sorting. Clicking a lobby opens a separate detail page before joining.
- Lobby detail uses the room’s actual generated preview geometry (including hidden fog), with scenario, seats, players, readiness, AI difficulty, victory target, dice algorithm, and turn timer.
- Back navigation works through lobby details → public list → All Games → game type selection. If a lobby vanishes while joining, Back returns to its previous discovery page. Ranked has its own back button that cancels pending matchmaking. Existing Settings, language selection, and account dialogs retain their return behavior.
- Public discovery continues to filter private, Casual, ranked, active matches, and inaccessible friends-only lobbies on the server. The map and room data are read-only.
