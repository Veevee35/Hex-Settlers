'use strict';
// Local-only atomic writes: training must never upload candidate weights or
// test accounts to a configured Cloudflare/R2 persistence endpoint.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createGzip } = require('node:zlib');

async function atomicWrite(file, write) {
  const directory = path.dirname(path.resolve(file));
  await fs.promises.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  try {
    await write(temporary);
    await fs.promises.rename(temporary, file);
  } catch (error) {
    await fs.promises.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function atomicWriteJson(file, value) {
  return atomicWriteBytes(file, `${JSON.stringify(value, null, 2)}\n`);
}

function atomicWriteBytes(file, bytes) {
  return atomicWrite(file, temporary => fs.promises.writeFile(temporary, bytes, { encoding: 'utf8', mode: 0o600 }));
}

function atomicWriteGameReport(file, summary, games) {
  function* chunks() {
    yield `${JSON.stringify(summary).slice(0, -1)},"games":[`;
    for (let offset = 0; offset < games.length; offset += 1000) {
      const group = JSON.stringify(games.slice(offset, offset + 1000)).slice(1, -1);
      yield offset ? `,${group}` : group;
    }
    yield ']}\n';
  }
  return atomicWrite(file, temporary =>
    pipeline(Readable.from(chunks()), fs.createWriteStream(temporary, { mode: 0o600 })));
}

function atomicWriteCompressedMatches(file, games) {
  function* chunks() {
    yield '[';
    for (let index = 0; index < games.length; index++) {
      yield (index ? ',' : '') + JSON.stringify(games[index]);
    }
    yield ']\n';
  }
  return atomicWrite(file, temporary => pipeline(
    Readable.from(chunks()), createGzip({ level: 1 }), fs.createWriteStream(temporary, { mode: 0o600 }),
  ));
}

module.exports = { atomicWriteJson, atomicWriteBytes, atomicWriteGameReport, atomicWriteCompressedMatches };
