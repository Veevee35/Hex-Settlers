FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir -p /data && chown node:node /data
COPY --chown=node:node server.js ./server.js
COPY --chown=node:node server/ ./server/
COPY --chown=node:node scripts/bump-version.cjs ./scripts/bump-version.cjs
COPY --chown=node:node scripts/train_neural_ai_all_maps.js ./scripts/train_neural_ai_all_maps.js
COPY --chown=node:node build-version.json ./build-version.json
COPY --chown=node:node cloudflare/state-sync.js ./cloudflare/state-sync.js
COPY --chown=node:node cloudflare/bootstrap.mjs ./cloudflare/bootstrap.mjs
COPY --chown=node:node public/ ./public/
USER node
EXPOSE 3000
CMD ["sh", "-c", "node cloudflare/bootstrap.mjs && exec node server.js"]
