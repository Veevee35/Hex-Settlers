# Daily Challenge per-map attempts

Each account can now start **one game per daily map capacity (4, 5, 6, 7, 8 players)** during each Chicago-local daily challenge period. The reset remains **1:00 AM America/Chicago**.

- Starting a daily game claims only its day-and-player-count attempt. Creating a lobby does not consume an attempt.
- The Daily Challenge tabs report the status separately for each map. A used map is disabled; the other four remain available until played.
- Existing historical attempt records keyed by day are still recognized for their saved `playerCount`. Old attempts are not discarded or turned into five used maps.
- If game initialization fails, only that map's new claim is released.
- The server persists attempt markers in the existing user account database. No migration or new environment variables are needed.
- New helper and regression tests: `node --test test/daily-challenge-per-map.test.js`.
