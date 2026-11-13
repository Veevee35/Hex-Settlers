# Hex Settlers image for Cloudflare Workers Builds (GitHub auto-deploy).
# IMPORTANT: deliberately no Docker RUN instructions. Some Workers Builds hosts
# cannot start build-time containers because runc cannot mount /proc. The normal
# Workers Builds `npm clean-install` installs the root dependencies BEFORE
# `wrangler deploy`; copy them directly into this image instead.
#
# Before manual Wrangler deploys, run `npm ci --ignore-scripts` in project root.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Keep runtime dependency versions identical to the audited npm lockfile.
# Do NOT remove root node_modules from the Docker build context.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node node_modules/ ./node_modules/

COPY --chown=node:node server.js ./server.js
COPY --chown=node:node server/ ./server/
COPY --chown=node:node scripts/bump-version.cjs ./scripts/bump-version.cjs
COPY --chown=node:node build-version.json ./build-version.json
COPY --chown=node:node cloudflare/state-sync.js ./cloudflare/state-sync.js
COPY --chown=node:node cloudflare/bootstrap.mjs ./cloudflare/bootstrap.mjs
COPY --chown=node:node public/ ./public/

# The game runs as an unprivileged user and needs a writable /data directory.
# COPY with --chown creates /data without requiring a privileged build-time RUN.
COPY --chown=node:node cloudflare/container-data/ /data/
USER node
EXPOSE 3000
CMD ["sh", "-c", "node cloudflare/bootstrap.mjs && exec node server.js"]
