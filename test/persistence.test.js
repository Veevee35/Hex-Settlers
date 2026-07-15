'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { atomicWriteJson, CoalescingJsonFileWriter, JsonFileWriter } = require('../server/persistence');

test('atomic JSON writes never leave temporary files', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-persistence-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'state.json');
  await atomicWriteJson(filePath, { version: 1, value: 'ready' });
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), { version: 1, value: 'ready' });
  assert.deepEqual(fs.readdirSync(directory), ['state.json']);
});

test('queued writes preserve ordering and valid JSON', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-writer-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'state.json');
  const writer = new JsonFileWriter(filePath);
  writer.write({ sequence: 1 });
  writer.write({ sequence: 2 });
  await writer.write({ sequence: 3 });
  await writer.flush();
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), { sequence: 3 });
});

test('coalescing writes retain only the latest pending snapshot', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hex-coalescing-writer-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'state.json');
  const writer = new CoalescingJsonFileWriter(filePath);
  writer.write({ sequence: 1 });
  writer.write({ sequence: 2 });
  await writer.write({ sequence: 3 });
  await writer.flush();
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), { sequence: 3 });
});
