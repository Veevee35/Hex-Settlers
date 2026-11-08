'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Exercise the exact Worker functions without starting a Cloudflare Container.
// Use original source instead of a duplicated persistence implementation.
const source = fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'container-worker.mjs'), 'utf8');
const section = source.slice(source.indexOf('const STATE_HOST'), source.indexOf('export class HexGameContainer'));
const { r2StateRequest } = new Function('Response', `${section.replaceAll('export ', '')}\nreturn { r2StateRequest };`)(Response);
const uri = 'http://hex-state.internal/state/users.json';

function envWithPut(assertPut) {
  return { STATE: { put: assertPut } };
}

test('R2 state PUT passes original known-length Request body without TransformStream', async () => {
  const json = JSON.stringify({ version: 2, users: [{ username: 'test' }] });
  const request = new Request(uri, {
    method: 'PUT', headers: { 'Content-Length': String(Buffer.byteLength(json)) }, body: json
  });
  const original = request.body;
  let called = 0;
  const env = envWithPut(async (key, body, options) => {
    called++;
    assert.equal(key, 'state/users.json');
    assert.equal(body, original, 'the original known-length stream must not be transformed');
    assert.equal(options.httpMetadata.contentType, 'application/octet-stream');
    assert.equal(await new Response(body).text(), json);
  });
  const result = await r2StateRequest(request, env);
  assert.equal(result.status, 201);
  assert.equal(called, 1);
});

test('R2 state PUT safely buffers small unknown-length streams into byte arrays', async () => {
  const json = '{"users":[]}';
  const request = new Request(uri, { method: 'PUT', body: new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(json)); controller.close(); }
  }), duplex: 'half' });
  const env = envWithPut(async (key, body) => {
    assert.equal(key, 'state/users.json');
    assert.ok(body instanceof Uint8Array);
    assert.equal(new TextDecoder().decode(body), json);
  });
  const result = await r2StateRequest(request, env);
  assert.equal(result.status, 201);
});

test('R2 state PUT rejects oversized declared Content-Length before storage', async () => {
  const request = new Request(uri, {
    method: 'PUT', headers: { 'Content-Length': String(128 * 1024 * 1024 + 1) }, body: 'x'
  });
  const result = await r2StateRequest(request, envWithPut(() => assert.fail('must not upload')));
  assert.equal(result.status, 413);
});

test('R2 state PUT bounds unknown-length uploads without storing them', async () => {
  const request = new Request(uri, { method: 'PUT', body: new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); controller.close(); }
  }), duplex: 'half' });
  const result = await r2StateRequest(request, envWithPut(() => assert.fail('must not upload')));
  assert.equal(result.status, 413);
});
