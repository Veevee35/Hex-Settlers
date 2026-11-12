#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dir = path.join(__dirname, 'discord-build');
const { execSync } = require('node:child_process');
if (!fs.existsSync(path.join(dir, 'node_modules', 'esbuild'))) {
  console.log('Installing pinned, build-only Discord SDK and esbuild packages...');
  execSync(`npm install --prefix ${JSON.stringify(dir)} --no-audit --no-fund`, { stdio: 'inherit', shell: process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh' });
}
const esbuild = require(path.join(dir, 'node_modules', 'esbuild'));
esbuild.buildSync({ entryPoints: [path.join(root, 'client', 'discord-activity.mjs')],
  outfile: path.join(root, 'public', 'discord-activity.bundle.js'),
  nodePaths: [path.join(dir, 'node_modules')], platform: 'browser', format: 'iife', bundle: true, minify: true,
  target: ['chrome109', 'safari16'], legalComments: 'inline' });
console.log('Discord Embedded App SDK bundle created.');
