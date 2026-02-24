"use strict";
/*
  Hex Settlers Railway Bootstrap (TypeScript)
  Stage 1 migration: keep the full existing game/features/assets intact,
  but launch through a typed, validated bootstrap for Railway reliability.
*/
const fs = require('node:fs');
const path = require('node:path');
function asInt(name, fallback, min, max) {
    const raw = process.env[name];
    if (raw == null || raw === '')
        return fallback;
    const n = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(n) || n < min || n > max) {
        console.warn(`[bootstrap] Invalid ${name}="${raw}". Using ${fallback}.`);
        return fallback;
    }
    return n;
}
function asBool(name, fallback = false) {
    const raw = (process.env[name] ?? '').toLowerCase();
    if (!raw)
        return fallback;
    if (['1', 'true', 'yes', 'y', 'on'].includes(raw))
        return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(raw))
        return false;
    return fallback;
}
function ensurePathExists(label, p) {
    if (!fs.existsSync(p)) {
        throw new Error(`[bootstrap] Missing ${label}: ${p}`);
    }
}
function installProcessGuards() {
    process.on('uncaughtException', (err) => {
        console.error('[bootstrap] uncaughtException', err);
    });
    process.on('unhandledRejection', (reason) => {
        console.error('[bootstrap] unhandledRejection', reason);
    });
    process.on('SIGTERM', () => {
        console.warn('[bootstrap] SIGTERM received. Shutting down.');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.warn('[bootstrap] SIGINT received. Shutting down.');
        process.exit(0);
    });
}
function configureRailwayEnv() {
    const port = asInt('PORT', 3000, 1, 65535);
    const host = (process.env.HOST || '0.0.0.0').trim() || '0.0.0.0';
    // Preserve compatibility with the legacy server which reads process.env.PORT.
    process.env.PORT = String(port);
    process.env.HOST = host;
    // Optional safety toggles (legacy server may ignore these; kept for future migration)
    process.env.HEX_WS_MAX_PAYLOAD = String(asInt('HEX_WS_MAX_PAYLOAD', 512 * 1024, 1024, 10 * 1024 * 1024));
    process.env.HEX_LOG_VERBOSE = String(asBool('HEX_LOG_VERBOSE', false));
}
function verifyProjectLayout() {
    const root = path.resolve(__dirname, '..');
    ensurePathExists('legacy server', path.join(root, 'server.js'));
    ensurePathExists('public dir', path.join(root, 'public'));
    ensurePathExists('index.html', path.join(root, 'public', 'index.html'));
    ensurePathExists('main client', path.join(root, 'public', 'app.js'));
    ensurePathExists('assets dir', path.join(root, 'public', 'assets'));
}
function logStartupBanner() {
    const env = process.env;
    console.log('[bootstrap] Hex Settlers TS bootstrap starting');
    console.log(`[bootstrap] node=${process.version} port=${env.PORT} host=${env.HOST}`);
    console.log(`[bootstrap] mode=${env.NODE_ENV || 'development'} railway=${env.RAILWAY_ENVIRONMENT ? 'yes' : 'no'}`);
}
function main() {
    configureRailwayEnv();
    installProcessGuards();
    verifyProjectLayout();
    logStartupBanner();
    // Hand off to the full legacy implementation (all current features/assets preserved).
    require('../server.js');
}
main();
