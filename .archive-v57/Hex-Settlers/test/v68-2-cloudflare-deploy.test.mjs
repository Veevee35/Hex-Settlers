import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dockerfile = read('cloudflare/Dockerfile');
const dockerignore = read('.dockerignore');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));

test('GitHub auto-deploy Docker image does not use a build-time container process', () => {
  assert.match(dockerfile, /^FROM node:22-bookworm-slim$/m);
  assert.doesNotMatch(dockerfile, /^\s*RUN\s+/im,
    'RUN requires runc to mount /proc, which failed in the Workers Builds environment');
  assert.match(dockerfile, /^COPY --chown=node:node node_modules\/ \.\/node_modules\/$/m);
  assert.match(dockerfile, /^USER node$/m, 'runtime must remain unprivileged');
});

test('root node_modules is included in Docker context; secrets and runtime data are excluded', () => {
  const lines = dockerignore.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  assert.ok(!lines.includes('node_modules') && !lines.includes('node_modules/'),
    'root node_modules must not be ignored');
  assert.ok(lines.includes('cloudflare/node_modules'));
  assert.ok(lines.includes('.env*'));
  assert.ok(lines.includes('data'));
  assert.ok(lines.includes('users.json'));
});

test('container data directory is created with ownership node and startup still restores R2 state', () => {
  assert.ok(fs.existsSync(path.join(root, 'cloudflare/container-data/.keep')));
  assert.match(dockerfile, /^COPY --chown=node:node cloudflare\/container-data\/ \/data\/$/m);
  assert.match(dockerfile, /node cloudflare\/bootstrap\.mjs && exec node server\.js/);
  assert.match(read('cloudflare/bootstrap.mjs'), /CLOUDFLARE_STATE_ENDPOINT/);
});

test('container configuration retains production Worker name and R2 bucket', () => {
  const config = JSON.parse(read('wrangler.container.production.jsonc'));
  assert.equal(config.name, 'hex-settlers');
  assert.equal(config.containers[0].image, './cloudflare/Dockerfile');
  assert.equal(config.containers[0].image_build_context, '.');
  assert.equal(config.r2_buckets[0].bucket_name, 'hex-settlers-state');
  assert.equal(config.vars.HEX_EMAIL_FROM, 'no-reply@hexsettlers.org');
});

test('container receives the exact npm-locked websocket dependency', () => {
  assert.equal(pkg.dependencies.ws, '8.22.2');
  assert.equal(lock.packages['node_modules/ws'].version, pkg.dependencies.ws);
});
