# Cloudflare cutover to a standalone C++ engine

The CMake targets in this repository run the current C++ rules without Node.js.
They accept binary fixtures and do not implement the multiplayer HTTP or
WebSocket server. The production container still starts the JavaScript server.

## Run the independent rules locally

```powershell
cmake -S native/hex-core -B scripts/output/cpp-build
cmake --build scripts/output/cpp-build --config Release
ctest --test-dir scripts/output/cpp-build -C Release --output-on-failure
```

On Windows with Visual Studio, the Release directory contains
`hex_rules_runner.exe` and `hex_inventory_runner.exe`. Each runner takes an input
and output binary path. The fixture formats are defined in
`hex_rules_core.hpp` and `scripts/cuda-exact/hex_exact_common.h`.

## Staging and production sequence

1. Build a Linux executable that serves the existing game protocol on port 3000.
   Preserve WebSocket messages, HTTP account and lobby endpoints, session cookies,
   health checks, room restoration, and the private R2 state contract. Port the
   bootstrap restore into the native executable or a separate native bootstrap.
   A headless rules runner alone cannot serve the site.
2. Build the executable in CI or in a local Linux container. Use a runtime
   Dockerfile that copies the Linux binary and declares it as the entry point.
   Match the runtime base image to the executable's library dependencies.
   For Cloudflare Builds, retain the repository's copy-only image approach
   unless the build host supports Docker build-time containers.
3. Point the **staging** Wrangler configuration at that image or Dockerfile.
   Retain the Durable Object binding, port, and staging R2 bucket. Test with
   staging credentials and representative saved rooms. Exercise registration,
   reconnect, player and spectator WebSockets, Classic and Seafarers matches,
   and room restoration after a container restart. Compare deterministic
   full-game action replays against the existing server before cutover.
4. Once staging passes, record the currently deployed Worker version and
   container image digest and back up the private production state. Schedule
   the transition so existing matches can finish before the image changes.
   Keep the production Worker name, routes, Durable Object identity, R2
   binding, and secrets. Update the production configuration to point to the
   same validated native image digest, then deploy.

```powershell
npm.cmd ci --prefix cloudflare
.\cloudflare\node_modules\.bin\wrangler.cmd deploy --config wrangler.container.staging.jsonc
# After the native staging acceptance checks and production backup
.\cloudflare\node_modules\.bin\wrangler.cmd deploy --config wrangler.container.production.jsonc
```

5. Verify health, login, WebSocket upgrades, and saved-room restoration on the
   production host. If the cutover fails, redeploy the previously recorded
   Worker source and container image. Use a state format both versions can
   read during the rollout so rolling the executable back does not discard
   games or account updates.

A C++ container can run the backend without Node.js. The existing browser UI
and Cloudflare Worker remain JavaScript. Removing JavaScript from those layers
is a separate browser and edge-routing migration.

[Cloudflare Container configuration](https://developers.cloudflare.com/containers/configuration/wrangler/)
[Cloudflare WebSocket forwarding](https://developers.cloudflare.com/containers/examples/websocket/)
