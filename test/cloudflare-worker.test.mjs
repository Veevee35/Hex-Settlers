import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUpstreamRequest,
  handleEmailBridge,
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

test('Cloudflare email bridge rejects requests without its shared secret', async () => {
  let sent = false;
  const response = await handleEmailBridge(new Request('https://game.example/api/internal/send-email', {
    method: 'POST', body: JSON.stringify({ to: 'player@example.com', subject: 'Verify', text: 'Code' }),
  }), {
    EMAIL_BRIDGE_SECRET: 'bridge-secret',
    EMAIL_FROM: 'Hex Settlers <no-reply@example.com>',
    EMAIL: { async send() { sent = true; } },
  });
  assert.equal(response.status, 401);
  assert.equal(sent, false);
});

test('Cloudflare email bridge sends an authorized message with the fixed sender', async () => {
  let message;
  const response = await handleEmailBridge(new Request('https://game.example/api/internal/send-email', {
    method: 'POST',
    headers: { Authorization: 'Bearer bridge-secret', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: 'PLAYER@example.com', subject: 'Verify account', text: 'Code', html: '<p>Code</p>' }),
  }), {
    EMAIL_BRIDGE_SECRET: 'bridge-secret',
    EMAIL_FROM: 'Hex Settlers <no-reply@example.com>',
    EMAIL: { async send(value) { message = value; return { messageId: 'message-1' }; } },
  });
  assert.equal(response.status, 200);
  assert.equal(message.to, 'player@example.com');
  assert.equal(message.from, 'Hex Settlers <no-reply@example.com>');
  assert.equal((await response.json()).id, 'message-1');
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
