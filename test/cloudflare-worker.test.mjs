import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUpstreamRequest,
  isDynamicPath,
  normalizedUpstreamOrigin,
  requestHasAllowedOrigin,
} from '../cloudflare/worker.mjs';

test('Cloudflare Worker routes API, health, and WebSocket requests dynamically', () => {
  assert.equal(isDynamicPath('/api/auth/login'), true);
  assert.equal(isDynamicPath('/api/texture-packs/ABCD/pack'), true);
  assert.equal(isDynamicPath('/health'), true);
  assert.equal(isDynamicPath('/ws'), true);
  assert.equal(isDynamicPath('/app.js'), false);
  assert.equal(isDynamicPath('/texture-packs/simplified/manifest.json'), false);
});

test('Cloudflare Worker accepts only its own browser origin', () => {
  const sameOrigin = new Request('https://game.example/ws', {
    headers: { Origin: 'https://game.example' },
  });
  const foreignOrigin = new Request('https://game.example/api/auth/login', {
    headers: { Origin: 'https://attacker.example' },
  });
  const serverRequest = new Request('https://game.example/health');

  assert.equal(requestHasAllowedOrigin(sameOrigin), true);
  assert.equal(requestHasAllowedOrigin(foreignOrigin), false);
  assert.equal(requestHasAllowedOrigin(serverRequest), true);
});

test('Cloudflare Worker preserves the route while rewriting trusted proxy headers', () => {
  const request = new Request('https://game.example/api/auth/login?source=test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://game.example',
      Referer: 'https://game.example/account?tab=login',
      Host: 'game.example',
      'X-Forwarded-For': '203.0.113.10',
    },
    body: JSON.stringify({ username: 'tester', password: 'password' }),
  });

  const upstream = buildUpstreamRequest(request, 'https://backend.example');

  assert.equal(upstream.url, 'https://backend.example/api/auth/login?source=test');
  assert.equal(upstream.method, 'POST');
  assert.equal(upstream.headers.get('Origin'), 'https://backend.example');
  assert.equal(upstream.headers.get('Referer'), 'https://backend.example/account?tab=login');
  assert.equal(upstream.headers.has('Host'), false);
  assert.equal(upstream.headers.has('X-Forwarded-For'), false);
});

test('Cloudflare Worker validates the configured upstream protocol', () => {
  assert.equal(normalizedUpstreamOrigin('https://backend.example/path'), 'https://backend.example');
  assert.throws(() => normalizedUpstreamOrigin('ftp://backend.example'), /http or https/);
});
