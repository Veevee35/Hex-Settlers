'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  TEXTURE_PACK_ASSET_REL,
  builtinTexturePack,
  isPngBuffer,
  normalizeTexturePackAssetRelPath,
  validTexturePackAssetRelPath,
  validTexturePackId,
} = require('../server/texture-packs');

const projectRoot = path.resolve(__dirname, '..');

test('Simplified is a complete built-in texture pack', () => {
  assert.deepEqual(builtinTexturePack('simplified'), { id: 'simplified', name: 'Simplified' });
  const base = path.join(projectRoot, 'public', 'texture-packs', 'simplified');
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  };
  visit(base);
  assert.deepEqual(files.sort(), [...TEXTURE_PACK_ASSET_REL].sort());
  for (const rel of files) assert.equal(isPngBuffer(fs.readFileSync(path.join(base, ...rel.split('/')))), true, rel);
});

test('Gold resource icon lives at each texture-pack root', () => {
  assert.equal(fs.existsSync(path.join(projectRoot, 'public', 'assets', 'gold-resource.png')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'public', 'texture pack', 'gold-resource.png')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'public', 'texture-packs', 'simplified', 'gold-resource.png')), true);
  assert.ok(TEXTURE_PACK_ASSET_REL.includes('gold-resource.png'));
});

test('texture-pack identifiers and asset paths are normalized safely', () => {
  assert.equal(validTexturePackId('tp-simple_1.2'), 'tp-simple_1.2');
  assert.equal(validTexturePackId('../outside'), '');
  assert.equal(normalizeTexturePackAssetRelPath('Simplified/texture pack/Numbers/2.png'), 'Numbers/2.png');
  assert.equal(validTexturePackAssetRelPath('Simplified/texture pack/Numbers/2.png'), 'Numbers/2.png');
  assert.equal(validTexturePackAssetRelPath('../../server.js'), '');
});
