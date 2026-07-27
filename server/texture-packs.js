'use strict';

const TEXTURE_PACK_ASSET_REL = Object.freeze([
  'gold-resource.png',
  'Dev Cards/Invention.png',
  'Dev Cards/Knight.png',
  'Dev Cards/Monopoly.png',
  'Dev Cards/RoadBuilding.png',
  'Dev Cards/VictoryPoint.png',
  'Numbers/10.png',
  'Numbers/11.png',
  'Numbers/12.png',
  'Numbers/2.png',
  'Numbers/3.png',
  'Numbers/4.png',
  'Numbers/5.png',
  'Numbers/6.png',
  'Numbers/8.png',
  'Numbers/9.png',
  'Ports/brick.png',
  'Ports/generic.png',
  'Ports/grain.png',
  'Ports/lumber.png',
  'Ports/ore.png',
  'Ports/wool.png',
  'Resource Hexes/Desert.png',
  'Resource Hexes/Field.png',
  'Resource Hexes/Forest.png',
  'Resource Hexes/GoldFields.png',
  'Resource Hexes/Hills.png',
  'Resource Hexes/Mountains.png',
  'Resource Hexes/Pasture.png',
  'Resource Hexes/Seas.png',
  'Resource Hexes/Unexplored.png',
  'Robber Pirate/thief_pirate.png',
  'Robber Pirate/thief_robber.png',
  'Tokens/tokens_black.png',
  'Tokens/tokens_blue.png',
  'Tokens/tokens_green.png',
  'Tokens/tokens_orange.png',
  'Tokens/tokens_pink.png',
  'Tokens/tokens_purple.png',
  'Tokens/tokens_red.png',
  'Tokens/tokens_teal.png',
  'Tokens/tokens_white.png',
  'Tokens/tokens_yellow.png',
]);

const TEXTURE_PACK_ASSET_SET = new Set(TEXTURE_PACK_ASSET_REL);
const BUILTIN_TEXTURE_PACKS = Object.freeze({
  default: Object.freeze({ id: 'default', name: 'Default' }),
  simplified: Object.freeze({ id: 'simplified', name: 'Simplified' }),
});

function builtinTexturePack(packId) {
  return BUILTIN_TEXTURE_PACKS[String(packId || '').trim().toLowerCase()] || null;
}

function normalizeTexturePackAssetRelPath(input) {
  let value = String(input || '').replace(/\\/g, '/').trim();
  if (!value) return '';
  try { value = decodeURIComponent(value); } catch (_) {}
  value = value.replace(/^\/+/, '').replace(/^\.\/+/, '');
  value = value.replace(/^texture pack\//i, '').replace(/^texturepack\//i, '').replace(/^texture_pack\//i, '');
  value = value.replace(/^public\//i, '');
  const nested = value.toLowerCase().indexOf('texture pack/');
  if (nested >= 0) value = value.slice(nested + 'texture pack/'.length);
  return value.split('/').filter(Boolean).join('/');
}

function validTexturePackAssetRelPath(input) {
  const rel = normalizeTexturePackAssetRelPath(input);
  return TEXTURE_PACK_ASSET_SET.has(rel) ? rel : '';
}

function validTexturePackId(input) {
  const id = String(input || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id) ? id : '';
}

function sanitizeTexturePackName(input, fallback = 'Custom Pack') {
  return (String(input || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || fallback).slice(0, 48);
}

function isPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) if (buffer[i] !== signature[i]) return false;
  return true;
}

function pngBufferFromDataUrl(input) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(String(input || '').trim());
  if (!match) return null;
  let buffer;
  try { buffer = Buffer.from(match[1], 'base64'); } catch (_) { return null; }
  return isPngBuffer(buffer) ? buffer : null;
}

module.exports = {
  BUILTIN_TEXTURE_PACKS,
  TEXTURE_PACK_ASSET_REL,
  TEXTURE_PACK_ASSET_SET,
  builtinTexturePack,
  isPngBuffer,
  normalizeTexturePackAssetRelPath,
  pngBufferFromDataUrl,
  sanitizeTexturePackName,
  validTexturePackAssetRelPath,
  validTexturePackId,
};
