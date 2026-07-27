'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { CoalescingJsonFileWriter, JsonFileWriter, atomicWriteJson } = require('../server/persistence');

test('atomic JSON writes leave a complete parseable file', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hex-persistence-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'state.json');
  await atomicWriteJson(file, { value: 1, nested: ['safe'] });
  assert.deepEqual(JSON.parse(await fs.promises.readFile(file, 'utf8')), { value: 1, nested: ['safe'] });
  assert.deepEqual((await fs.promises.readdir(directory)).sort(), ['state.json']);
});

test('queued writer preserves write order and flushes the newest value', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hex-writer-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'users.json');
  const writer = new JsonFileWriter(file);
  await Promise.all([writer.write({ version: 1 }), writer.write({ version: 2 })]);
  await writer.flush();
  assert.deepEqual(JSON.parse(await fs.promises.readFile(file, 'utf8')), { version: 2 });
});

test('coalescing writer persists the latest rapidly-updated snapshot', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hex-coalescing-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'rooms.json');
  const writer = new CoalescingJsonFileWriter(file);
  writer.write({ version: 1 });
  writer.write({ version: 2 });
  writer.write({ version: 3 });
  await writer.flush();
  assert.deepEqual(JSON.parse(await fs.promises.readFile(file, 'utf8')), { version: 3 });
});

test('coalescing writer defers serialization of a replacement snapshot', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hex-coalescing-memory-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'rooms.json');
  const writer = new CoalescingJsonFileWriter(file);
  let replacementSerializations = 0;

  writer.write({ version: 1, payload: 'x'.repeat(256 * 1024) });
  writer.write({
    toJSON() {
      replacementSerializations += 1;
      return { version: 2 };
    },
  });

  assert.equal(replacementSerializations, 0);
  await writer.flush();
  assert.equal(replacementSerializations, 1);
  assert.deepEqual(JSON.parse(await fs.promises.readFile(file, 'utf8')), { version: 2 });
});
