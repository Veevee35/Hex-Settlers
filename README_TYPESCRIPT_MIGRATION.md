# TypeScript migration status

The deployment entry point is TypeScript, while the mature game engine and browser client remain JavaScript to avoid changing gameplay during the migration.

## Completed

- Typed, validated deployment bootstrap in `src/server.ts`
- Shared protocol types in `src/shared/protocol.ts`
- Runtime client-message validation
- Extracted CommonJS modules for rules, security, configuration, persistence, browser sessions, and active-room recovery
- Node built-in unit and end-to-end integration tests
- Atomic queued JSON persistence and restartable active-room snapshots

`npm start` launches `dist/server.js`, which validates the project layout and loads `server.js`. `npm run start:legacy` remains available for direct development.

## Recommended migration sequence

1. Move board generation and geometry into pure, tested modules.
2. Move authoritative game actions into scenario-focused modules while keeping `applyAction` as the compatibility facade.
3. Convert the browser client in vertical slices: networking, lobby, board renderer, then tool panels.
4. Replace permissive protocol payload types with action-specific schemas and generated browser/server validators.
5. Introduce a transactional database adapter if multi-instance hosting or larger-scale history is required.

Run `npm run check` after every slice. The existing integration tests are the external-behavior guardrail.
