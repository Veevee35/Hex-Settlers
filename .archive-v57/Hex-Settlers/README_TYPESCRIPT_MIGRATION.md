# TypeScript migration status

The production entry point is `src/server.ts`, compiled to `dist/server.js`. It validates the hosting environment and loads the existing `server.js`, so the browser protocol and game engine remain unchanged during migration.

Completed foundations:

- typed production bootstrap and validated payload configuration;
- shared client/server message vocabulary in `src/shared/protocol.ts`;
- extracted, unit-tested JavaScript modules for rules, security, protocol validation, persistence, HTTP cookies, runtime configuration, and active-room snapshots;
- live compatibility tests around the legacy engine.

The large rules engine and browser client are still JavaScript. The safest next migration is incremental: move one tested domain at a time behind the existing protocol, add precise payload types and runtime schemas, then migrate the browser networking boundary before UI/rendering code. Avoid a feature rewrite while the classic, seafaring, AI, replay, and texture systems remain coupled.

Commands:

```bash
npm run build
npm run check
npm run start:legacy
```

`npm start` always uses the compiled bootstrap. `npm run start:legacy` is a development escape hatch and runs the same authoritative server directly.
