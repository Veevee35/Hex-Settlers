#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const asset = path.join(__dirname, '..', 'public', 'discord-activity.bundle.js');
const contents = fs.existsSync(asset) ? fs.readFileSync(asset, 'utf8') : '';
if (contents.length < 12000 || contents.includes('Diagnostic fallback ONLY') || contents.includes('SDK bundle was not built')) {
  console.error('ERROR: Discord Embedded App SDK bundle is missing/placeholder. Run npm run build:discord before deploying to Cloudflare.');
  process.exit(1);
}
console.log(`Discord Activity SDK bundle verified (${Buffer.byteLength(contents)} bytes).`);
