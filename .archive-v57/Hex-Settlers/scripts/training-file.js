'use strict';
// Local-only atomic writes: training must never upload candidate weights or
// test accounts to a configured Cloudflare/R2 persistence endpoint.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
async function atomicWriteJson(file, value) {
  const directory = path.dirname(path.resolve(file));
  await fs.promises.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  try {
    await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(temporary, file);
  } catch (error) {
    await fs.promises.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}
module.exports = { atomicWriteJson };
