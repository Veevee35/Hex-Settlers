'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function atomicWriteText(filePath, text) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
  await fs.promises.mkdir(directory, { recursive: true });
  try {
    await fs.promises.writeFile(temporaryPath, text, { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(temporaryPath, filePath);
  } catch (error) {
    try { await fs.promises.unlink(temporaryPath); } catch (_) {}
    throw error;
  }
}

async function atomicWriteJson(filePath, value) {
  await atomicWriteText(filePath, JSON.stringify(value, null, 2));
}

class JsonFileWriter {
  constructor(filePath, { space = 2 } = {}) { this.filePath = filePath; this.space = space; this.tail = Promise.resolve(); }
  write(value) {
    const serialized = JSON.stringify(value, null, this.space);
    const task = this.tail.catch(() => {}).then(() => atomicWriteText(this.filePath, serialized));
    this.tail = task;
    return task;
  }
  flush() { return this.tail; }
}

class CoalescingJsonFileWriter {
  constructor(filePath, { space = 2 } = {}) {
    this.filePath = filePath;
    this.space = space;
    this.nextValue = undefined;
    this.hasNextValue = false;
    this.running = null;
  }
  write(value) {
    // Keep only the newest object until the writer is ready for it. Serializing in
    // write() defeated coalescing and briefly retained several large JSON strings.
    this.nextValue = value;
    this.hasNextValue = true;
    return this.ensureRunning();
  }
  ensureRunning() {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = null;
      if (this.hasNextValue) this.ensureRunning();
    });
    return this.running;
  }
  async drain() {
    while (this.hasNextValue) {
      const value = this.nextValue;
      this.nextValue = undefined;
      this.hasNextValue = false;
      const serialized = JSON.stringify(value, null, this.space);
      await atomicWriteText(this.filePath, serialized);
    }
  }
  async flush() {
    while (this.running || this.hasNextValue) await (this.running || this.ensureRunning());
  }
}

module.exports = { atomicWriteJson, atomicWriteText, CoalescingJsonFileWriter, JsonFileWriter };
