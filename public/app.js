
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // Local asset cache (PNGs/WAVs): versioned service worker with safe cache rollover.
  const ASSET_CACHE_SW_BUILD = '5710f934d8585552-previewfix2';
  function registerAssetCacheServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      const isLocalhost = /^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname);
      if (location.protocol !== 'https:' && !isLocalhost) return;
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register(`/sw.js?v=${ASSET_CACHE_SW_BUILD}`, { scope: '/' });
          // Prompt the waiting worker to activate so new asset caches are ready quickly.
          if (reg && reg.waiting) {
            try { reg.waiting.postMessage('SKIP_WAITING'); } catch (_) {}
          }
          reg && reg.addEventListener && reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && reg.waiting) {
                try { reg.waiting.postMessage('SKIP_WAITING'); } catch (_) {}
              }
            });
          });
        } catch (_) {
          // Non-fatal: game should still run without offline asset cache.
        }
      }, { once: true });
    } catch (_) {}
  }
  registerAssetCacheServiceWorker();

  const ui = {
    connDot: $('connDot'),
    connText: $('connText'),
    nameInput: $('nameInput'),
    codeInput: $('codeInput'),
    usernameInput: $('usernameInput'),
    passwordInput: $('passwordInput'),
    registerBtn: $('registerBtn'),
    loginBtn: $('loginBtn'),
    logoutBtn: $('logoutBtn'),
    authStatus: $('authStatus'),
    authStats: $('authStats'),
    rejoinLastBtn: $('rejoinLastBtn'),
    lastRoomHint: $('lastRoomHint'),
    myAccountLabel: $('myAccountLabel'),
    texturePackRow: $('texturePackRow'),
    texturePackSelect: $('texturePackSelect'),
    downloadTexturePackBtn: $('downloadTexturePackBtn'),
    uploadTexturePackBtn: $('uploadTexturePackBtn'),
    deleteTexturePackBtn: $('deleteTexturePackBtn'),
    texturePackFileInput: $('texturePackFileInput'),
    texturePackStatus: $('texturePackStatus'),
    rejoinIdInput: $('rejoinIdInput'),
    createBtn: $('createBtn'),
    joinBtn: $('joinBtn'),
    rejoinBtn: $('rejoinBtn'),
    startBtn: $('startBtn'),
    lobbyCard: $('lobbyCard'),
    setupCard: $('setupCard'),
    discardLimitInput: $('discardLimitInput'),
    timerSpeedSelect: $('timerSpeedSelect'),
    baseResourceCountSelect: $('baseResourceCountSelect'),
    mapModeSelect: $('mapModeSelect'),
    classic56Note: $('classic56Note'),
    sixIslandsNote: $('sixIslandsNote'),
    scenarioRow: $('scenarioRow'),
    mapScenarioSelect: $('mapScenarioSelect'),
    scenario56Row: $('scenario56Row'),
    mapScenario56Select: $('mapScenario56Select'),
    testBuilderRow: $('testBuilderRow'),
    testBrushSelect: $('testBrushSelect'),
    testNumberSelect: $('testNumberSelect'),
    testResetBtn: $('testResetBtn'),
    victoryPointsSelect: $('victoryPointsSelect'),
    devDeckModeSelect: $('devDeckModeSelect'),
    regenMapBtn: $('regenMapBtn'),
    mapGenNote: $('mapGenNote'),
    saveRulesBtn: $('saveRulesBtn'),
    rulesPreview: $('rulesPreview'),
    turnCard: $('turnCard'),
    toolsCard: $('toolsCard'),
    devCard: $('devCard'),
    rightSidebar: $('rightSidebar'),
    rightSidebarResize: $('rightSidebarResize'),
    rightSidebarInner: $('rightSidebarInner'),
    rightSidebarResourcesDock: $('rightSidebarResourcesDock'),
    rightSidebarResourcesBody: $('rightSidebarResourcesBody'),
    logBtn: $('logBtn'),
    rulesBtn: $('rulesBtn'),
    diceBtn: $('diceBtn'),
    chatBtn: $('chatBtn'),
    audioBtn: $('audioBtn'),
    colorblindBtn: $('colorblindBtn'),
    leaveGameBtn: $('leaveGameBtn'),
    endGameVoteBtn: $('endGameVoteBtn'),
    idsBtn: $('idsBtn'),
    resourcesCard: $('resourcesCard'),
    logCard: $('logCard'),
    logList: $('logList'),
    logHideBtn: $('logHideBtn'),
    rollBtn: $('rollBtn'),
    endBtn: $('endBtn'),
    buildRoadBtn: $('buildRoadBtn'),
    buildShipBtn: $('buildShipBtn'),
    moveShipBtn: $('moveShipBtn'),
    buildSettlementBtn: $('buildSettlementBtn'),
    buildCityBtn: $('buildCityBtn'),
    roomBox: $('roomBox'),
    roomCode: $('roomCode'),
    roomJoinLinkInput: $('roomJoinLinkInput'),
    genJoinLinkBtn: $('genJoinLinkBtn'),
    copyJoinLinkBtn: $('copyJoinLinkBtn'),
    myPlayerIdFull: $('myPlayerIdFull'),
    copyMyIdBtn: $('copyMyIdBtn'),
    playersList: $('playersList'),
    colorPickerRow: $('colorPickerRow'),
    colorPicker: $('colorPicker'),
    aiFillRow: $('aiFillRow'),
    aiDifficultySelect: $('aiDifficultySelect'),
    aiFillSelect: $('aiFillSelect'),
    aiFillBtn: $('aiFillBtn'),
    aiClearBtn: $('aiClearBtn'),
    aiFillNote: $('aiFillNote'),
    errBox: $('errBox'),
    turnInfo: $('turnInfo'),
    timerInfo: $('timerInfo'),
    resourcesBox: $('resourcesBox'),
    buyDevBtn: $('buyDevBtn'),
    bankTradeBtn: $('bankTradeBtn'),
    playerTradeBtn: $('playerTradeBtn'),
    rollDock: $('rollDock'),
    rollDockBtn: $('rollDockBtn'),
    endDockBtn: $('endDockBtn'),
    devHand: $('devHand'),
    devRemaining: $('devRemaining'),
    hintBox: $('hintBox'),
    canvas: $('board'),
    countdownClock: $('countdownClock'),
    pauseBtn: $('pauseBtn'),
    pausedOverlay: $('pausedOverlay'),
    modal: $('modal'),
    modalBackdrop: $('modalBackdrop'),
    modalTitle: $('modalTitle'),
    modalBody: $('modalBody'),
    modalActions: $('modalActions'),

    postgameOverlay: $('postgameOverlay'),
    postgameSplash: $('postgameSplash'),
    postgameSplashTitle: $('postgameSplashTitle'),
    postgameSplashSub: $('postgameSplashSub'),
    postgamePanel: $('postgamePanel'),
    postgameTabs: $('postgameTabs'),
    pgTabBody: $('pgTabBody'),
    pgMainMenuBtn: $('pgMainMenuBtn'),
    pgHideBtn: $('pgHideBtn'),
    pgWinnerLine: $('pgWinnerLine'),
    pgMetaLine: $('pgMetaLine'),
    pgShowBtn: $('pgShowBtn'),

    // History / Leaderboard
    historyBtn: $('historyBtn'),
    leaderboardBtn: $('leaderboardBtn'),
    historyOverlay: $('historyOverlay'),
    historyCloseBtn: $('historyCloseBtn'),
    historyRefreshBtn: $('historyRefreshBtn'),
    historyTabs: $('historyTabs'),
    historyBody: $('historyBody'),
    historySub: $('historySub'),
  };

  const RIGHT_SIDEBAR_WIDTH_KEY = 'hexsettlers_right_sidebar_width_v1';
  const RIGHT_SIDEBAR_DEFAULT_WIDTH = 520;
  const RIGHT_SIDEBAR_MIN_WIDTH = 340;
  const RIGHT_SIDEBAR_MAX_WIDTH = 760;

  function clampRightSidebarWidth(v) {
    const hardMax = Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(260, window.innerWidth - 160));
    const floor = Math.min(RIGHT_SIDEBAR_MIN_WIDTH, hardMax);
    const n = Math.round(Number(v) || RIGHT_SIDEBAR_DEFAULT_WIDTH);
    return Math.max(floor, Math.min(hardMax, n));
  }

  function getSavedRightSidebarWidth() {
    try {
      return clampRightSidebarWidth(localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY));
    } catch (_) {}
    return clampRightSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  }

  function setRightSidebarWidth(v, { persist = false } = {}) {
    const next = clampRightSidebarWidth(v);
    try { document.documentElement.style.setProperty('--right-sidebar-width', `${next}px`); } catch (_) {}
    try { if (ui.rightSidebar) ui.rightSidebar.style.width = `${next}px`; } catch (_) {}
    if (persist) {
      try { localStorage.setItem(RIGHT_SIDEBAR_WIDTH_KEY, String(next)); } catch (_) {}
    }
    return next;
  }

  function ensureRightSidebarResizeHandle() {
    if (!ui.rightSidebar || !ui.rightSidebarResize || ui.rightSidebarResize.dataset.ready === '1') return;
    const handle = ui.rightSidebarResize;
    handle.dataset.ready = '1';
    let dragging = false;
    let startX = 0;
    let startW = getSavedRightSidebarWidth();

    const stop = () => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture && handle.releasePointerCapture(pointerId); } catch (_) {}
      try { handle.classList.remove('isDragging'); } catch (_) {}
      setRightSidebarWidth(startW, { persist: true });
    };

    let pointerId = null;

    handle.addEventListener('pointerdown', (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      dragging = true;
      pointerId = ev.pointerId;
      startX = ev.clientX;
      startW = getSavedRightSidebarWidth();
      try { handle.setPointerCapture(ev.pointerId); } catch (_) {}
      ev.preventDefault();
    });

    handle.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const dx = startX - ev.clientX;
      startW = setRightSidebarWidth(startW + dx);
      startX = ev.clientX;
      try {
        const r = ui.canvas && ui.canvas.getBoundingClientRect ? ui.canvas.getBoundingClientRect() : null;
        const key = r ? `${Math.round(r.width)}x${Math.round(r.height)}` : '';
        if (key && key !== lastCanvasSizeKey) {
          lastCanvasSizeKey = key;
          resizeCanvas();
          render();
        }
      } catch (_) {}
    });

    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }


  const ctx = ui.canvas.getContext('2d');

  const DEFAULT_TEXTURE_PACK_ID = 'default';
  const TEXTURE_PACK_META_KEY = 'hexsettlers_texture_pack_meta_v1';
  const TEXTURE_PACK_BROWSER_CACHE = 'hexsettlers-asset-cache-texturepack-v1';
  const TEXTURE_PACK_TEMPLATE_URL = '/texture-pack-template.zip';
  const DEFAULT_TEXTURE_ASSET_REL = ["Dev Cards/Invention.png", "Dev Cards/Knight.png", "Dev Cards/Monopoly.png", "Dev Cards/RoadBuilding.png", "Dev Cards/VictoryPoint.png", "Numbers/10.png", "Numbers/11.png", "Numbers/12.png", "Numbers/2.png", "Numbers/3.png", "Numbers/4.png", "Numbers/5.png", "Numbers/6.png", "Numbers/8.png", "Numbers/9.png", "Ports/brick.png", "Ports/generic.png", "Ports/grain.png", "Ports/lumber.png", "Ports/ore.png", "Ports/wool.png", "Resource Hexes/Desert.png", "Resource Hexes/Field.png", "Resource Hexes/Forest.png", "Resource Hexes/GoldFields.png", "Resource Hexes/Hills.png", "Resource Hexes/Mountains.png", "Resource Hexes/Pasture.png", "Resource Hexes/Seas.png", "Resource Hexes/Unexplored.png", "Robber Pirate/thief_pirate.png", "Robber Pirate/thief_robber.png", "Tokens/tokens_black.png", "Tokens/tokens_blue.png", "Tokens/tokens_green.png", "Tokens/tokens_orange.png", "Tokens/tokens_pink.png", "Tokens/tokens_purple.png", "Tokens/tokens_red.png", "Tokens/tokens_teal.png", "Tokens/tokens_white.png", "Tokens/tokens_yellow.png"];
  const DEFAULT_TEXTURE_ASSET_SET = new Set(DEFAULT_TEXTURE_ASSET_REL);
  const DEFAULT_TEXTURE_PACK_LABEL = 'Default';
  let pendingTexturePackSelectId = null;
  const texturePackRoomPublished = Object.create(null);
  const texturePackSessionUrls = Object.create(null);
  let texturePackAnnounceQueued = false;

  function texturePackMetaDefaults() {
    return { activeId: DEFAULT_TEXTURE_PACK_ID, packs: [] };
  }

  function readTexturePackMetaState() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(TEXTURE_PACK_META_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (_) {}
    const packs = [];
    for (const p of (Array.isArray(parsed && parsed.packs) ? parsed.packs : [])) {
      const id = String(p && p.id || '').trim();
      if (!id || id === DEFAULT_TEXTURE_PACK_ID) continue;
      const name = String(p && p.name || 'Custom Pack').trim().slice(0, 48) || 'Custom Pack';
      const assets = Array.isArray(p && p.assets) ? p.assets.map(normalizeTextureAssetRelPath).filter(Boolean) : [];
      const uniq = Array.from(new Set(assets.filter(x => DEFAULT_TEXTURE_ASSET_SET.has(x))));
      packs.push({
        id,
        name,
        assets: uniq,
        deletable: true,
        savedAt: Number(p && p.savedAt || Date.now()) || Date.now(),
      });
    }
    let activeId = String(parsed && parsed.activeId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    if (activeId !== DEFAULT_TEXTURE_PACK_ID && !packs.some(p => p.id === activeId)) activeId = DEFAULT_TEXTURE_PACK_ID;
    return { activeId, packs };
  }

  let texturePackMetaState = texturePackMetaDefaults();
  texturePackMetaState = readTexturePackMetaState();

  function writeTexturePackMetaState() {
    try {
      localStorage.setItem(TEXTURE_PACK_META_KEY, JSON.stringify({
        activeId: texturePackMetaState.activeId || DEFAULT_TEXTURE_PACK_ID,
        packs: Array.isArray(texturePackMetaState.packs) ? texturePackMetaState.packs : [],
      }));
    } catch (_) {}
  }

  function listLocalTexturePacks() {
    const rows = [{ id: DEFAULT_TEXTURE_PACK_ID, name: DEFAULT_TEXTURE_PACK_LABEL, assets: DEFAULT_TEXTURE_ASSET_REL.slice(), deletable: false, savedAt: 0 }];
    for (const p of (texturePackMetaState.packs || [])) rows.push(p);
    return rows;
  }

  function getLocalTexturePackMeta(packId) {
    const id = String(packId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    if (id === DEFAULT_TEXTURE_PACK_ID) return { id: DEFAULT_TEXTURE_PACK_ID, name: DEFAULT_TEXTURE_PACK_LABEL, assets: DEFAULT_TEXTURE_ASSET_REL.slice(), deletable: false };
    return (texturePackMetaState.packs || []).find(p => p && p.id === id) || null;
  }

  function activeTexturePackId() {
    const id = String(texturePackMetaState.activeId || DEFAULT_TEXTURE_PACK_ID).trim();
    if (!id) return DEFAULT_TEXTURE_PACK_ID;
    if (id === DEFAULT_TEXTURE_PACK_ID) return id;
    return getLocalTexturePackMeta(id) ? id : DEFAULT_TEXTURE_PACK_ID;
  }

  function activeTexturePackMeta() {
    return getLocalTexturePackMeta(activeTexturePackId()) || getLocalTexturePackMeta(DEFAULT_TEXTURE_PACK_ID);
  }

  function setTexturePackStatus(msg, isError = false) {
    if (!ui.texturePackStatus) return;
    ui.texturePackStatus.textContent = String(msg || '');
    ui.texturePackStatus.style.color = isError ? '#ff9aa3' : '';
  }

  function normalizeTextureAssetRelPath(input) {
    let s = String(input || '').replace(/\\/g, '/').trim();
    if (!s) return '';
    try { s = decodeURIComponent(s); } catch (_) {}
    s = s.replace(/^\/+/, '');
    s = s.replace(/^\.\/+/, '');
    s = s.replace(/^texture pack\//i, '');
    s = s.replace(/^texturepack\//i, '');
    s = s.replace(/^texture_pack\//i, '');
    s = s.replace(/^public\//i, '');
    const idx = s.toLowerCase().indexOf('texture pack/');
    if (idx >= 0) s = s.slice(idx + 'texture pack/'.length);
    const parts = s.split('/').filter(Boolean);
    return parts.join('/');
  }

  function defaultTexturePackUrl(rel) {
    const norm = normalizeTextureAssetRelPath(rel);
    if (!norm) return '';
    return `/texture%20pack/${norm.split('/').map(seg => encodeURIComponent(seg)).join('/')}`;
  }

  function textureRelFromLegacyUrl(src) {
    const raw = String(src || '').replace(/^\/+/, '');
    if (!raw) return '';
    if (!/^texture(?:%20|\s)pack\//i.test(raw)) return '';
    return normalizeTextureAssetRelPath(raw.replace(/^texture(?:%20|\s)pack\//i, ''));
  }

  function userTextureCacheUrl(packId, rel) {
    const id = encodeURIComponent(String(packId || '').trim());
    const norm = normalizeTextureAssetRelPath(rel);
    return `/__texturepacks/${id}/${norm.split('/').map(seg => encodeURIComponent(seg)).join('/')}`;
  }

  function activeTextureHasAsset(rel) {
    const meta = activeTexturePackMeta();
    if (!meta || !meta.id || meta.id === DEFAULT_TEXTURE_PACK_ID) return false;
    const norm = normalizeTextureAssetRelPath(rel);
    return !!(norm && Array.isArray(meta.assets) && meta.assets.includes(norm));
  }

  function resolveTextureAssetUrl(rel) {
    const norm = normalizeTextureAssetRelPath(rel);
    if (!norm) return '';
    const active = activeTexturePackMeta();
    if (active && active.id && active.id !== DEFAULT_TEXTURE_PACK_ID && Array.isArray(active.assets) && active.assets.includes(norm)) {
      const sessionMap = texturePackSessionUrls[active.id];
      if (sessionMap && sessionMap[norm]) return sessionMap[norm];
      return userTextureCacheUrl(active.id, norm);
    }
    return defaultTexturePackUrl(norm);
  }

  function getTextureAssetUrl(rel) {
    return resolveTextureAssetUrl(rel);
  }

  function resolveLegacyTextureUrl(src) {
    const rel = textureRelFromLegacyUrl(src);
    if (!rel) return String(src || '');
    return resolveTextureAssetUrl(rel);
  }

  function setTextureImageElementSrc(img, legacyUrl) {
    if (!img) return;
    const fallback = String(legacyUrl || '');
    const primary = resolveLegacyTextureUrl(fallback) || fallback;
    let triedFallback = false;
    img.onerror = () => {
      if (triedFallback || !fallback || primary === fallback) {
        img.onerror = null;
        return;
      }
      triedFallback = true;
      img.src = fallback;
    };
    img.src = primary || fallback;
  }

  function setTextureImageElementSrcFromRel(img, rel) {
    if (!img) return;
    const norm = normalizeTextureAssetRelPath(rel);
    const fallback = defaultTexturePackUrl(norm);
    const primary = resolveTextureAssetUrl(norm) || fallback;
    let triedFallback = false;
    img.onerror = () => {
      if (triedFallback || !fallback || primary === fallback) {
        img.onerror = null;
        return;
      }
      triedFallback = true;
      img.src = fallback;
    };
    img.src = primary || fallback;
  }

  async function openTexturePackBrowserCache() {
    if (!('caches' in window)) throw new Error('Texture packs need browser cache support.');
    return await caches.open(TEXTURE_PACK_BROWSER_CACHE);
  }

  function revokeTexturePackSessionUrls(packId) {
    const id = String(packId || '').trim();
    if (!id || !texturePackSessionUrls[id]) return;
    for (const url of Object.values(texturePackSessionUrls[id])) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    delete texturePackSessionUrls[id];
  }

  async function setTexturePackSessionUrlsFromBlobs(packId, blobMap) {
    const id = String(packId || '').trim();
    if (!id || id === DEFAULT_TEXTURE_PACK_ID) return;
    revokeTexturePackSessionUrls(id);
    const next = Object.create(null);
    for (const [rawRel, blob] of Object.entries(blobMap || {})) {
      const rel = normalizeTextureAssetRelPath(rawRel);
      if (!rel || !(blob instanceof Blob)) continue;
      try { next[rel] = URL.createObjectURL(blob); } catch (_) {}
    }
    texturePackSessionUrls[id] = next;
  }

  async function hydrateTexturePackSessionUrls(packId) {
    const id = String(packId || '').trim();
    if (!id || id === DEFAULT_TEXTURE_PACK_ID) return;
    if (texturePackSessionUrls[id] && Object.keys(texturePackSessionUrls[id]).length) return;
    const meta = getLocalTexturePackMeta(id);
    if (!meta) return;
    const cache = await openTexturePackBrowserCache();
    const blobs = Object.create(null);
    for (const rel of (meta.assets || [])) {
      try {
        const res = await cache.match(userTextureCacheUrl(id, rel), { ignoreSearch: true, ignoreVary: true });
        if (!res) continue;
        const blob = await res.blob();
        blobs[rel] = blob;
      } catch (_) {}
    }
    await setTexturePackSessionUrlsFromBlobs(id, blobs);
  }

  async function storeTexturePackBlob(packId, rel, blob) {
    const cache = await openTexturePackBrowserCache();
    const url = userTextureCacheUrl(packId, rel);
    const headers = new Headers({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' });
    await cache.put(url, new Response(blob, { headers }));
  }

  async function deleteTexturePackCacheEntries(packId, relList) {
    const cache = await openTexturePackBrowserCache();
    for (const rel of (relList || [])) {
      try { await cache.delete(userTextureCacheUrl(packId, rel)); } catch (_) {}
    }
  }

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(new Error('Failed to read texture asset.'));
        fr.readAsDataURL(blob);
      } catch (err) {
        reject(err);
      }
    });
  }

  function bytesToBase64(bytes) {
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      let bin = '';
      for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]);
      out += btoa(bin);
    }
    return out;
  }

  function buildTexturePackId(seed = '') {
    const base = String(seed || 'pack').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 18) || 'pack';
    const rand = Math.random().toString(36).slice(2, 8);
    return `tp-${base}-${Date.now().toString(36)}-${rand}`;
  }

  function packRecordForSave(id, name, assets) {
    const normAssets = Array.from(new Set((assets || []).map(normalizeTextureAssetRelPath).filter(x => DEFAULT_TEXTURE_ASSET_SET.has(x))));
    return {
      id: String(id || '').trim(),
      name: String(name || 'Custom Pack').trim().slice(0, 48) || 'Custom Pack',
      assets: normAssets,
      deletable: true,
      savedAt: Date.now(),
    };
  }

  function upsertLocalTexturePackMeta(record) {
    if (!record || !record.id || record.id === DEFAULT_TEXTURE_PACK_ID) return null;
    const next = (texturePackMetaState.packs || []).filter(p => p && p.id !== record.id);
    next.push(record);
    next.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')) || String(a.id || '').localeCompare(String(b.id || '')));
    texturePackMetaState.packs = next;
    writeTexturePackMetaState();
    return record;
  }

  async function saveTexturePackPayloadLocally(pack, options = {}) {
    const incomingId = String(pack && pack.id || '').trim();
    const packId = incomingId && incomingId !== DEFAULT_TEXTURE_PACK_ID ? incomingId : buildTexturePackId(pack && pack.name);
    const name = String(pack && pack.name || 'Custom Pack').trim().slice(0, 48) || 'Custom Pack';
    const assetsObj = (pack && pack.assets && typeof pack.assets === 'object') ? pack.assets : {};
    const savedAssets = [];
    const blobMap = Object.create(null);

    for (const [rawRel, dataUrl] of Object.entries(assetsObj)) {
      const rel = normalizeTextureAssetRelPath(rawRel);
      if (!rel || !DEFAULT_TEXTURE_ASSET_SET.has(rel)) continue;
      const url = String(dataUrl || '').trim();
      if (!/^data:image\/png;base64,/i.test(url)) continue;
      try {
        const blob = await (await fetch(url)).blob();
        await storeTexturePackBlob(packId, rel, blob);
        blobMap[rel] = blob;
        savedAssets.push(rel);
      } catch (_) {}
    }

    if (!savedAssets.length && packId !== DEFAULT_TEXTURE_PACK_ID) throw new Error('No valid PNGs were imported from that texture pack.');

    const record = packRecordForSave(packId, name, savedAssets);
    upsertLocalTexturePackMeta(record);

    if (options.activate !== false) {
      texturePackMetaState.activeId = record.id;
      writeTexturePackMetaState();
      await setTexturePackSessionUrlsFromBlobs(record.id, blobMap);
    }

    refreshTexturePackUi();
  if (activeTexturePackId() !== DEFAULT_TEXTURE_PACK_ID) {
    setTimeout(() => {
      void hydrateTexturePackSessionUrls(activeTexturePackId()).then(() => {
        try { reloadAllTextureAssets(); } catch (_) {}
      }).catch(() => {});
    }, 0);
  }
    if (options.activate !== false) {
      reloadAllTextureAssets();
      queueTexturePackAnnounce(!!options.forcePublish);
    }
    return record;
  }

  async function deleteLocalTexturePack(packId) {
    const id = String(packId || '').trim();
    if (!id || id === DEFAULT_TEXTURE_PACK_ID) return false;
    const meta = getLocalTexturePackMeta(id);
    if (!meta) return false;
    try { await deleteTexturePackCacheEntries(id, meta.assets || []); } catch (_) {}
    revokeTexturePackSessionUrls(id);
    texturePackMetaState.packs = (texturePackMetaState.packs || []).filter(p => p && p.id !== id);
    if (activeTexturePackId() === id) texturePackMetaState.activeId = DEFAULT_TEXTURE_PACK_ID;
    writeTexturePackMetaState();
    refreshTexturePackUi();
    reloadAllTextureAssets();
    queueTexturePackAnnounce(false);
    return true;
  }

  async function buildTexturePackPublishPayload(packId) {
    const meta = getLocalTexturePackMeta(packId);
    if (!meta || !meta.id || meta.id === DEFAULT_TEXTURE_PACK_ID) return null;
    const cache = await openTexturePackBrowserCache();
    const assets = {};
    for (const rel of (meta.assets || [])) {
      try {
        const res = await cache.match(userTextureCacheUrl(meta.id, rel), { ignoreSearch: true, ignoreVary: true });
        if (!res) continue;
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (/^data:image\/png;base64,/i.test(dataUrl)) assets[rel] = dataUrl;
      } catch (_) {}
    }
    if (!Object.keys(assets).length) return null;
    return { id: meta.id, name: meta.name, assets };
  }

  async function ensureRoomTexturePackAnnounced(forcePublish = false) {
    texturePackAnnounceQueued = false;
    if (!room || !room.code || !myPlayerId || !ws || ws.readyState !== 1) return;
    const active = activeTexturePackMeta();
    if (!active) return;
    const me = Array.isArray(room.players) ? room.players.find(p => p && p.id === myPlayerId) : null;
    const roomPackId = String((me && me.texturePackId) || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    const roomPackName = String((me && me.texturePackName) || (roomPackId === DEFAULT_TEXTURE_PACK_ID ? DEFAULT_TEXTURE_PACK_LABEL : 'Custom Pack'));

    if (active.id === DEFAULT_TEXTURE_PACK_ID) {
      if (roomPackId !== DEFAULT_TEXTURE_PACK_ID || roomPackName !== DEFAULT_TEXTURE_PACK_LABEL) {
        send({ type: 'set_texture_pack', texturePackId: DEFAULT_TEXTURE_PACK_ID, texturePackName: DEFAULT_TEXTURE_PACK_LABEL });
      }
      texturePackRoomPublished[`${room.code}|${DEFAULT_TEXTURE_PACK_ID}`] = true;
      return;
    }

    const roomKey = `${room.code}|${active.id}`;
    if (forcePublish || !texturePackRoomPublished[roomKey]) {
      const payload = await buildTexturePackPublishPayload(active.id);
      if (payload) {
        send({ type: 'texture_pack_publish', pack: payload });
        texturePackRoomPublished[roomKey] = true;
      }
    }

    if (roomPackId !== active.id || roomPackName !== active.name) {
      send({ type: 'set_texture_pack', texturePackId: active.id, texturePackName: active.name });
    }
  }

  function queueTexturePackAnnounce(forcePublish = false) {
    if (texturePackAnnounceQueued && !forcePublish) return;
    texturePackAnnounceQueued = true;
    setTimeout(() => {
      void ensureRoomTexturePackAnnounced(forcePublish);
    }, 0);
  }

  function refreshTexturePackUi() {
    if (ui.texturePackSelect) {
      const activeId = activeTexturePackId();
      ui.texturePackSelect.innerHTML = '';
      for (const p of listLocalTexturePacks()) {
        const opt = document.createElement('option');
        opt.value = p.id;
        const count = (p.id === DEFAULT_TEXTURE_PACK_ID) ? DEFAULT_TEXTURE_ASSET_REL.length : ((p.assets || []).length || 0);
        opt.textContent = `${p.name}${p.id === DEFAULT_TEXTURE_PACK_ID ? '' : ` (${count}/${DEFAULT_TEXTURE_ASSET_REL.length})`}`;
        ui.texturePackSelect.appendChild(opt);
      }
      ui.texturePackSelect.value = activeId;
    }

    const active = activeTexturePackMeta();
    const count = (active && Array.isArray(active.assets)) ? active.assets.length : DEFAULT_TEXTURE_ASSET_REL.length;
    setTexturePackStatus(
      active && active.id !== DEFAULT_TEXTURE_PACK_ID
        ? `Active: ${active.name} — ${count}/${DEFAULT_TEXTURE_ASSET_REL.length} PNGs saved locally. Missing icons fall back to default.`
        : 'Active: Default — always available and cannot be deleted.'
    );

    if (ui.deleteTexturePackBtn) {
      const canDelete = !!(active && active.id && active.id !== DEFAULT_TEXTURE_PACK_ID);
      ui.deleteTexturePackBtn.disabled = !canDelete;
      ui.deleteTexturePackBtn.title = canDelete ? 'Delete the currently selected custom texture pack from this browser.' : 'The default texture pack cannot be deleted.';
    }
  }

  async function setActiveTexturePackById(packId, options = {}) {
    const target = String(packId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    if (target !== DEFAULT_TEXTURE_PACK_ID && !getLocalTexturePackMeta(target)) throw new Error('That texture pack is not saved in this browser.');
    texturePackMetaState.activeId = target;
    writeTexturePackMetaState();
    if (target !== DEFAULT_TEXTURE_PACK_ID) {
      try { await hydrateTexturePackSessionUrls(target); } catch (_) {}
    }
    refreshTexturePackUi();
    reloadAllTextureAssets();
    if (options.announce !== false) queueTexturePackAnnounce(!!options.forcePublish);
    return activeTexturePackMeta();
  }

  async function readZipEocd(bytes) {
    const min = Math.max(0, bytes.length - (22 + 0xFFFF));
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) {
        const view = new DataView(bytes.buffer, bytes.byteOffset + i);
        return {
          offset: i,
          count: view.getUint16(10, true),
          cdSize: view.getUint32(12, true),
          cdOffset: view.getUint32(16, true),
        };
      }
    }
    throw new Error('That ZIP file could not be read.');
  }

  async function inflateZipDeflate(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot unzip compressed texture packs. Try the template ZIP without recompressing it.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }

  async function extractTexturePackAssetsFromZip(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const eocd = await readZipEocd(bytes);
    const out = Object.create(null);
    const td = new TextDecoder('utf-8');
    let ptr = eocd.cdOffset;

    for (let n = 0; n < eocd.count && ptr < bytes.length - 46; n++) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + ptr);
      if (view.getUint32(0, true) !== 0x02014b50) break;
      const method = view.getUint16(10, true);
      const compSize = view.getUint32(20, true);
      const nameLen = view.getUint16(28, true);
      const extraLen = view.getUint16(30, true);
      const commentLen = view.getUint16(32, true);
      const localOffset = view.getUint32(42, true);
      const nameBytes = bytes.slice(ptr + 46, ptr + 46 + nameLen);
      const rawName = td.decode(nameBytes);
      const rel = normalizeTextureAssetRelPath(rawName);

      ptr += 46 + nameLen + extraLen + commentLen;

      if (!rel || !DEFAULT_TEXTURE_ASSET_SET.has(rel)) continue;

      const lv = new DataView(bytes.buffer, bytes.byteOffset + localOffset);
      if (lv.getUint32(0, true) !== 0x04034b50) continue;
      const localNameLen = lv.getUint16(26, true);
      const localExtraLen = lv.getUint16(28, true);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const compBytes = bytes.slice(dataStart, dataStart + compSize);

      let data = null;
      if (method === 0) data = compBytes;
      else if (method === 8) data = await inflateZipDeflate(compBytes);
      else continue;

      out[rel] = new Blob([data], { type: 'image/png' });
    }

    return out;
  }

  async function importTexturePackZipFile(file) {
    if (!file) return;
    const assets = await extractTexturePackAssetsFromZip(file);
    const rels = Object.keys(assets);
    if (!rels.length) throw new Error('No valid texture PNGs were found in that ZIP.');
    const packId = buildTexturePackId((file && file.name) || 'pack');
    const packName = String((file && file.name) || 'Custom Pack').replace(/\.zip$/i, '').trim().slice(0, 48) || 'Custom Pack';

    for (const rel of rels) {
      await storeTexturePackBlob(packId, rel, assets[rel]);
    }

    const record = packRecordForSave(packId, packName, rels);
    upsertLocalTexturePackMeta(record);
    texturePackMetaState.activeId = record.id;
    writeTexturePackMetaState();
    await setTexturePackSessionUrlsFromBlobs(record.id, assets);
    refreshTexturePackUi();
    reloadAllTextureAssets();

    const publishAssets = {};
    for (const rel of rels) {
      try {
        publishAssets[rel] = await blobToDataUrl(assets[rel]);
      } catch (_) {}
    }

    if (Object.keys(publishAssets).length && room && room.code && myPlayerId) {
      send({ type: 'texture_pack_publish', pack: { id: record.id, name: record.name, assets: publishAssets } });
      texturePackRoomPublished[`${room.code}|${record.id}`] = true;
      send({ type: 'set_texture_pack', texturePackId: record.id, texturePackName: record.name });
    } else {
      queueTexturePackAnnounce(true);
    }

    setTexturePackStatus(`Imported ${record.name}. ${rels.length}/${DEFAULT_TEXTURE_ASSET_REL.length} PNGs saved. Missing icons will fall back to default.`);
  }

  async function handlePlayerTexturePackChoice(player) {
    const targetId = String(player && player.texturePackId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    if (targetId === DEFAULT_TEXTURE_PACK_ID) {
      await setActiveTexturePackById(DEFAULT_TEXTURE_PACK_ID, { announce: true, forcePublish: false });
      return;
    }
    if (getLocalTexturePackMeta(targetId)) {
      await setActiveTexturePackById(targetId, { announce: true, forcePublish: false });
      return;
    }
    pendingTexturePackSelectId = targetId;
    send({ type: 'get_texture_pack', packId: targetId });
    setTexturePackStatus(`Fetching ${String(player && player.texturePackName || 'texture pack')} from the lobby…`);
  }

  function reloadStructureSprites() {
    try {
      STRUCT.ready = false;
      STRUCT.loaded = 0;
      STRUCT.imgs.forEach((img, idx) => {
        if (!img) return;
        const fallback = STRUCT_IMG_SRC[idx];
        const primary = resolveLegacyTextureUrl(fallback) || fallback;
        let triedFallback = false;
        img.onerror = () => {
          if (triedFallback || !fallback || primary === fallback) {
            img.onerror = null;
            return;
          }
          triedFallback = true;
          img.src = fallback;
        };
        img.onload = () => {
          STRUCT.loaded++;
          STRUCT.tile = structTileSizeForImage(img);
          STRUCT.ready = true;
          try { render(); } catch (_) {}
        };
        img.src = primary || fallback;
      });
    } catch (_) {}
  }

  function reloadAllTextureAssets() {
    try { refreshTexturePackUi(); } catch (_) {}
    try { reloadStructureSprites(); } catch (_) {}
    try {
      if (typeof loadImages === 'function') {
        Promise.resolve(loadImages()).then(() => { try { render(); } catch (_) {} });
      } else {
        try { render(); } catch (_) {}
      }
    } catch (_) {
      try { render(); } catch (_) {}
    }
  }

  function ensureStructureSpritesReady() {
    try {
      const loadedNow = STRUCT.imgs.reduce((acc, img) => acc + ((img && img.complete && (img.naturalWidth || img.width)) ? 1 : 0), 0);
      if (loadedNow > 0) {
        STRUCT.loaded = Math.max(Number(STRUCT.loaded || 0), loadedNow);
        STRUCT.ready = true;
        STRUCT.tile = structTileSizeForImage(STRUCT.imgs.find(img => img && img.complete && (img.naturalWidth || img.width)) || STRUCT.imgs[0]);
        return;
      }
    } catch (_) {}
    try { reloadStructureSprites(); } catch (_) {}
  }

  refreshTexturePackUi();


  // Lobby: track whether the host explicitly changed the VP target so we don't
  // auto-overwrite it when toggling map/scenario.
  let vpTouched = false;
  let baseResourceCountTouched = false;

  const AUTH_TOKEN_KEY = 'hexsettlers_auth_token_v1';
  const LAST_ROOM_KEY = 'hexsettlers_last_room_v1';
  const AUTO_CREATE_ROOM_KEY = 'hexsettlers_auto_create_room_v1';
  const TAB_UI_SCALE_KEY = 'hexsettlers_tab_ui_scale_v1';
  const TAB_UI_SCALE_MIN = 0.8;
  const TAB_UI_SCALE_MAX = 2.0;
  const TAB_UI_SCALE_STEP = 0.1;
  const TOOL_UI_SCALE_PREFIX = 'hexsettlers_tool_ui_scale_v1_';
  const TOOL_UI_SCALE_MIN = 0.8;
  const TOOL_UI_SCALE_MAX = 2.0;
  const TOOL_UI_SCALE_STEP = 0.1;

  // Accessibility: colorblind-friendly token markers
  const COLORBLIND_MODE_KEY = 'hexsettlers_colorblind_mode_v1';
  let colorblindMode = false;
  try { colorblindMode = localStorage.getItem(COLORBLIND_MODE_KEY) === '1'; } catch (_) {}

  const AUDIO_SFX_LEVELS_KEY = 'hexsettlers_audio_sfx_levels_v1';
  const AUDIO_SFX_DEFAULT_PCT = 100;
  const AUDIO_SFX_MIN_PCT = 0;
  const AUDIO_SFX_MAX_PCT = 200;
  const AUDIO_SFX_DEFS = [
    { key: 'turn_bell', label: 'Turn Bell' },
    { key: 'paired_turn', label: 'Paired Turn' },
    { key: 'dice_roll', label: 'Dice Roll' },
    { key: 'gold_field_production', label: 'Gold Field Production' },
    { key: 'robber_pirate', label: 'Robber / Pirate' },
    { key: 'structure', label: 'Build / Upgrade' },
    { key: 'end_turn', label: 'End Turn Warning' },
    { key: 'dev_card', label: 'Dev Card' },
    { key: 'trade_proposed', label: 'Trade Proposed' },
    { key: 'trade_success', label: 'Trade Success' },
  ];
  let audioSfxLevels = Object.create(null);
  let audioPanel = null;
  let audioPanelOpen = false;

  function updateColorblindUi() {
    if (!ui.colorblindBtn) return;
    ui.colorblindBtn.textContent = `Colorblind: ${colorblindMode ? 'On' : 'Off'}`;
    ui.colorblindBtn.classList.toggle('primary', !!colorblindMode);
  }

  function setColorblindMode(enabled) {
    colorblindMode = !!enabled;
    try { localStorage.setItem(COLORBLIND_MODE_KEY, colorblindMode ? '1' : '0'); } catch (_) {}
    updateColorblindUi();
    try { render(); } catch (_) {}
  }


  let tabUiScale = 1;
  const tabScaleLabels = [];

  let authUser = null;
  let authToken = null;
  let pendingAutoRejoin = false;
  let pendingDirectJoinRoomCode = null;

  function formatStatsLine(stats) {
    if (!stats) return '';
    const gp = Math.max(0, Number(stats.gamesPlayed || 0));
    const w = Math.max(0, Number(stats.wins || 0));
    const l = Math.max(0, Number(stats.losses || 0));
    const tvp = Math.max(0, Number(stats.totalVP || 0));
    return `Games: ${gp}  Wins: ${w}  Losses: ${l}  Total VP: ${tvp}`;
  }

  function setAuthState(user, token) {
    authUser = user || null;
    if (typeof token === 'string' && token.trim()) {
      authToken = token.trim();
      try { localStorage.setItem(AUTH_TOKEN_KEY, authToken); } catch (_) {}
    } else if (!user) {
      authToken = null;
      try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
    }
    updateAuthUi();
  }

  function updateAuthUi() {
    const loggedIn = !!authUser;
    if (ui.authStatus) {
      ui.authStatus.textContent = loggedIn ? `Logged in as ${authUser.username}` : 'Not logged in.';
    }
    if (ui.authStats) {
      ui.authStats.textContent = loggedIn ? formatStatsLine(authUser.stats) : '';
    }
    if (ui.logoutBtn) ui.logoutBtn.classList.toggle('hidden', !loggedIn);
    if (ui.loginBtn) ui.loginBtn.disabled = loggedIn;
    if (ui.registerBtn) ui.registerBtn.disabled = loggedIn;
    if (ui.usernameInput) ui.usernameInput.disabled = loggedIn;
    if (ui.passwordInput) ui.passwordInput.disabled = loggedIn;

    if (ui.createBtn) ui.createBtn.disabled = !loggedIn;
    if (ui.joinBtn) ui.joinBtn.disabled = !loggedIn;
    if (ui.rejoinLastBtn) ui.rejoinLastBtn.disabled = !loggedIn;

    const last = (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (ui.lastRoomHint) ui.lastRoomHint.textContent = last ? `Last room: ${last}` : '';
    if (ui.myAccountLabel) ui.myAccountLabel.textContent = loggedIn ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';
  }

  function clearAuthLocal() {
    authUser = null;
    authToken = null;
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
    updateAuthUi();
  }

  function clampTabUiScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(TAB_UI_SCALE_MIN, Math.min(TAB_UI_SCALE_MAX, Math.round(n * 100) / 100));
  }

  function tabUiScalePctLabel() {
    return `${Math.round(tabUiScale * 100)}%`;
  }

  function refreshTabScaleLabels() {
    const txt = tabUiScalePctLabel();
    for (const el of tabScaleLabels) {
      if (!el) continue;
      el.textContent = txt;
      el.title = `Tab size ${txt}`;
    }
  }

  function applyTabUiScale() {
    try {
      document.documentElement.style.setProperty('--tab-ui-scale', String(clampTabUiScale(tabUiScale)));
    } catch (_) {}
    refreshTabScaleLabels();
  }

  function setTabUiScale(v) {
    tabUiScale = clampTabUiScale(v);
    try { localStorage.setItem(TAB_UI_SCALE_KEY, String(tabUiScale)); } catch (_) {}
    applyTabUiScale();
  }

  function bumpTabUiScale(delta) {
    const next = Math.round((tabUiScale + delta) * 10) / 10;
    setTabUiScale(next);
  }

  function makeTabScaleControl() {
    const wrap = document.createElement('div');
    wrap.className = 'tabScaleControl';
    wrap.title = 'Scale tab text and tables';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'tabScaleBtn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Smaller tab text');
    minus.addEventListener('click', () => bumpTabUiScale(-TAB_UI_SCALE_STEP));

    const label = document.createElement('div');
    label.className = 'tabScaleLabel';
    label.textContent = '100%';
    tabScaleLabels.push(label);

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'tabScaleBtn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Larger tab text');
    plus.addEventListener('click', () => bumpTabUiScale(TAB_UI_SCALE_STEP));

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'tabScaleBtn';
    reset.textContent = 'A';
    reset.setAttribute('aria-label', 'Reset tab text size');
    reset.title = 'Reset tab size to 100%';
    reset.addEventListener('click', () => setTabUiScale(1));

    wrap.appendChild(minus);
    wrap.appendChild(label);
    wrap.appendChild(plus);
    wrap.appendChild(reset);
    return wrap;
  }

  function installTabScaleControls() {
    const targets = [
      document.querySelector('.postgameTopRight'),
      document.querySelector('.historyTopRight'),
    ];
    for (const host of targets) {
      if (!host) continue;
      if (host.querySelector('.tabScaleControl')) continue;
      host.prepend(makeTabScaleControl());
    }
  }

  function initTabUiScale() {
    let saved = 1;
    try {
      const raw = localStorage.getItem(TAB_UI_SCALE_KEY);
      if (raw != null && raw !== '') saved = Number(raw);
    } catch (_) {}
    tabUiScale = clampTabUiScale(saved || 1);
    installTabScaleControls();
    applyTabUiScale();
  }

  function clampToolUiScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(TOOL_UI_SCALE_MIN, Math.min(TOOL_UI_SCALE_MAX, Math.round(n * 100) / 100));
  }

  function isNarrowPortraitMobileUi() {
    try {
      const w = Math.max(0, Math.floor(window.innerWidth || document.documentElement?.clientWidth || 0));
      const h = Math.max(0, Math.floor(window.innerHeight || document.documentElement?.clientHeight || 0));
      const coarse = !!(window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches);
      return coarse && w > 0 && h > w && w <= 460;
    } catch (_) {
      return false;
    }
  }

  function getAutoDefaultToolUiScale(scaleId) {
    if (!isNarrowPortraitMobileUi()) return null;
    switch (String(scaleId || '')) {
      case 'turn_bar': return 0.9;
      case 'tools_bar': return 0.9;
      case 'timer_box': return 0.9;
      case 'resources_panel': return 0.9;
      case 'dev_panel': return 0.9;
      case 'log_panel': return 0.9;
      case 'cartographer_draft_panel': return 0.9;
      default: return null;
    }
  }

  function getToolUiScale(scaleId) {
    let saved = 1;
    let hadStored = false;
    try {
      const raw = localStorage.getItem(`${TOOL_UI_SCALE_PREFIX}${String(scaleId || 'tool')}`);
      if (raw != null && raw !== '') {
        hadStored = true;
        saved = Number(raw);
      }
    } catch (_) {}
    if (!hadStored) {
      const mobileDefault = getAutoDefaultToolUiScale(scaleId);
      if (mobileDefault != null) saved = mobileDefault;
    }
    return clampToolUiScale(saved || 1);
  }

  function applyScaledPanelBoxSize(scaleId, wrap, scale) {
    try {
      if (!wrap || !wrap.style) return;
      if (String(scaleId || '') !== 'resources_panel') return;
      const isResourcesPanel = (wrap.id === 'resourcesCard') || (wrap.classList && wrap.classList.contains('resourcesOverlay'));
      if (!isResourcesPanel) return;

      if (!wrap.dataset.basePanelWidthPx) {
        const rect = (typeof wrap.getBoundingClientRect === 'function') ? wrap.getBoundingClientRect() : null;
        const measured = rect && Number.isFinite(rect.width) ? Math.round(rect.width) : 0;
        if (measured > 0) wrap.dataset.basePanelWidthPx = String(measured);
      }

      const baseW = Number(wrap.dataset.basePanelWidthPx || 0);
      if (!Number.isFinite(baseW) || baseW <= 0) return;

      const viewportW = Math.max(320, Math.floor((window && window.innerWidth) || (document.documentElement && document.documentElement.clientWidth) || 0));
      const maxW = Math.max(220, viewportW - 20);
      const nextW = Math.min(maxW, Math.max(220, Math.round(baseW * (Number(scale) || 1))));
      wrap.style.width = `${nextW}px`;
      wrap.style.maxWidth = `${maxW}px`;
    } catch (_) {}
  }

  function setToolUiScale(scaleId, value, wrap, label) {
    const next = clampToolUiScale(value);
    try { localStorage.setItem(`${TOOL_UI_SCALE_PREFIX}${String(scaleId || 'tool')}`, String(next)); } catch (_) {}
    if (wrap) {
      wrap.style.setProperty('--tool-ui-scale', String(next));
      applyScaledPanelBoxSize(scaleId, wrap, next);
    }
    if (label) {
      const txt = `${Math.round(next * 100)}%`;
      label.textContent = txt;
      label.title = `Tab size ${txt}`;
    }

    // Keep right sidebar resources synced to the Dev panel scale when docked.
    try {
      if (String(scaleId || '') === 'dev_panel') {
        const dock = (typeof ui !== 'undefined' && ui) ? ui.rightSidebarResourcesDock : null;
        if (dock && dock.style) dock.style.setProperty('--tool-ui-scale', String(next));
      }
    } catch (_) {}
  }

  function bumpToolUiScale(scaleId, delta, wrap, label) {
    const base = getToolUiScale(scaleId);
    const next = Math.round((base + delta) * 10) / 10;
    setToolUiScale(scaleId, next, wrap, label);
  }

  function makeToolScaleControl(scaleId, wrap, { title = 'Scale this tab' } = {}) {
    const ctrl = document.createElement('div');
    ctrl.className = 'toolScaleControl';
    ctrl.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    ctrl.addEventListener('mousedown', (ev) => ev.stopPropagation());
    ctrl.title = title;

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'tabScaleBtn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Smaller tab text');

    const label = document.createElement('div');
    label.className = 'tabScaleLabel';

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'tabScaleBtn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Larger tab text');

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'tabScaleBtn';
    reset.textContent = 'A';
    reset.setAttribute('aria-label', 'Reset tab text size');
    reset.title = 'Reset tab size to 100%';

    minus.addEventListener('click', () => bumpToolUiScale(scaleId, -TOOL_UI_SCALE_STEP, wrap, label));
    plus.addEventListener('click', () => bumpToolUiScale(scaleId, TOOL_UI_SCALE_STEP, wrap, label));
    reset.addEventListener('click', () => setToolUiScale(scaleId, 1, wrap, label));

    ctrl.appendChild(minus);
    ctrl.appendChild(label);
    ctrl.appendChild(plus);
    ctrl.appendChild(reset);

    setToolUiScale(scaleId, getToolUiScale(scaleId), wrap, label);
    return ctrl;
  }

  function makeScalableToolWrap(scaleId, controlTitle) {
    const wrap = document.createElement('div');
    wrap.className = 'toolWrap toolWrapScaled';
    wrap.dataset.scaleId = String(scaleId || 'tool');

    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'toolScaleRow';
    ctrlRow.appendChild(makeToolScaleControl(scaleId, wrap, { title: controlTitle || 'Scale this tab' }));

    const content = document.createElement('div');
    content.className = 'toolScaleContent';

    wrap.appendChild(ctrlRow);
    wrap.appendChild(content);
    return { wrap, content };
  }


  function ensurePanelScaleWrapper(panelEl, headerEl) {
    if (!panelEl) return null;
    let wrap = panelEl.querySelector(':scope > .panelScaleContent');
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'panelScaleContent';
    const kids = Array.from(panelEl.children);
    for (const child of kids) {
      if (child === headerEl) continue;
      wrap.appendChild(child);
    }
    panelEl.appendChild(wrap);
    return wrap;
  }

  function ensurePanelHeaderScaleControl(panelEl, headerEl, scaleId, title) {
    if (!panelEl || !headerEl) return null;
    panelEl.classList.add('panelScalable');
    let host = headerEl.querySelector(':scope > .panelScaleHost');
    if (!host) {
      host = document.createElement('div');
      host.className = 'panelScaleHost';
      headerEl.appendChild(host);
    }
    let ctrl = host.querySelector('.toolScaleControl');
    if (!ctrl) {
      ctrl = makeToolScaleControl(scaleId, panelEl, { title: title || 'Scale panel' });
      host.appendChild(ctrl);
    }
    const lbl = host.querySelector('.tabScaleLabel');
    setToolUiScale(scaleId, getToolUiScale(scaleId), panelEl, lbl || null);
    return ctrl;
  }

  function ensureResourcesPanelControls() {
    if (!ui.resourcesCard) return;
    let header = ui.resourcesCard.querySelector(':scope > .resourcesHeaderRow');
    const h2 = ui.resourcesCard.querySelector(':scope > h2');
    if (!header) {
      header = document.createElement('div');
      header.className = 'resourcesHeaderRow';
      if (h2) header.appendChild(h2);
      ui.resourcesCard.insertBefore(header, ui.resourcesCard.firstChild || null);
    } else if (h2 && h2.parentNode !== header) {
      header.insertBefore(h2, header.firstChild || null);
    }
    ensurePanelScaleWrapper(ui.resourcesCard, header);
    ensurePanelHeaderScaleControl(ui.resourcesCard, header, 'resources_panel', 'Scale Resources panel');
  }

  function ensureDevPanelControls() {
    if (!ui.devCard) return;
    let header = ui.devCard.querySelector(':scope > .devHeaderRow');
    const h2 = ui.devCard.querySelector(':scope > h2');
    if (!header) {
      header = document.createElement('div');
      header.className = 'devHeaderRow';
      if (h2) header.appendChild(h2);
      ui.devCard.insertBefore(header, ui.devCard.firstChild || null);
    } else if (h2 && h2.parentNode !== header) {
      header.insertBefore(h2, header.firstChild || null);
    }

    let right = header.querySelector(':scope > .devHeaderRight');
    if (!right) {
      right = document.createElement('div');
      right.className = 'devHeaderRight';
      header.appendChild(right);
    }
    if (ui.devRemaining) {
      ui.devRemaining.classList.add('devDeckInline');
      right.appendChild(ui.devRemaining);
    }
    if (ui.buyDevBtn) {
      ui.buyDevBtn.classList.add('btnTiny');
      right.appendChild(ui.buyDevBtn);
    }

    ensurePanelHeaderScaleControl(ui.devCard, header, 'dev_panel', 'Scale Development Cards panel');
    ensurePanelScaleWrapper(ui.devCard, header);
    const wrap = ui.devCard.querySelector(':scope > .panelScaleContent');
    if (wrap) {
      for (const row of Array.from(wrap.querySelectorAll(':scope > .actions'))) {
        if (!row.querySelector('button:not(.hidden)')) row.classList.add('hidden');
      }
    }
  }

  function ensureHudBarScaleControl(panelEl, rowSelector, scaleId, title) {
    if (!panelEl) return;
    const row = panelEl.querySelector(rowSelector || ':scope > .hudBarRow');
    if (!row) return;
    let host = row.querySelector(':scope > .hudBarScaleHost');
    if (!host) {
      host = document.createElement('div');
      host.className = 'hudBarScaleHost';
      row.appendChild(host);
    }
    let ctrl = host.querySelector('.toolScaleControl');
    if (!ctrl) {
      ctrl = makeToolScaleControl(scaleId, row, { title: title || 'Scale bar' });
      host.appendChild(ctrl);
    }
    const lbl = host.querySelector('.tabScaleLabel');
    setToolUiScale(scaleId, getToolUiScale(scaleId), row, lbl || null);
  }

  function ensureTimerBoxControls() {
    if (!ui.countdownClock) return null;
    ui.countdownClock.classList.add('panelScalable', 'clockScalable');
    let topRow = ui.countdownClock.querySelector(':scope > .clockTopRow');
    if (!topRow) {
      topRow = document.createElement('div');
      topRow.className = 'clockTopRow';
      ui.countdownClock.insertBefore(topRow, ui.countdownClock.firstChild || null);
    }
    let grip = topRow.querySelector('.dragGrip');
    if (!grip) {
      grip = document.createElement('div');
      grip.className = 'dragGrip clockDragGrip';
      grip.textContent = '⋮⋮';
      topRow.insertBefore(grip, topRow.firstChild || null);
    }
    let scaleHost = topRow.querySelector(':scope > .panelScaleHost');
    if (!scaleHost) {
      scaleHost = document.createElement('div');
      scaleHost.className = 'panelScaleHost';
      topRow.appendChild(scaleHost);
    }
    if (!scaleHost.querySelector('.toolScaleControl')) {
      scaleHost.appendChild(makeToolScaleControl('timer_box', ui.countdownClock, { title: 'Scale turn timer box' }));
    }
    const lbl = scaleHost.querySelector('.tabScaleLabel');
    setToolUiScale('timer_box', getToolUiScale('timer_box'), ui.countdownClock, lbl || null);

    let wrap = ui.countdownClock.querySelector(':scope > .panelScaleContent');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'panelScaleContent';
      const timeEl = ui.countdownClock.querySelector(':scope > .clockTime');
      const metaEl = ui.countdownClock.querySelector(':scope > .clockMeta');
      if (timeEl) wrap.appendChild(timeEl);
      if (metaEl) wrap.appendChild(metaEl);
      ui.countdownClock.appendChild(wrap);
    }
    return grip;
  }

  function ensureInGamePanelScaleControls() {
    ensureResourcesPanelControls();
    ensureDevPanelControls();
    ensureHudBarScaleControl(ui.turnCard, ':scope > .hudBarRow', 'turn_bar', 'Scale turn actions bar');
    ensureHudBarScaleControl(ui.toolsCard, ':scope > .hudBarRow', 'tools_bar', 'Scale game settings/tools bar');
    ensureTimerBoxControls();
  }


  function ensureInGameLogScaleControl() {
    if (!ui || !ui.logCard || !ui.logList) return;
    const titleRow = ui.logCard.querySelector('.cardTitleRow');
    if (!titleRow) return;

    let host = titleRow.querySelector('.logScaleHost');
    if (!host) {
      host = document.createElement('div');
      host.className = 'logScaleHost';
      const hideBtn = ui.logHideBtn || titleRow.querySelector('#logHideBtn');
      const ctrl = makeToolScaleControl('log_panel', ui.logCard, { title: 'Scale in-game Game Log tab' });
      host.appendChild(ctrl);
      if (hideBtn && hideBtn.parentNode === titleRow) titleRow.insertBefore(host, hideBtn);
      else titleRow.appendChild(host);
    }

    // Re-apply saved value on refresh/reload so the draggable in-game log uses the same persisted control state.
    const lbl = host.querySelector('.tabScaleLabel');
    setToolUiScale('log_panel', getToolUiScale('log_panel'), ui.logCard, lbl || null);
  }

  ensureInGameLogScaleControl();

// -------------------- Post-game overlay (splash + stats) --------------------
let postgameState = {
  active: false,
  hidden: false,
  tab: 'summary',
  diceView: 'totals',
  resFocusId: null,
  devFocusId: null,
  splashTimer: null,
  lastGameId: null,
  lastPhase: null,

  // When viewing history, we render postgame UI from a stored snapshot instead of the live state.
  snapshot: null,
  historyMode: false,

  // History replay state
  replayLog: [],
  replayIndex: -1,
  replayActivePlayerId: null,
  replayPlayerLocked: false,
};


// -------------------- History + Player Stats --------------------
let historyState = {
  active: false,
  tab: 'games',
  games: [],
  leaderboard: [],
  sortKey: 'wins',
  sortDir: 'desc',
  loadingGames: false,
  loadingBoard: false,
  openMode: 'summary',
};
function clearPostgameTimers() {
  try { if (postgameState.splashTimer) clearTimeout(postgameState.splashTimer); } catch(_) {}
  postgameState.splashTimer = null;
}

function fmtMs(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function computeWinner(st) {
  if (!st || !Array.isArray(st.players) || !st.players.length) return null;

  // Prefer explicit winnerId set by the server (most reliable).
  try {
    const wid = String(st.winnerId || (st.stats && st.stats.winnerId) || '').trim();
    if (wid) {
      const p = st.players.find(pp => String(pp && pp.id || '') === wid) || null;
      if (p) return p;
    }
  } catch (_) {}

  // Prefer parsing the server message: "Name wins!"
  try {
    const msg = String(st.message || '');
    const m = msg.match(/^(.+?)\s+wins!\s*$/i);
    if (m && m[1]) {
      const name = m[1].trim();
      const p = st.players.find(pp => pp.name === name) || null;
      if (p) return p;
    }
  } catch(_) {}

  // Fallback: max VP (may be ambiguous on ties)
  let best = st.players[0];
  for (const p of st.players) if ((p.vp||0) > (best.vp||0)) best = p;
  return best;
}

function computePieceCounts(st, pid) {
  // Preferred: exact counts from board geometry (live game state).
  const edges = st?.geom?.edges || null;
  const nodes = st?.geom?.nodes || null;
  if (Array.isArray(edges) && Array.isArray(nodes)) {
    let roads = 0, ships = 0, settlements = 0, cities = 0;
    for (const e of edges) {
      if (!e) continue;
      if (e.roadOwner === pid) roads++;
      if (e.shipOwner === pid) ships++;
    }
    for (const n of nodes) {
      const b = n && n.building;
      if (!b || b.owner !== pid) continue;
      if (b.type === 'settlement') settlements++;
      if (b.type === 'city') cities++;
    }
    return { roads, ships, settlements, cities };
  }

  // Fallback: reconstruct from tracked build stats (history snapshots don't store geom).
  // Settlements-on-board ≈ settlementsBuilt - citiesBuilt (cities are upgrades).
  const b = st?.stats?.builds?.byPlayer?.[pid] || null;
  const roads = Math.max(0, Math.floor(Number(b?.road || 0)));
  const ships = Math.max(0, Math.floor(Number(b?.ship || 0)));
  const cities = Math.max(0, Math.floor(Number(b?.city || 0)));
  const settlementsBuilt = Math.max(0, Math.floor(Number(b?.settlement || 0)));
  const settlements = Math.max(0, settlementsBuilt - cities);
  return { roads, ships, settlements, cities };
}

function gameDurationMs(st) {
  // Preferred: persisted stats timestamps (available in history snapshots).
  try {
    const t0 = Number(st?.stats?.startedAt || 0);
    const t1 = Number(st?.stats?.endedAt || 0);
    if (t0 && t1 && t1 >= t0) return Math.max(0, t1 - t0);
  } catch (_) {}

  // Fallback: infer from log timestamps (live games have full log)
  const entries = (st && st.log) ? st.log : [];
  if (!entries.length) return 0;
  const t0 = Number(entries[0].ts || 0);
  const t1 = Number(entries[entries.length - 1].ts || 0);
  if (!t0 || !t1) return 0;
  return Math.max(0, t1 - t0);
}

function setPostgameVisible(visible) {
  if (!ui.postgameOverlay) return;
  ui.postgameOverlay.classList.toggle('hidden', !visible);
}

function setPostgamePanelVisible(visible) {
  if (!ui.postgamePanel || !ui.postgameSplash) return;
  ui.postgamePanel.classList.toggle('hidden', !visible);
  ui.postgameSplash.classList.toggle('hidden', visible);
}

function setPostgameHidden(hidden) {
  postgameState.hidden = !!hidden;
  if (ui.pgShowBtn) ui.pgShowBtn.classList.toggle('hidden', !postgameState.hidden);
  setPostgameVisible(!postgameState.hidden);
}


function renderPostgameTab(tab) {
  const st = postgameState.snapshot || state;
  if (!ui.pgTabBody || !st) return;
  postgameState.tab = tab || 'summary';

  // Tab button state
  try {
    const tabs = ui.postgameTabs ? ui.postgameTabs.querySelectorAll('.pgTab') : [];
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === postgameState.tab));
  } catch(_) {}

  const stats = st.stats || null;
  const players = Array.isArray(st.players) ? st.players : [];
  const winner = computeWinner(st);
  const winnerId = winner ? winner.id : (players[0] ? players[0].id : null);

  // Persist per-tab focus selections
  if (!postgameState.resFocusId) postgameState.resFocusId = winnerId;
  if (!postgameState.devFocusId) postgameState.devFocusId = winnerId;

  const RESOURCE_KEYS = ['brick','lumber','wool','grain','ore'];
  const RESOURCE_LABEL = { brick:'Brick', lumber:'Wood', wool:'Wool', grain:'Grain', ore:'Ore' };

  const SOURCE_LABEL = {
    // gains
    production: 'Production',
    setup: 'Setup',
    trade: 'Trades',
    steal: 'Steals',
    dev: 'Dev Cards',
    other: 'Other',
    // losses
    build: 'Building',
    discard: 'Discards',
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));

  const parseHex = (hex) => {
    const h = String(hex || '').trim();
    if (!h || h[0] !== '#') return null;
    const s = h.slice(1);
    const v = (s.length === 3)
      ? (s[0]+s[0]+s[1]+s[1]+s[2]+s[2])
      : s;
    if (v.length !== 6) return null;
    const r = parseInt(v.slice(0,2), 16);
    const g = parseInt(v.slice(2,4), 16);
    const b = parseInt(v.slice(4,6), 16);
    if ([r,g,b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  };

  const rgbaFromHex = (hex, a) => {
    const rgb = parseHex(hex);
    if (!rgb) return `rgba(74,163,255,${a})`;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  };

  const sumRes = (m) => {
    if (!m) return 0;
    let t = 0;
    for (const k of RESOURCE_KEYS) t += Number(m[k] || 0);
    return t;
  };

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const playerCell = (p, suffix) => {
    const wrap = document.createElement('div');
    wrap.className = 'pgName';
    const dot = document.createElement('div');
    dot.className = 'pgBadge';
    dot.style.background = p.color || '#777';
    const nm = document.createElement('div');
    nm.textContent = `${p.name}${suffix || ''}`;
    nm.style.minWidth = '0';
    nm.style.overflow = 'hidden';
    nm.style.textOverflow = 'ellipsis';
    wrap.appendChild(dot);
    wrap.appendChild(nm);
    return wrap;
  };

  const barNode = (value, max, colorHex, text, opts={}) => {
    const v = safeNum(value);
    const m = Math.max(0.00001, safeNum(max));
    const pct = clamp01(v / m);
    const wrap = document.createElement('div');
    wrap.className = 'pgBarCell' + (opts.alignRight ? ' right' : '');
    const fill = document.createElement('div');
    fill.className = 'pgBarFill';
    fill.style.width = `${Math.round(pct * 100)}%`;
    fill.style.background = rgbaFromHex(colorHex, opts.alpha ?? 0.18);
    const label = document.createElement('div');
    label.className = 'pgBarLabel';
    label.textContent = (text != null) ? String(text) : String(v);
    wrap.appendChild(fill);
    wrap.appendChild(label);
    return wrap;
  };

const stackedBarNode = (segments, max, labelText, opts={}) => {
  const m = Math.max(0.00001, safeNum(max));
  const wrap = document.createElement('div');
  wrap.className = 'pgBarCell pgStack' + (opts.alignRight ? ' right' : '');
  const stack = document.createElement('div');
  stack.className = 'pgBarStack';

  let total = 0;
  for (const s of (segments || [])) total += safeNum(s?.value || 0);

  for (const s of (segments || [])) {
    const v = safeNum(s?.value || 0);
    if (!v) continue;
    const pct = clamp01(v / m) * 100;
    const seg = document.createElement('div');
    seg.className = 'pgBarStackSeg';
    seg.style.width = `${pct}%`;
    seg.style.background = rgbaFromHex(s?.color, opts.alpha ?? 0.22);
    stack.appendChild(seg);
  }

  const label = document.createElement('div');
  label.className = 'pgBarLabel';
  label.textContent = (labelText != null) ? String(labelText) : String(total);

  wrap.appendChild(stack);
  wrap.appendChild(label);
  return wrap;
};

const diceTotalFor = (ds) => {
  if (!ds) return 0;
  let t = 0;
  for (let r = 2; r <= 12; r++) t += safeNum(ds[r] || 0);
  return t;
};

  const makeSection = (title, rightNode) => {
    const sec = document.createElement('div');
    sec.className = 'pgSection';
    const head = document.createElement('div');
    head.className = 'pgSectionHead';
    const h = document.createElement('div');
    h.className = 'pgSectionTitle';
    h.textContent = title;
    head.appendChild(h);
    if (rightNode) head.appendChild(rightNode);
    sec.appendChild(head);
    return sec;
  };

  const makeTable = (headers, rows) => {
    const table = document.createElement('table');
    table.className = 'pgTable';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      if (h instanceof Node) th.appendChild(h);
      else th.textContent = h;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      for (const c of r) {
        const td = document.createElement('td');
        if (c instanceof Node) td.appendChild(c);
        else td.textContent = String(c);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  };

  const makePlayerSelect = (labelText, keyName, defaultId) => {
    const wrap = document.createElement('div');
    wrap.className = 'pgControl';
    const lab = document.createElement('div');
    lab.className = 'pgControlLabel';
    lab.textContent = labelText;
    const sel = document.createElement('select');
    sel.className = 'pgSelect';
    for (const p of players) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    }
    const cur = postgameState[keyName] || defaultId;
    if (cur) sel.value = cur;
    sel.addEventListener('change', () => {
      postgameState[keyName] = sel.value;
      renderPostgameTab(postgameState.tab);
    });
    wrap.appendChild(lab);
    wrap.appendChild(sel);
    return wrap;
  };

  const addNote = (txt) => {
    const note = document.createElement('div');
    note.className = 'pgNote';
    note.textContent = txt;
    ui.pgTabBody.appendChild(note);
  };

  ui.pgTabBody.innerHTML = '';

  // -------------------- SUMMARY --------------------
  if (postgameState.tab === 'summary') {
    const sec1 = makeSection('Score & Pieces');

    const maxVP = Math.max(1, ...players.map(p => safeNum(p.vp || 0)));
    const maxSet = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).settlements));
    const maxCity = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).cities));
    const maxRoad = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).roads));
    const maxShip = Math.max(1, ...players.map(p => computePieceCounts(st, p.id).ships));
    const maxArmy = Math.max(1, ...players.map(p => safeNum(p.army || 0)));

    const headers1 = ['Player','VP','VP (Dev)','Army','Settlements','Cities','Roads','Ships','Island VP','Desert VP','Badges'];
    const rows1 = players.map(p => {
      const pc = computePieceCounts(st, p.id);
      const badges = [];
      if (st.largestArmy && st.largestArmy.playerId === p.id) badges.push('LA');
      if (st.longestRoad && st.longestRoad.playerId === p.id) badges.push('LR');
      return [
        playerCell(p, p.id === myPlayerId ? ' (you)' : ''),
        barNode(p.vp || 0, maxVP, p.color, p.vp || 0, { alignRight: true }),
        barNode(p.vpDev || 0, Math.max(1, ...players.map(pp => safeNum(pp.vpDev || 0))), p.color, p.vpDev || 0, { alignRight: true, alpha: 0.14 }),
        barNode(p.army || 0, maxArmy, p.color, p.army || 0, { alignRight: true, alpha: 0.14 }),
        barNode(pc.settlements, maxSet, p.color, pc.settlements, { alignRight: true, alpha: 0.12 }),
        barNode(pc.cities, maxCity, p.color, pc.cities, { alignRight: true, alpha: 0.12 }),
        barNode(pc.roads, maxRoad, p.color, pc.roads, { alignRight: true, alpha: 0.12 }),
        barNode(pc.ships, maxShip, p.color, pc.ships, { alignRight: true, alpha: 0.12 }),
        barNode(p.newIslandVP || 0, Math.max(1, ...players.map(pp => safeNum(pp.newIslandVP || 0))), p.color, p.newIslandVP || 0, { alignRight: true, alpha: 0.10 }),
        barNode(p.ttdFarSideVP || 0, Math.max(1, ...players.map(pp => safeNum(pp.ttdFarSideVP || 0))), p.color, p.ttdFarSideVP || 0, { alignRight: true, alpha: 0.10 }),
        badges.length ? badges.join(' • ') : '—'
      ];
    });

    sec1.appendChild(makeTable(headers1, rows1));
ui.pgTabBody.appendChild(sec1);

// VP breakdown (buildings + bonuses + badges)
const secVp = makeSection('VP Breakdown');

const lrPid = st.longestRoad?.playerId || null;
const laPid = st.largestArmy?.playerId || null;

const rawVp = players.map(p => {
  const pc = computePieceCounts(st, p.id);
  const buildingVP = safeNum(pc.settlements) * 1 + safeNum(pc.cities) * 2;
  const devVP = safeNum(p.vpDev || 0);
  const islandVP = safeNum(p.newIslandVP || 0);
  const desertVP = safeNum(p.ttdFarSideVP || 0);
  const badgeVP = (p.id === lrPid ? 2 : 0) + (p.id === laPid ? 2 : 0);
  const total = buildingVP + devVP + islandVP + desertVP + badgeVP;
  return { p, buildingVP, devVP, islandVP, desertVP, badgeVP, total, shown: safeNum(p.vp || 0) };
});

const maxB = Math.max(1, ...rawVp.map(r => r.buildingVP));
const maxD = Math.max(1, ...rawVp.map(r => r.devVP));
const maxI = Math.max(1, ...rawVp.map(r => r.islandVP));
const maxT = Math.max(1, ...rawVp.map(r => r.desertVP));
const maxBad = Math.max(1, ...rawVp.map(r => r.badgeVP));
const maxTot = Math.max(1, ...rawVp.map(r => r.total));

const rowsVp = rawVp.map(r => ([
  playerCell(r.p),
  barNode(r.buildingVP, maxB, r.p.color, r.buildingVP, { alignRight: true, alpha: 0.12 }),
  barNode(r.devVP, maxD, r.p.color, r.devVP, { alignRight: true, alpha: 0.12 }),
  barNode(r.islandVP, maxI, r.p.color, r.islandVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.desertVP, maxT, r.p.color, r.desertVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.badgeVP, maxBad, r.p.color, r.badgeVP, { alignRight: true, alpha: 0.10 }),
  barNode(r.total, maxTot, r.p.color, r.total, { alignRight: true, alpha: 0.14 }),
  (r.total === r.shown) ? '—' : (r.shown - r.total >= 0 ? `+${r.shown - r.total}` : String(r.shown - r.total)),
]));

secVp.appendChild(makeTable(['Player','Buildings','Dev VP','Island','Desert','Badges','Total (calc)','Δ'], rowsVp));
ui.pgTabBody.appendChild(secVp);

const sec2 = makeSection('Activity Totals');

const turnsByPlayer = (stats && stats.turnTimes && stats.turnTimes.byPlayer) ? stats.turnTimes.byPlayer : null;
const tradesByPlayer = (stats && stats.trades && stats.trades.byPlayer) ? stats.trades.byPlayer : null;
const devByPlayer = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : null;
const actionsByPlayer = (stats && stats.actions && stats.actions.byPlayer) ? stats.actions.byPlayer : null;
const buildsByPlayer = (stats && stats.builds && stats.builds.byPlayer) ? stats.builds.byPlayer : null;
const thieves = (stats && stats.thieves) ? stats.thieves : null;

const rows2_raw = players.map(p => {
  const tt = turnsByPlayer ? (turnsByPlayer[p.id] || null) : null;
  const tr = tradesByPlayer ? (tradesByPlayer[p.id] || null) : null;
  const dv = devByPlayer ? (devByPlayer[p.id] || null) : null;
  const ac = actionsByPlayer ? (actionsByPlayer[p.id] || null) : null;
  const bl = buildsByPlayer ? (buildsByPlayer[p.id] || null) : null;

  const turns = tt ? safeNum(tt.turns) : 0;
  const avgMs = tt ? safeNum(tt.avgMs) : 0;
  const devBought = dv ? safeNum(dv.bought) : 0;
  const devPlayed = dv ? safeNum(dv.played) : 0;
  const bankTrades = tr ? safeNum(tr.bank) : 0;
  const playerTrades = tr ? safeNum(tr.player) : 0;

  const robberMoves = ac ? safeNum(ac.robberMoves) : 0;
  const pirateMoves = ac ? safeNum(ac.pirateMoves) : 0;
  const steals = ac ? (safeNum(ac.robberSteals) + safeNum(ac.pirateSteals)) : 0;
  const stolenFrom = thieves ? (safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) + safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])) : 0;

  const shipMoves = bl ? safeNum(bl.ship_move) : 0;
  const discards = ac ? safeNum(ac.discards) : 0;

  return { p, turns, avgMs, devBought, devPlayed, bankTrades, playerTrades, robberMoves, pirateMoves, steals, stolenFrom, shipMoves, discards };
});

const maxTurns = Math.max(1, ...rows2_raw.map(r => r.turns));
const maxDevB = Math.max(1, ...rows2_raw.map(r => r.devBought));
const maxDevP = Math.max(1, ...rows2_raw.map(r => r.devPlayed));
const maxTrades = Math.max(1, ...rows2_raw.map(r => (r.bankTrades + r.playerTrades)));
const maxRobberMoves = Math.max(1, ...rows2_raw.map(r => r.robberMoves));
const maxPirateMoves = Math.max(1, ...rows2_raw.map(r => r.pirateMoves));
const maxSteals = Math.max(1, ...rows2_raw.map(r => r.steals));
const maxStolenFrom = Math.max(1, ...rows2_raw.map(r => r.stolenFrom));
const maxShipMoves = Math.max(1, ...rows2_raw.map(r => r.shipMoves));
const maxDiscards = Math.max(1, ...rows2_raw.map(r => r.discards));

const headers2 = ['Player','Turns','Avg Turn','Dev Bought','Dev Played','Trades','Robber Moves','Pirate Moves','Steals','Stolen From','Ship Moves','Discards'];
const rows2 = rows2_raw.map(r => {
  const trades = r.bankTrades + r.playerTrades;
  return [
    playerCell(r.p),
    barNode(r.turns, maxTurns, r.p.color, r.turns, { alignRight: true, alpha: 0.14 }),
    barNode(r.avgMs, Math.max(1, ...rows2_raw.map(x => x.avgMs || 0)), r.p.color, fmtMs(r.avgMs), { alignRight: true, alpha: 0.10 }),
    barNode(r.devBought, maxDevB, r.p.color, r.devBought, { alignRight: true, alpha: 0.12 }),
    barNode(r.devPlayed, maxDevP, r.p.color, r.devPlayed, { alignRight: true, alpha: 0.12 }),
    barNode(trades, maxTrades, r.p.color, `${r.bankTrades}/${r.playerTrades}`, { alignRight: true, alpha: 0.12 }),
    barNode(r.robberMoves, maxRobberMoves, r.p.color, r.robberMoves, { alignRight: true, alpha: 0.10 }),
    barNode(r.pirateMoves, maxPirateMoves, r.p.color, r.pirateMoves, { alignRight: true, alpha: 0.10 }),
    barNode(r.steals, maxSteals, r.p.color, r.steals, { alignRight: true, alpha: 0.12 }),
    barNode(r.stolenFrom, maxStolenFrom, r.p.color, r.stolenFrom, { alignRight: true, alpha: 0.10 }),
    barNode(r.shipMoves, maxShipMoves, r.p.color, r.shipMoves, { alignRight: true, alpha: 0.12 }),
    barNode(r.discards, maxDiscards, r.p.color, r.discards, { alignRight: true, alpha: 0.12 }),
  ];
});


    sec2.appendChild(makeTable(headers2, rows2));
    ui.pgTabBody.appendChild(sec2);

    const note = document.createElement('div');
    note.className = 'pgNote';
    const target = Math.floor(Number(st?.rules?.victoryPointsToWin ?? st?.rules?.victoryTarget ?? st?.rules?.vpToWin) || 10);
    const lr = st.longestRoad?.playerId ? (players.find(p=>p.id===st.longestRoad.playerId)?.name || '—') : '—';
    const la = st.largestArmy?.playerId ? (players.find(p=>p.id===st.largestArmy.playerId)?.name || '—') : '—';
    note.textContent = `Win target: ${target} VP • Longest Road: ${lr} (${st.longestRoad?.length ?? 0}) • Largest Army: ${la} (${st.largestArmy?.size ?? 0})`;
    ui.pgTabBody.appendChild(note);
    return;
  }

  // -------------------- DICE --------------------
  if (postgameState.tab === 'dice') {
    const ctrl = document.createElement('div');
    ctrl.className = 'pgSubTabs';
    const mkBtn = (key, label) => {
      const b = document.createElement('button');
      b.className = 'pgSubTab' + (postgameState.diceView === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => {
        postgameState.diceView = key;
        renderPostgameTab('dice');
      });
      return b;
    };
    ctrl.appendChild(mkBtn('totals','View Totals'));
    ctrl.appendChild(mkBtn('players','View Per Player'));
    ctrl.appendChild(mkBtn('prob','View Probability'));

    const sec = makeSection('Dice Rolls', ctrl);

    const byNum = (stats && stats.rolls && stats.rolls.byNumber) ? stats.rolls.byNumber : (st.diceStats || {});
    const total = (stats && stats.rolls && Number.isFinite(stats.rolls.total)) ? stats.rolls.total : Object.values(byNum||{}).reduce((a,v)=>a+safeNum(v),0);

    const probs = {2:1/36,3:2/36,4:3/36,5:4/36,6:5/36,7:6/36,8:5/36,9:4/36,10:3/36,11:2/36,12:1/36};

    if (postgameState.diceView === 'players') {
  const byPlayer = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};
  const rowsRaw = players.map(p => {
    const r = byPlayer[p.id] || {};
    const t = diceTotalFor(r);
    const s7 = safeNum(r[7] || 0);
    return { p, total: t, sevens: s7 };
  });
  const maxT = Math.max(1, ...rowsRaw.map(r => r.total));
  const max7 = Math.max(1, ...rowsRaw.map(r => r.sevens));

  const headers = ['Player','Total Rolls','7s'];
  const rows = rowsRaw.map(r => [
    playerCell(r.p),
    barNode(r.total, maxT, r.p.color, r.total, { alignRight: true }),
    barNode(r.sevens, max7, r.p.color, r.sevens, { alignRight: true, alpha: 0.12 }),
  ]);
  sec.appendChild(makeTable(headers, rows));
  ui.pgTabBody.appendChild(sec);
  addNote(`Total rolls: ${total}`);
  return;
}


    if (postgameState.diceView === 'prob') {
      const rows = [];
      let maxAbsDiff = 1;
      for (let r=2; r<=12; r++) {
        const c = safeNum(byNum[r] || 0);
        const exp = total ? (total * (probs[r] || 0)) : 0;
        const diff = c - exp;
        maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff));
        rows.push({ r, c, exp, diff });
      }
      const headers = ['Roll','Actual','Expected','Δ'];
      const tableRows = rows.map(o => {
        const diffTxt = (o.diff >= 0 ? '+' : '') + o.diff.toFixed(1);
        const col = (o.diff >= 0) ? '#4aa3ff' : '#ff6a6a';
        return [
          String(o.r),
          barNode(o.c, Math.max(1, ...rows.map(x => x.c)), '#9aa7b4', o.c, { alignRight: true, alpha: 0.12 }),
          o.exp.toFixed(1),
          barNode(Math.abs(o.diff), maxAbsDiff, col, diffTxt, { alignRight: true, alpha: 0.14 }),
        ];
      });
      sec.appendChild(makeTable(headers, tableRows));
      ui.pgTabBody.appendChild(sec);
      addNote('Expected values use the standard 2d6 distribution.');
      return;
    }

    // totals view (stacked by player)
const byPlayer = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};

const counts = [];
for (let r=2; r<=12; r++) {
  let c = safeNum(byNum[r] || 0);
  if (!c) {
    // fallback: sum from per-player buckets
    for (const p of players) c += safeNum((byPlayer[p.id] || {})[r] || 0);
  }
  counts.push({ r, c });
}
const maxCount = Math.max(1, ...counts.map(o => o.c));

// Legend
if (players.length) {
  const legend = document.createElement('div');
  legend.className = 'pgLegend';
  for (const p of players) {
    const it = document.createElement('div');
    it.className = 'pgLegendItem';
    const dot = document.createElement('div');
    dot.className = 'pgLegendDot';
    dot.style.background = p.color || '#777';
    const nm = document.createElement('div');
    nm.textContent = p.name;
    it.appendChild(dot);
    it.appendChild(nm);
    legend.appendChild(it);
  }
  sec.appendChild(legend);
}

const headers = ['Roll','Count (by player)','%'];
const rows = counts.map(o => {
  const r = o.r;
  const c = o.c;
  const pct = total ? Math.round((c/total)*1000)/10 : 0;

  const segs = players.map(p => ({
    value: safeNum((byPlayer[p.id] || {})[r] || 0),
    color: p.color || '#777',
  })).filter(s => safeNum(s.value) > 0);

  return [
    String(r),
    stackedBarNode(segs, maxCount, c, { alignRight: true, alpha: 0.22 }),
    pct.toFixed(1)
  ];
});

sec.appendChild(makeTable(headers, rows));
ui.pgTabBody.appendChild(sec);
addNote(`Total rolls: ${total}. Bars are stacked by player.`);
return;
  }

  // -------------------- RESOURCES --------------------
  if (postgameState.tab === 'resources') {
    const inferReplayPlayerId = (entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const d = (entry.data && typeof entry.data === 'object') ? entry.data : null;
      const cands = [d?.playerId, d?.forPlayerId, d?.toId, d?.fromId, d?.ownerId, entry.playerId];
      for (const c of cands) {
        const id = String(c || '').trim();
        if (id) return id;
      }
      return null;
    };

    const replayLog = Array.isArray(postgameState.replayLog) ? postgameState.replayLog : [];
    if (!postgameState.replayActivePlayerId && players[0]) postgameState.replayActivePlayerId = players[0].id;

    const replayControls = document.createElement('div');
    replayControls.className = 'pgReplayControls panelScalable';

    const replayTop = document.createElement('div');
    replayTop.className = 'pgReplayFloatTop';
    const replayGrip = document.createElement('div');
    replayGrip.className = 'dragGrip';
    replayGrip.textContent = '⋮⋮';
    replayTop.appendChild(replayGrip);
    const replayTitle = document.createElement('div');
    replayTitle.className = 'pgReplayFloatTitle';
    replayTitle.textContent = 'Replay Controls';
    replayTop.appendChild(replayTitle);
    const replayScaleHost = document.createElement('div');
    replayScaleHost.className = 'panelScaleHost';
    replayScaleHost.appendChild(makeToolScaleControl('postgame_replay_tab', replayControls, { title: 'Scale replay controls tab' }));
    replayTop.appendChild(replayScaleHost);
    replayControls.appendChild(replayTop);

    const replayContent = document.createElement('div');
    replayContent.className = 'pgReplayControlsBody panelScaleContent';
    replayControls.appendChild(replayContent);

    if (replayLog.length) {
      const maxI = replayLog.length - 1;
      if (postgameState.replayIndex < 0 || postgameState.replayIndex > maxI) postgameState.replayIndex = 0;

      const step = replayLog[postgameState.replayIndex] || null;
      const stepPid = inferReplayPlayerId(step);
      if (stepPid && (!postgameState.replayPlayerLocked || !postgameState.replayActivePlayerId)) postgameState.replayActivePlayerId = stepPid;

      const nav = document.createElement('div');
      nav.className = 'pgReplayNav';
      const mkNav = (txt, delta) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = txt;
        b.disabled = (delta < 0) ? (postgameState.replayIndex <= 0) : (postgameState.replayIndex >= maxI);
        b.addEventListener('click', () => {
          postgameState.replayIndex = Math.max(0, Math.min(maxI, postgameState.replayIndex + delta));
          postgameState.replayPlayerLocked = false;
          renderPostgameTab('resources');
        });
        return b;
      };
      nav.appendChild(mkNav('◀ Prev', -1));
      nav.appendChild(mkNav('Next ▶', 1));

      const stepMeta = document.createElement('div');
      stepMeta.className = 'pgReplayMeta';
      stepMeta.textContent = `Step ${postgameState.replayIndex + 1}/${replayLog.length}`;
      nav.appendChild(stepMeta);
      replayContent.appendChild(nav);

      const stepText = document.createElement('div');
      stepText.className = 'pgReplayText';
      const t = step && step.ts ? fmtDateTime(step.ts) : '—';
      stepText.textContent = `${t} · ${step && step.text ? step.text : '—'}`;
      replayContent.appendChild(stepText);

      const stepState = document.createElement('div');
      stepState.className = 'pgReplayStepState';

      const readResourceMap = (v) => {
        if (!v || typeof v !== 'object') return null;
        const out = {};
        let touched = false;
        for (const k of RESOURCE_KEYS) {
          const n = Number(v[k]);
          if (Number.isFinite(n)) {
            out[k] = Math.max(0, Math.floor(n));
            touched = true;
          }
        }
        return touched ? out : null;
      };

      const stepData = (step && step.data && typeof step.data === 'object') ? step.data : null;
      const bankFromStep = readResourceMap(stepData?.bank || stepData?.bankResources || stepData?.bankAfter || stepData?.bankBefore);
      const bankFallback = readResourceMap(st?.bank) || { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
      const bankRes = bankFromStep || bankFallback;

      const bankCard = document.createElement('div');
      bankCard.className = 'pgReplayResCard';
      const bankTitle = document.createElement('div');
      bankTitle.className = 'pgReplayResTitle';
      bankTitle.textContent = 'Bank Resources';
      bankCard.appendChild(bankTitle);
      const bankGrid = document.createElement('div');
      bankGrid.className = 'pgReplayResGrid';
      for (const rk of RESOURCE_KEYS) {
        const item = document.createElement('div');
        item.className = 'pgReplayResItem';
        item.textContent = `${rk}: ${Math.max(0, Math.floor(Number(bankRes[rk] || 0)))}`;
        bankGrid.appendChild(item);
      }
      bankCard.appendChild(bankGrid);
      stepState.appendChild(bankCard);

      const playerCard = document.createElement('div');
      playerCard.className = 'pgReplayResCard';
      const playerTitle = document.createElement('div');
      playerTitle.className = 'pgReplayResTitle';
      playerTitle.textContent = 'Player Resources';
      playerCard.appendChild(playerTitle);
      const playerGrid = document.createElement('div');
      playerGrid.className = 'pgReplayResGrid';
      const pResById = (stepData && stepData.playerResources && typeof stepData.playerResources === 'object') ? stepData.playerResources : null;
      for (const p of players) {
        const pStep = readResourceMap(pResById ? pResById[p.id] : null);
        const pFinal = readResourceMap(p.resources);
        const pRes = pStep || pFinal || { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
        const total = RESOURCE_KEYS.reduce((s, k) => s + Math.max(0, Number(pRes[k] || 0)), 0);
        const item = document.createElement('button');
        item.className = 'pgReplayResPlayerBtn' + (postgameState.replayActivePlayerId === p.id ? ' active' : '');
        item.style.borderColor = p.color || '#888';
        item.textContent = `${p.name} (${total})`;
        item.addEventListener('click', () => {
          postgameState.replayActivePlayerId = p.id;
          postgameState.replayPlayerLocked = true;
          renderPostgameTab('resources');
        });
        playerGrid.appendChild(item);
      }
      playerCard.appendChild(playerGrid);
      stepState.appendChild(playerCard);

      replayContent.appendChild(stepState);

      const logWrap = document.createElement('div');
      logWrap.className = 'pgReplayLog';
      const logTitle = document.createElement('div');
      logTitle.className = 'pgReplayResTitle';
      logTitle.textContent = 'Game Log';
      logWrap.appendChild(logTitle);
      const start = Math.max(0, postgameState.replayIndex - 8);
      const end = Math.min(replayLog.length - 1, postgameState.replayIndex + 8);
      for (let i = start; i <= end; i += 1) {
        const e = replayLog[i] || {};
        const b = document.createElement('button');
        b.className = 'pgReplayLogRow' + (i === postgameState.replayIndex ? ' active' : '');
        b.textContent = `${i + 1}. ${e.text || '—'}`;
        b.addEventListener('click', () => {
          postgameState.replayIndex = i;
          postgameState.replayPlayerLocked = false;
          renderPostgameTab('resources');
        });
        logWrap.appendChild(b);
      }
      replayContent.appendChild(logWrap);
    }

    const chips = document.createElement('div');
    chips.className = 'pgReplayPlayers';
    for (const p of players) {
      const chip = document.createElement('button');
      chip.className = 'pgReplayPlayerChip' + (postgameState.replayActivePlayerId === p.id ? ' active' : '');
      chip.textContent = p.name;
      chip.style.borderColor = p.color || '#888';
      chip.addEventListener('click', () => {
        postgameState.replayActivePlayerId = p.id;
        postgameState.replayPlayerLocked = true;
        renderPostgameTab('resources');
      });
      chips.appendChild(chip);
    }
    replayContent.appendChild(chips);
    try { makeDraggablePanel(replayControls, replayGrip, "hexsettlers_postgame_replay_pos_v1"); } catch(_) {}
    ui.pgTabBody.appendChild(replayControls);

    const secTop = makeSection('Resources Overview');

    const resByPlayer = (stats && stats.resources && stats.resources.byPlayer) ? stats.resources.byPlayer : null;

    const rowsRaw = players.map(p => {
      const rs = resByPlayer ? (resByPlayer[p.id] || null) : null;
      const gained = rs ? sumRes(rs.gained) : 0;
      const lost = rs ? sumRes(rs.lost) : 0;
      const net = gained - lost;
      const finalHand = sumRes(p.resources || {});
      return { p, gained, lost, net, finalHand };
    });

    const maxGain = Math.max(1, ...rowsRaw.map(r => r.gained));
    const maxLost = Math.max(1, ...rowsRaw.map(r => r.lost));
    const maxFinal = Math.max(1, ...rowsRaw.map(r => r.finalHand));

    const headers = ['Player','Gained','Lost','Net','Final Hand'];
    const rows = rowsRaw.map(r => {
      const netTxt = (r.net >= 0 ? '+' : '') + r.net;
      const netCol = (r.net >= 0) ? '#4aa3ff' : '#ff6a6a';
      return [
        playerCell(r.p),
        barNode(r.gained, maxGain, r.p.color, r.gained, { alignRight: true }),
        barNode(r.lost, maxLost, r.p.color, r.lost, { alignRight: true, alpha: 0.12 }),
        barNode(Math.abs(r.net), Math.max(1, ...rowsRaw.map(x => Math.abs(x.net))), netCol, netTxt, { alignRight: true, alpha: 0.14 }),
        barNode(r.finalHand, maxFinal, r.p.color, r.finalHand, { alignRight: true, alpha: 0.10 }),
      ];
    });

    secTop.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(secTop);

    if (!resByPlayer) {
      addNote('Detailed resource breakdown is unavailable for this match.');
      return;
    }

    const secTurn = makeSection('Per Turn Resource Deltas');

    // Prefer the dice history to define the displayed turns (main game turns).
    const rollHist = (stats && stats.rolls && Array.isArray(stats.rolls.history)) ? stats.rolls.history : [];
    const turnSet = new Set();
    for (const e of rollHist) {
      const t = Number(e?.turn);
      if (Number.isFinite(t) && t > 0) turnSet.add(t);
    }
    // Fallback to any resource-byTurn keys if dice history is missing.
    if (turnSet.size === 0) {
      for (const pid of Object.keys(resByPlayer || {})) {
        const bt = resByPlayer[pid]?.byTurn || null;
        if (!bt) continue;
        for (const k of Object.keys(bt)) {
          const t = parseInt(k, 10);
          if (Number.isFinite(t) && t > 0) turnSet.add(t);
        }
      }
    }

    const turns = Array.from(turnSet).sort((a,b) => a-b);
    if (!turns.length) {
      secTurn.appendChild(document.createTextNode('Per-turn resource timeline is unavailable for this match.'));
      ui.pgTabBody.appendChild(secTurn);
      return;
    }

    const maxTurn = Math.max(...turns);

    // Map turn -> roll info
    const rollByTurn = {};
    for (const e of rollHist) {
      const t = Number(e?.turn);
      if (!Number.isFinite(t) || t <= 0) continue;
      if (!rollByTurn[t]) rollByTurn[t] = e;
    }

    // Build per-player cumulative resource totals by turn (end-of-turn snapshot).
    const snapshots = {}; // pid -> { [turn]: {k:total} }
    const deltas = {};    // pid -> { [turn]: {k:delta} }
    for (const pl of players) {
      const pid = pl.id;
      const pr = resByPlayer[pid] || {};
      const bt = pr.byTurn || {};
      deltas[pid] = bt;

      const cum = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
      const snap = {};

      // Include setup deltas (usually stored under turn 0) so totals for turn 1+ are correct.
      for (let t = 0; t <= maxTurn; t++) {
        const m = bt[t] || bt[String(t)] || {};
        for (const k of RESOURCE_KEYS) cum[k] = safeNum(cum[k]) + safeNum(m[k] || 0);
        snap[t] = { ...cum };
      }

      snapshots[pid] = snap;
    }

    const thPlayer = (pl) => {
      const wrap = document.createElement('div');
      wrap.className = 'pgThPlayer';
      const dot = document.createElement('div');
      dot.className = 'pgLegendDot';
      dot.style.background = pl.color || '#777';
      const nm = document.createElement('div');
      nm.textContent = pl.name;
      wrap.appendChild(dot);
      wrap.appendChild(nm);
      return wrap;
    };

    const resIconSrc = (k) => getTextureAssetUrl(`Ports/${k}.png`);

    const resTurnCard = (pid, turn) => {
      const bt = deltas[pid] || {};
      const d = bt[turn] || bt[String(turn)] || {};
      const tot = (snapshots[pid] && snapshots[pid][turn]) ? snapshots[pid][turn] : ({ brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 });

      const card = document.createElement('div');
      card.className = 'pgResTurnCard';

      for (const rk of RESOURCE_KEYS) {
        const slot = document.createElement('div');
        slot.className = 'pgResSlot';

        const img = document.createElement('img');
        img.className = 'pgResIcon';
        img.src = resIconSrc(rk);
        img.alt = rk;
        img.draggable = false;

        const nums = document.createElement('div');
        nums.className = 'pgResNums';

        const totalSpan = document.createElement('span');
        totalSpan.className = 'pgResTotal';
        totalSpan.textContent = String(Math.max(0, safeNum(tot[rk] || 0)));

        const dv = safeNum(d[rk] || 0);
        const deltaSpan = document.createElement('span');
        deltaSpan.className = 'pgResDelta ' + (dv > 0 ? 'pos' : (dv < 0 ? 'neg' : 'zero'));
        deltaSpan.textContent = (dv >= 0 ? '+' : '') + String(dv);

        nums.appendChild(totalSpan);
        nums.appendChild(deltaSpan);
        slot.appendChild(img);
        slot.appendChild(nums);
        card.appendChild(slot);
      }

      return card;
    };

    const timelinePlayers = players.filter(p => p.id === postgameState.replayActivePlayerId);
    const shownPlayers = timelinePlayers.length ? timelinePlayers : players;

    const headersT = [
      'Turn',
      'Roll',
      ...shownPlayers.map(p => thPlayer(p)),
    ];

    const rowsT = turns.map(t => {
      const e = rollByTurn[t] || null;
      let rollTxt = '—';
      if (e && Number.isFinite(Number(e.roll))) {
        const r = Number(e.roll);
        const d1 = Number(e.d1);
        const d2 = Number(e.d2);
        rollTxt = (Number.isFinite(d1) && Number.isFinite(d2)) ? `${r} (${d1}+${d2})` : String(r);
      }

      const turnNode = document.createElement('div');
      turnNode.className = 'pgTurnCell';
      turnNode.textContent = String(t);

      const rollNode = document.createElement('div');
      rollNode.className = 'pgRollCell';
      rollNode.textContent = rollTxt;

      return [
        turnNode,
        rollNode,
        ...shownPlayers.map(p => resTurnCard(p.id, t)),
      ];
    });

    const tbl = makeTable(headersT, rowsT);
    tbl.classList.add('pgResTurnTable');
    secTurn.appendChild(tbl);
    ui.pgTabBody.appendChild(secTurn);

    const activeP = players.find(p => p.id === postgameState.replayActivePlayerId) || null;
    if (activeP) {
      const current = document.createElement('div');
      current.className = 'pgCurrentPlayerBadge';
      current.textContent = `Current: ${activeP.name}`;
      current.style.borderColor = activeP.color || '#888';
      ui.pgTabBody.appendChild(current);
    }

    addNote('Each cell shows (total, delta) for every resource on that turn. Green = gained, red = spent/lost.');
    return;
  }

  // -------------------- ACTIVITY --------------------
  if (postgameState.tab === 'activity') {
    const secTime = makeSection('Turn Time');

    const byPlayer = (stats && stats.turnTimes && stats.turnTimes.byPlayer) ? stats.turnTimes.byPlayer : null;
    if (!byPlayer) {
      secTime.appendChild(document.createTextNode('Turn timing data is unavailable for this match.'));
      ui.pgTabBody.appendChild(secTime);
      return;
    }

    const rowsRaw = players.map(p => {
      const tt = byPlayer[p.id] || {};
      return { p, turns: safeNum(tt.turns), totalMs: safeNum(tt.totalMs), avgMs: safeNum(tt.avgMs) };
    });

    const maxTurns = Math.max(1, ...rowsRaw.map(r => r.turns));
    const maxTotalMs = Math.max(1, ...rowsRaw.map(r => r.totalMs));

    const headers = ['Player','Turns','Total Time','Avg Turn'];
    const rows = rowsRaw.map(r => [
      playerCell(r.p),
      barNode(r.turns, maxTurns, r.p.color, r.turns, { alignRight: true, alpha: 0.14 }),
      barNode(r.totalMs, maxTotalMs, r.p.color, fmtMs(r.totalMs), { alignRight: true, alpha: 0.12 }),
      barNode(r.avgMs, Math.max(1, ...rowsRaw.map(x => x.avgMs)), r.p.color, fmtMs(r.avgMs), { alignRight: true, alpha: 0.10 }),
    ]);

    secTime.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(secTime);

    const secActs = makeSection('Action Counts');

const actions = (stats && stats.actions && stats.actions.byPlayer) ? stats.actions.byPlayer : {};
const trades = (stats && stats.trades && stats.trades.byPlayer) ? stats.trades.byPlayer : {};
const dev = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : {};
const builds = (stats && stats.builds && stats.builds.byPlayer) ? stats.builds.byPlayer : {};
const rolls = (stats && stats.rolls && stats.rolls.byPlayer) ? stats.rolls.byPlayer : {};
const thieves = (stats && stats.thieves) ? stats.thieves : null;

const raw = players.map(p => {
  const ac = actions[p.id] || {};
  const tr = trades[p.id] || {};
  const dv = dev[p.id] || {};
  const bl = builds[p.id] || {};
  const rl = rolls[p.id] || {};

  const stolenFrom = thieves ? (
    safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) +
    safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])
  ) : 0;

  return {
    p,
    rolls: diceTotalFor(rl),
    settlements: safeNum(bl.settlement),
    cities: safeNum(bl.city),
    roads: safeNum(bl.road),
    ships: safeNum(bl.ship),
    shipMoves: safeNum(bl.ship_move),
    devPlayed: safeNum(dv.played),
    trades: safeNum(tr.bank) + safeNum(tr.player),
    robberMoves: safeNum(ac.robberMoves),
    pirateMoves: safeNum(ac.pirateMoves),
    robberSteals: safeNum(ac.robberSteals),
    pirateSteals: safeNum(ac.pirateSteals),
    stolenFrom,
    discards: safeNum(ac.discards),
  };
});

const max = {
  rolls: Math.max(1, ...raw.map(r => r.rolls)),
  settlement: Math.max(1, ...raw.map(r => r.settlements)),
  city: Math.max(1, ...raw.map(r => r.cities)),
  road: Math.max(1, ...raw.map(r => r.roads)),
  ship: Math.max(1, ...raw.map(r => r.ships)),
  shipMoves: Math.max(1, ...raw.map(r => r.shipMoves)),
  devPlayed: Math.max(1, ...raw.map(r => r.devPlayed)),
  trades: Math.max(1, ...raw.map(r => r.trades)),
  robberMoves: Math.max(1, ...raw.map(r => r.robberMoves)),
  pirateMoves: Math.max(1, ...raw.map(r => r.pirateMoves)),
  robberSteals: Math.max(1, ...raw.map(r => r.robberSteals)),
  pirateSteals: Math.max(1, ...raw.map(r => r.pirateSteals)),
  stolenFrom: Math.max(1, ...raw.map(r => r.stolenFrom)),
  discards: Math.max(1, ...raw.map(r => r.discards)),
};

const headers2 = ['Player','Rolls','S','C','R','Sh','Ship Moves','Dev Played','Trades','RM','PM','RS','PS','Stolen From','Discards'];
const rows2 = raw.map(r => [
  playerCell(r.p),
  barNode(r.rolls, max.rolls, r.p.color, r.rolls, { alignRight: true, alpha: 0.14 }),
  barNode(r.settlements, max.settlement, r.p.color, r.settlements, { alignRight: true, alpha: 0.10 }),
  barNode(r.cities, max.city, r.p.color, r.cities, { alignRight: true, alpha: 0.10 }),
  barNode(r.roads, max.road, r.p.color, r.roads, { alignRight: true, alpha: 0.10 }),
  barNode(r.ships, max.ship, r.p.color, r.ships, { alignRight: true, alpha: 0.10 }),
  barNode(r.shipMoves, max.shipMoves, r.p.color, r.shipMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.devPlayed, max.devPlayed, r.p.color, r.devPlayed, { alignRight: true, alpha: 0.10 }),
  barNode(r.trades, max.trades, r.p.color, r.trades, { alignRight: true, alpha: 0.10 }),
  barNode(r.robberMoves, max.robberMoves, r.p.color, r.robberMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.pirateMoves, max.pirateMoves, r.p.color, r.pirateMoves, { alignRight: true, alpha: 0.10 }),
  barNode(r.robberSteals, max.robberSteals, r.p.color, r.robberSteals, { alignRight: true, alpha: 0.10 }),
  barNode(r.pirateSteals, max.pirateSteals, r.p.color, r.pirateSteals, { alignRight: true, alpha: 0.10 }),
  barNode(r.stolenFrom, max.stolenFrom, r.p.color, r.stolenFrom, { alignRight: true, alpha: 0.10 }),
  barNode(r.discards, max.discards, r.p.color, r.discards, { alignRight: true, alpha: 0.10 }),
]);

secActs.appendChild(makeTable(headers2, rows2));
ui.pgTabBody.appendChild(secActs);
addNote('S=Settlements, C=Cities, R=Roads, Sh=Ships, RM/PM=Robber/Pirate Moves, RS/PS=Robber/Pirate Steals.');
return;
  }

  // -------------------- DEV CARDS --------------------
  if (postgameState.tab === 'devcards') {
    const controls = document.createElement('div');
    controls.className = 'pgControls';
    controls.appendChild(makePlayerSelect('Focus player', 'devFocusId', winnerId));

    const sec1 = makeSection('Dev Cards Overview');

    const byPlayer = (stats && stats.dev && stats.dev.byPlayer) ? stats.dev.byPlayer : null;
    if (!byPlayer) {
      sec1.appendChild(document.createTextNode('Dev card statistics are unavailable for this match.'));
      ui.pgTabBody.appendChild(sec1);
      return;
    }

    const raw = players.map(p => {
      const d = byPlayer[p.id] || {};
      const bought = safeNum(d.bought);
      const played = safeNum(d.played);
      const byType = d.playedByType || {};
      const knights = safeNum(byType.knight);
      const vp = safeNum(byType.victory_point);
      return { p, bought, played, knights, vp };
    });

    const maxBought = Math.max(1, ...raw.map(r => r.bought));
    const maxPlayed = Math.max(1, ...raw.map(r => r.played));
    const maxKnights = Math.max(1, ...raw.map(r => r.knights));

    const headers = ['Player','Bought','Played','Knights Played','VP Cards Played'];
    const rows = raw.map(r => [
      playerCell(r.p),
      barNode(r.bought, maxBought, r.p.color, r.bought, { alignRight: true, alpha: 0.14 }),
      barNode(r.played, maxPlayed, r.p.color, r.played, { alignRight: true, alpha: 0.12 }),
      barNode(r.knights, maxKnights, r.p.color, r.knights, { alignRight: true, alpha: 0.12 }),
      barNode(r.vp, Math.max(1, ...raw.map(x => x.vp)), r.p.color, r.vp, { alignRight: true, alpha: 0.10 }),
    ]);

    sec1.appendChild(makeTable(headers, rows));
    ui.pgTabBody.appendChild(sec1);

    const pid = postgameState.devFocusId || winnerId;
    const focus = players.find(pp => pp.id === pid) || players[0];
    const d = byPlayer[pid] || {};
    const types = [
      ['knight','Knight'],
      ['victory_point','Victory Point'],
      ['road_building','Road Building'],
      ['year_of_plenty','Year of Plenty'],
      ['invention','Year of Plenty'],
      ['monopoly','Monopoly'],
    ];

    const boughtByType = d.boughtByType || {};
    const playedByType = d.playedByType || {};

    const rowsT = [];
    let maxB = 1, maxP = 1;
    for (const [k,label] of types) {
      const b = safeNum(boughtByType[k]);
      const p = safeNum(playedByType[k]);
      if (b || p) {
        maxB = Math.max(maxB, b);
        maxP = Math.max(maxP, p);
      }
    }

    for (const [k,label] of types) {
      const b = safeNum(boughtByType[k]);
      const p = safeNum(playedByType[k]);
      if (!b && !p) continue;
      rowsT.push([
        label,
        barNode(b, maxB, focus.color, b, { alignRight: true, alpha: 0.12 }),
        barNode(p, maxP, focus.color, p, { alignRight: true, alpha: 0.12 }),
      ]);
    }

    const sec2 = makeSection('Focus: Breakdown by Type', controls);
    sec2.appendChild(makeTable(['Card Type','Bought','Played'], rowsT));
    ui.pgTabBody.appendChild(sec2);

    addNote('Dev stats are derived from purchases and plays tracked by the server.');
    return;
  }
}


function enterPostgame() {
  if (!ui.postgameOverlay) return;
  clearPostgameTimers();

  postgameState.active = true;
  postgameState.hidden = false;
  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');

  setPostgameVisible(true);
  setPostgamePanelVisible(false);

  const winner = computeWinner(state);
  const wName = winner ? winner.name : 'Victory';
  if (ui.postgameSplashTitle) ui.postgameSplashTitle.textContent = `${wName} Victory!`;
  if (ui.postgameSplashSub) ui.postgameSplashSub.textContent = 'Calculating final results…';

  // After 2 seconds, switch to stats panel.
  postgameState.splashTimer = setTimeout(() => {
    if (!state || state.phase !== 'game-over') return;
    if (postgameState.hidden) return;
    setPostgamePanelVisible(true);
    refreshPostgameHeader();
    renderPostgameTab(postgameState.tab || 'summary');
  }, 2000);
}

function refreshPostgameHeader() {
  const st = postgameState.snapshot || state;
  if (!st) return;
  const winner = computeWinner(st);
  const wName = winner ? winner.name : '—';
  const turns = Number(st.turnNumber || 0);
  const dur = fmtMs(gameDurationMs(st));
  if (ui.pgWinnerLine) ui.pgWinnerLine.textContent = `${wName} Victory!`;
  if (ui.pgMetaLine) ui.pgMetaLine.textContent = `Turns: ${turns}   Time: ${dur}`;
}

function exitPostgame() {
  clearPostgameTimers();
  postgameState.active = false;
  postgameState.hidden = false;
  setPostgameVisible(false);
  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');
}

// -------------------- History UI --------------------
function fmtDateTime(ms) {
  const t = Number(ms || 0);
  if (!t) return '—';
  const d = new Date(t);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function mapLabelFromRules(rules) {
  const r = rules || {};
  const mode = String(r.mapMode || r.mode || '').toLowerCase();
  const scenario = String(r.mapScenario || r.scenario || '').toLowerCase();
  if (mode === 'seafarers') {
    if (scenario) return `Seafarers / ${scenario.replaceAll('_',' ')}`;
    return 'Seafarers';
  }
  if (mode) return mode.replaceAll('_',' ');
  return '—';
}

function setHistoryVisible(visible) {
  historyState.active = !!visible;
  if (!ui.historyOverlay) return;
  ui.historyOverlay.classList.toggle('hidden', !historyState.active);
  if (historyState.active) renderHistory();
}

function openHistoryOverlay(tab) {
  historyState.tab = tab || 'games';
  historyState.loadingGames = true;
  historyState.loadingBoard = true;
  setHistoryVisible(true);
  requestHistoryData();
}

function closeHistoryOverlay() {
  setHistoryVisible(false);
}

function requestHistoryData() {
  if (!authUser) {
    historyState.loadingGames = false;
    historyState.loadingBoard = false;
    renderHistory();
    return;
  }
  try {
    send({ type: 'get_game_history', limit: 500 });
    send({ type: 'get_player_leaderboard' });
  } catch(_) {}
}

function renderHistory() {
  if (!ui.historyBody) return;

  // tab button state
  try {
    const tabs = ui.historyTabs ? ui.historyTabs.querySelectorAll('.hTab') : [];
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === historyState.tab));
  } catch(_) {}

  if (ui.historySub) {
    const gN = Array.isArray(historyState.games) ? historyState.games.length : 0;
    const pN = Array.isArray(historyState.leaderboard) ? historyState.leaderboard.length : 0;
    ui.historySub.textContent = authUser ? `${gN} games • ${pN} players` : 'Log in to view your server history';
  }

  ui.historyBody.innerHTML = '';

  if (!authUser) {
    const d = document.createElement('div');
    d.className = 'hint';
    d.textContent = 'Log in to view game history and player stats.';
    ui.historyBody.appendChild(d);
    return;
  }

  if (historyState.tab === 'players') renderLeaderboardTab();
  else renderGamesHistoryTab();
}

function renderGamesHistoryTab() {
  const wrap = document.createElement('div');
  wrap.className = 'historyList';

  const games = Array.isArray(historyState.games) ? historyState.games : [];
  if (historyState.loadingGames) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'Loading…';
    wrap.appendChild(h);
  } else if (!games.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'No completed games in history yet.';
    wrap.appendChild(h);
  } else {
    for (const g of games) {
      const card = document.createElement('div');
      card.className = 'historyCard';

      const meta = document.createElement('div');
      meta.className = 'historyMeta';

      const pLine = (Array.isArray(g.players) ? g.players : []).map(p => `${p.name} (${p.vp})`).join(' • ');
      const line1 = document.createElement('div');
      line1.className = 'historyLine1';
      const w = g.winnerName ? `${g.winnerName} won` : 'Completed game';
      line1.textContent = `${w} — ${pLine || '—'}`;

      const line2 = document.createElement('div');
      line2.className = 'historyLine2';
      line2.textContent = `${fmtDateTime(g.endedAt)}  •  Turns: ${Number(g.turns || 0)}  •  ${mapLabelFromRules(g.rules)}`;

      meta.appendChild(line1);
      meta.appendChild(line2);

      const actions = document.createElement('div');
      actions.className = 'historyActions';
      const replayBtn = document.createElement('button');
      replayBtn.className = 'btn';
      replayBtn.textContent = 'Replay';
      replayBtn.addEventListener('click', () => {
        if (!g.id) return;
        historyState.openMode = 'replay';
        try { send({ type: 'get_game_history_entry', id: g.id }); } catch(_) {}
      });

      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn primary';
      viewBtn.textContent = 'View Summary';
      viewBtn.addEventListener('click', () => {
        if (!g.id) return;
        historyState.openMode = 'summary';
        try { send({ type: 'get_game_history_entry', id: g.id }); } catch(_) {}
      });

      actions.appendChild(replayBtn);
      actions.appendChild(viewBtn);

      card.appendChild(meta);
      card.appendChild(actions);
      wrap.appendChild(card);
    }
  }

  ui.historyBody.appendChild(wrap);
}

function sortLeaderboardRows(rows) {
  const key = historyState.sortKey || 'wins';
  const dir = historyState.sortDir === 'asc' ? 1 : -1;

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const str = (v) => String(v || '').toLowerCase();

  const sorted = rows.slice().sort((a,b) => {
    if (key === 'name') return str(a.name).localeCompare(str(b.name)) * dir;
    return (num(a[key]) - num(b[key])) * dir;
  });

  return sorted;
}

function setLeaderboardSort(key) {
  if (historyState.sortKey === key) {
    historyState.sortDir = (historyState.sortDir === 'asc') ? 'desc' : 'asc';
  } else {
    historyState.sortKey = key;
    historyState.sortDir = 'desc';
  }
  renderHistory();
}

function renderLeaderboardTab() {
  const rowsRaw = Array.isArray(historyState.leaderboard) ? historyState.leaderboard : [];
  // Hide/ignore AI entries in the lobby player stats view
  const rows = rowsRaw.filter(r => {
    const id = String((r && r.id) || '');
    const name = String((r && r.name) || (r && r.username) || '');
    if (!id && !name) return false;
    if ((r && (r.isAI || r.ai))) return false;
    if (id.toLowerCase().startsWith('ai_')) return false;
    if (/^ai\b/i.test(name)) return false;
    if (/\(ai\)/i.test(name)) return false;
    return true;
  });

  if (historyState.loadingBoard) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'Loading…';
    ui.historyBody.appendChild(h);
    return;
  }

  if (!rows.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = 'No player stats yet (finish at least one game).';
    ui.historyBody.appendChild(h);
    return;
  }

  const sorted = sortLeaderboardRows(rows);

  const wrap = document.createElement('div');
  wrap.style.overflow = 'auto';

  const table = document.createElement('table');
  table.className = 'standingsTable';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');

  const columns = [
    { key: 'name', label: 'Player' },
    { key: 'gamesPlayed', label: 'GP' },
    { key: 'wins', label: 'W' },
    { key: 'losses', label: 'L' },
    { key: 'winPct', label: 'WIN%' },
    { key: 'avgVP', label: 'AVG VP' },
    { key: 'totalVP', label: 'VP' },
    { key: 'avgTurnSec', label: 'AVG TURN (s)' },
    { key: 'roads', label: 'Roads' },
    { key: 'ships', label: 'Ships' },
    { key: 'settlements', label: 'Sett' },
    { key: 'cities', label: 'Cities' },
    { key: 'devBought', label: 'Dev+' },
    { key: 'devPlayed', label: 'Dev▶' },
    { key: 'resGained', label: 'Res+' },
    { key: 'resLost', label: 'Res-' },
  ];

  for (const c of columns) {
    const th = document.createElement('th');
    th.textContent = c.label;
    th.addEventListener('click', () => setLeaderboardSort(c.key));
    if (historyState.sortKey === c.key) th.classList.add(historyState.sortDir === 'asc' ? 'sortAsc' : 'sortDesc');
    trh.appendChild(th);
  }

  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  let rank = 1;
  for (const r of sorted) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'standName';
    const dot = document.createElement('div');
    dot.className = 'standDot';
    dot.style.background = r.color || '#777';
    const nm = document.createElement('div');
    nm.className = 'standNameText';
    nm.textContent = `${rank}. ${r.name || r.username || r.id || '—'}`;
    nameWrap.appendChild(dot);
    nameWrap.appendChild(nm);
    tdName.appendChild(nameWrap);
    tr.appendChild(tdName);

    const add = (v) => {
      const td = document.createElement('td');
      td.textContent = String(v);
      tr.appendChild(td);
    };

    add(r.gamesPlayed);
    add(r.wins);
    add(r.losses);
    add((Number(r.winPct || 0) * 100).toFixed(1));
    add(Number(r.avgVP || 0).toFixed(2));
    add(r.totalVP);
    add(Number(r.avgTurnSec || 0).toFixed(1));
    add(r.roads);
    add(r.ships);
    add(r.settlements);
    add(r.cities);
    add(r.devBought);
    add(r.devPlayed);
    add(r.resGained);
    add(r.resLost);

    tbody.appendChild(tr);
    rank += 1;
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  ui.historyBody.appendChild(wrap);
}

function openPostgameSnapshot(snapshot, entry = null, opts = {}) {
  if (!snapshot) return;
  clearPostgameTimers();

  postgameState.snapshot = snapshot;
  postgameState.historyMode = true;
  postgameState.hidden = false;
  postgameState.active = true;
  postgameState.replayLog = Array.isArray(entry && entry.log) ? entry.log.slice() : [];
  postgameState.replayIndex = postgameState.replayLog.length ? 0 : -1;
  postgameState.replayActivePlayerId = null;
  postgameState.replayPlayerLocked = false;

  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');
  if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.textContent = 'Back';
  if (ui.pgHideBtn) ui.pgHideBtn.textContent = 'Close';

  setPostgameVisible(true);
  setPostgamePanelVisible(true);

  refreshPostgameHeader();
  renderPostgameTab(opts.tab || 'summary');
}

function closePostgameSnapshot() {
  postgameState.snapshot = null;
  postgameState.historyMode = false;
  postgameState.replayLog = [];
  postgameState.replayIndex = -1;
  postgameState.replayActivePlayerId = null;
  postgameState.replayPlayerLocked = false;
  clearPostgameTimers();
  setPostgameVisible(false);
  if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.textContent = 'Main Menu';
  if (ui.pgHideBtn) ui.pgHideBtn.textContent = 'Hide Stats';
  try { if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden'); } catch(_) {}
}

function syncPostgameToState() {
  if (postgameState.historyMode) return;
  if (!state) { exitPostgame(); return; }
  const phase = state.phase;
  if (phase === 'game-over') {
    if (!postgameState.active) {
      enterPostgame();
    } else {
      // keep header fresh
      if (!postgameState.hidden && !ui.postgamePanel?.classList.contains('hidden')) {
        refreshPostgameHeader();
        renderPostgameTab(postgameState.tab || 'summary');
      }
    }
  } else {
    if (postgameState.active) exitPostgame();
  }
  postgameState.lastPhase = phase;
}

  function defaultVictoryPointsFor(rules) {
    const mmRaw = String(rules?.mapMode || 'classic').toLowerCase();
    // UI can use a synthetic mapMode 'seafarers56' to represent 5–6 player Seafarers scenarios.
    const mm = (mmRaw === 'seafarers56') ? 'seafarers' : mmRaw;
    const scen = (mmRaw === 'seafarers56')
      ? String(rules?.seafarersScenario56 || rules?.seafarersScenario || 'six_islands').toLowerCase()
      : String(rules?.seafarersScenario || 'four_islands').toLowerCase();
    if (mm !== 'seafarers') return 10;
    if (scen === 'fog_island' || scen === 'fog-island' || scen === 'fog' || scen === 'fog_island_56') return 12;
    if (scen === 'through_the_desert' || scen === 'through-the-desert' || scen === 'desert' || scen === 'through_the_desert_56') return 14;
    if (scen === 'heading_for_new_shores' || scen === 'heading-for-new-shores' || scen === 'new_shores' || scen === 'newshores' || scen === 'heading') return 14;
    if (scen === 'six_islands' || scen === 'six-islands' || scen === 'sixislands' || scen === 'six') return 14;
    if (scen === 'cartographer_4_manual' || scen === 'cartographer-4-manual' || scen === 'cartographer_manual' || scen === 'manual_cartographer' || scen === 'cartographer_56_manual' || scen === 'cartographer-56-manual' || scen === 'cartographer56_manual') return 12;
    if (scen === 'cartographer_4_random' || scen === 'cartographer-4-random' || scen === 'cartographer_random' || scen === 'random_cartographer' || scen === 'cartographer_4' || scen === 'cartographer-4' || scen === 'cartographer4' || scen === 'cartographer' || scen === 'cartographer_56_random' || scen === 'cartographer-56-random' || scen === 'cartographer56_random' || scen === 'scattered_tiles_56' || scen === 'scattered_tiles56' || scen === 'scattered_56') return 12;
    return 13; // four islands
  }

  function defaultBaseResourcesFor(rules) {
    const mmRaw = String(rules?.mapMode || 'classic').toLowerCase();
    const mm = mmRaw;
    if (mm === 'classic56' || mm === 'seafarers56') return 24;
    const scen = String(rules?.seafarersScenario56 || rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    if (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random')) return 24;
    return 19;
  }

  function uiMapModeFromRules(rules) {
    const mm = String(rules?.mapMode || 'classic').toLowerCase();
    const scen = String(rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    if (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random')) return 'seafarers56';
    return rules?.mapMode || 'classic';
  }

  function uiIsSixIslands(rulesOrSelection) {
    const mm = String(rulesOrSelection?.mapMode || 'classic').toLowerCase();
    if (mm === 'seafarers56') return true;
    const scen = String(rulesOrSelection?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    return (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random'));
  }

  // -------------------- Structure sprites (settlement/city/road/ship) --------------------

  const STRUCT = {
    imgs: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    ready: false,
    tile: 512,
    loaded: 0,
  };

  const STRUCT_IMG_SRC = ['texture%20pack/Tokens/tokens_red.png', 'texture%20pack/Tokens/tokens_blue.png', 'texture%20pack/Tokens/tokens_green.png', 'texture%20pack/Tokens/tokens_yellow.png', 'texture%20pack/Tokens/tokens_purple.png', 'texture%20pack/Tokens/tokens_teal.png', 'texture%20pack/Tokens/tokens_white.png', 'texture%20pack/Tokens/tokens_orange.png', 'texture%20pack/Tokens/tokens_black.png', 'texture%20pack/Tokens/tokens_pink.png'];

  const STRUCT_CELL = {
    settlement: { r: 0, c: 0 },
    city: { r: 0, c: 1 },
    road: { r: 1, c: 0 },
    ship: { r: 1, c: 1 },
  };

  function structTileSizeForImage(img) {
    const w = Number(img?.naturalWidth || img?.width || 0);
    const h = Number(img?.naturalHeight || img?.height || 0);
    const side = Math.max(w, h) > 0 ? Math.min(w || h, h || w) : (STRUCT.tile || 1024);
    return Math.max(1, Math.floor(side / 2));
  }

  try {
    STRUCT.imgs.forEach((img, idx) => {
      const fallback = STRUCT_IMG_SRC[idx];
      const primary = resolveLegacyTextureUrl(fallback) || fallback;
      let triedFallback = false;
      img.onerror = () => {
        if (triedFallback || !fallback || primary === fallback) {
          img.onerror = null;
          return;
        }
        triedFallback = true;
        img.src = fallback;
      };
      img.onload = () => {
        STRUCT.loaded++;
        STRUCT.tile = structTileSizeForImage(img); // remember a sane default, but draw uses per-image size
        STRUCT.ready = true; // at least one sprite loaded
        try { render(); } catch (_) {}
      };
      img.src = primary || fallback;
    });
  } catch (_) {}

  function playerColorIndex(color) {
    const c = String(color || '').toLowerCase();
    if (c === '#e74c3c') return 0; // red
    if (c === '#3498db') return 1; // blue
    if (c === '#2ecc71') return 2; // green
    if (c === '#f1c40f') return 3; // yellow
    if (c === '#8000f8') return 4; // purple
    if (c === '#88f8f8') return 5; // teal
    if (c === '#f8f8f8' || c === '#ffffff') return 6; // white
    if (c === '#f86800') return 7; // orange
    if (c === '#111111' || c === '#000000') return 8; // black
    if (c === '#ff6ec7') return 9; // pink
    return 0;
  }

  function tokenBgPosPct(kind) {
    const cell = STRUCT_CELL[kind] || STRUCT_CELL.settlement;
    return { x: cell.c * 100, y: cell.r * 100 };
  }


  // Colorblind token markers (shape per player color)
  const COLORBLIND_SHAPE_BY_COLOR = [
    'triangle',  // red
    'square',    // blue
    'pentagon',  // green
    'hexagon',   // yellow
    'star',      // purple
    'trapezoid', // teal
    'diamond',   // white
    'circle',    // orange
    'cross',     // black
    'heart',     // pink
  ];

  function drawRegularPolygonPath(sides, radius, startAngle) {
    const n = Math.max(3, sides | 0);
    const a0 = (typeof startAngle === 'number') ? startAngle : (-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * Math.PI * 2 / n);
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawStarPath(points, outerR, innerR) {
    const p = Math.max(5, points | 0);
    const step = Math.PI / p;
    const a0 = -Math.PI / 2;
    for (let i = 0; i < p * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const a = a0 + i * step;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawColorblindMark(colorIdx, x, y, size, rotRad) {
    if (!colorblindMode) return;
    const idx = (colorIdx == null ? 0 : (colorIdx | 0));
    const shape = COLORBLIND_SHAPE_BY_COLOR[idx] || 'circle';
    const s = Math.max(10, Number(size || 0));
    const r = s / 2;

    ctx.save();
    ctx.translate(x, y);
    if (rotRad) ctx.rotate(rotRad);

    // High-contrast styling. Special cases for white and black pieces.
    let fill = 'rgba(255,255,255,.78)';
    let stroke = 'rgba(0,0,0,.92)';
    if (idx === 6) { // white
      fill = 'rgba(0,0,0,.55)';
      stroke = 'rgba(255,255,255,.96)';
    } else if (idx === 8) { // black
      fill = 'rgba(255,255,255,.92)';
      stroke = 'rgba(255,255,255,.96)';
    }

    ctx.lineWidth = Math.max(2, Math.round(s * 0.12));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = Math.max(2, Math.round(s * 0.10));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const drawCrossShape = () => {
      const bar = Math.max(2, r * 0.36);
      const arm = r * 0.95;
      ctx.moveTo(-bar / 2, -arm);
      ctx.lineTo(bar / 2, -arm);
      ctx.lineTo(bar / 2, -bar / 2);
      ctx.lineTo(arm, -bar / 2);
      ctx.lineTo(arm, bar / 2);
      ctx.lineTo(bar / 2, bar / 2);
      ctx.lineTo(bar / 2, arm);
      ctx.lineTo(-bar / 2, arm);
      ctx.lineTo(-bar / 2, bar / 2);
      ctx.lineTo(-arm, bar / 2);
      ctx.lineTo(-arm, -bar / 2);
      ctx.lineTo(-bar / 2, -bar / 2);
      ctx.closePath();
    };

    const drawHeartShape = () => {
      const top = r * 0.9;
      const bottom = r * 0.95;
      ctx.moveTo(0, bottom);
      ctx.bezierCurveTo(r * 1.0, r * 0.3, r * 1.05, -r * 0.45, 0, -top * 0.15);
      ctx.bezierCurveTo(-r * 1.05, -r * 0.45, -r * 1.0, r * 0.3, 0, bottom);
      ctx.closePath();
    };

    ctx.beginPath();
    if (shape === 'triangle') {
      drawRegularPolygonPath(3, r, -Math.PI / 2);
    } else if (shape === 'square') {
      drawRegularPolygonPath(4, r, Math.PI / 4);
    } else if (shape === 'pentagon') {
      drawRegularPolygonPath(5, r, -Math.PI / 2);
    } else if (shape === 'hexagon') {
      drawRegularPolygonPath(6, r, Math.PI / 6);
    } else if (shape === 'star') {
      drawStarPath(5, r, Math.max(3, r * 0.45));
    } else if (shape === 'trapezoid') {
      const top = r * 0.60;
      ctx.moveTo(-top, -r);
      ctx.lineTo(top, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
    } else if (shape === 'diamond') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
    } else if (shape === 'cross') {
      drawCrossShape();
    } else if (shape === 'heart') {
      drawHeartShape();
    } else { // circle
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }


  function regularPolygonPoints(sides, radius, startAngle, cx, cy) {
    const n = Math.max(3, sides | 0);
    const a0 = (typeof startAngle === 'number') ? startAngle : (-Math.PI / 2);
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * Math.PI * 2 / n);
      out.push(`${(cx + Math.cos(a) * radius).toFixed(2)},${(cy + Math.sin(a) * radius).toFixed(2)}`);
    }
    return out.join(' ');
  }

  function starPolygonPoints(points, outerR, innerR, cx, cy) {
    const p = Math.max(5, points | 0);
    const step = Math.PI / p;
    const a0 = -Math.PI / 2;
    const out = [];
    for (let i = 0; i < p * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const a = a0 + i * step;
      out.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return out.join(' ');
  }

  function createColorblindShapeBadge(color, sizePx) {
    const idx = playerColorIndex(color);
    const shape = COLORBLIND_SHAPE_BY_COLOR[idx] || 'circle';
    const NS = 'http://www.w3.org/2000/svg';
    const size = Math.max(10, Number(sizePx || 14));
    const vb = 24;
    const c = vb / 2;
    const r = 8.5;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${vb} ${vb}`);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'inline-block';
    svg.style.flex = '0 0 auto';
    svg.style.verticalAlign = 'middle';
    svg.style.filter = 'drop-shadow(0 1px 1px rgba(0,0,0,.55))';

    let fill = 'rgba(255,255,255,.78)';
    let stroke = 'rgba(0,0,0,.92)';
    if (idx === 6) {
      fill = 'rgba(0,0,0,.55)';
      stroke = 'rgba(255,255,255,.96)';
    } else if (idx === 8) {
      fill = 'rgba(255,255,255,.92)';
      stroke = 'rgba(255,255,255,.96)';
    }

    let el = null;
    if (shape === 'circle') {
      el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', String(c));
      el.setAttribute('cy', String(c));
      el.setAttribute('r', String(r));
    } else if (shape === 'heart') {
      el = document.createElementNS(NS, 'path');
      const d = [
        `M ${c.toFixed(2)} ${(c + r * 0.9).toFixed(2)}`,
        `C ${(c + r * 1.0).toFixed(2)} ${(c + r * 0.25).toFixed(2)}, ${(c + r * 1.05).toFixed(2)} ${(c - r * 0.45).toFixed(2)}, ${c.toFixed(2)} ${(c - r * 0.15).toFixed(2)}`,
        `C ${(c - r * 1.05).toFixed(2)} ${(c - r * 0.45).toFixed(2)}, ${(c - r * 1.0).toFixed(2)} ${(c + r * 0.25).toFixed(2)}, ${c.toFixed(2)} ${(c + r * 0.9).toFixed(2)}`,
        'Z',
      ].join(' ');
      el.setAttribute('d', d);
    } else {
      el = document.createElementNS(NS, 'polygon');
      let pts = '';
      if (shape === 'triangle') pts = regularPolygonPoints(3, r, -Math.PI / 2, c, c);
      else if (shape === 'square') pts = regularPolygonPoints(4, r, Math.PI / 4, c, c);
      else if (shape === 'pentagon') pts = regularPolygonPoints(5, r, -Math.PI / 2, c, c);
      else if (shape === 'hexagon') pts = regularPolygonPoints(6, r, Math.PI / 6, c, c);
      else if (shape === 'star') pts = starPolygonPoints(5, r, Math.max(3, r * 0.45), c, c);
      else if (shape === 'trapezoid') {
        const top = r * 0.60;
        pts = [
          `${(c - top).toFixed(2)},${(c - r).toFixed(2)}`,
          `${(c + top).toFixed(2)},${(c - r).toFixed(2)}`,
          `${(c + r).toFixed(2)},${(c + r).toFixed(2)}`,
          `${(c - r).toFixed(2)},${(c + r).toFixed(2)}`,
        ].join(' ');
      } else if (shape === 'diamond') {
        pts = [
          `${c.toFixed(2)},${(c - r).toFixed(2)}`,
          `${(c + r).toFixed(2)},${c.toFixed(2)}`,
          `${c.toFixed(2)},${(c + r).toFixed(2)}`,
          `${(c - r).toFixed(2)},${c.toFixed(2)}`,
        ].join(' ');
      } else if (shape === 'cross') {
        const bar = Math.max(2, r * 0.36);
        const arm = r * 0.95;
        pts = [
          `${(c - bar / 2).toFixed(2)},${(c - arm).toFixed(2)}`,
          `${(c + bar / 2).toFixed(2)},${(c - arm).toFixed(2)}`,
          `${(c + bar / 2).toFixed(2)},${(c - bar / 2).toFixed(2)}`,
          `${(c + arm).toFixed(2)},${(c - bar / 2).toFixed(2)}`,
          `${(c + arm).toFixed(2)},${(c + bar / 2).toFixed(2)}`,
          `${(c + bar / 2).toFixed(2)},${(c + bar / 2).toFixed(2)}`,
          `${(c + bar / 2).toFixed(2)},${(c + arm).toFixed(2)}`,
          `${(c - bar / 2).toFixed(2)},${(c + arm).toFixed(2)}`,
          `${(c - bar / 2).toFixed(2)},${(c + bar / 2).toFixed(2)}`,
          `${(c - arm).toFixed(2)},${(c + bar / 2).toFixed(2)}`,
          `${(c - arm).toFixed(2)},${(c - bar / 2).toFixed(2)}`,
          `${(c - bar / 2).toFixed(2)},${(c - bar / 2).toFixed(2)}`,
        ].join(' ');
      } else {
        pts = regularPolygonPoints(6, r, 0, c, c);
      }
      el.setAttribute('points', pts);
    }
    el.setAttribute('fill', fill);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', '2.2');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('stroke-linecap', 'round');
    svg.appendChild(el);
    try { svg.title = shape; } catch (_) {}
    return svg;
  }

  // -------------------- HUD docking (board overlays) -------------------- (board overlays) --------------------

  const hudDock = {
    isDocked: false,
    originals: null,
    builtTurnHud: false,
    builtToolsHud: false,
    movedDevInline: false,
  };

  const rightSidebarDock = {
    isDocked: false,
    originals: null,
  };

  function rememberOriginal(el) {
    return {
      parent: el && el.parentNode ? el.parentNode : null,
      next: el && el.parentNode ? el.nextSibling : null,
    };
  }

  function restoreOriginal(el, rec) {
    if (!el || !rec || !rec.parent) return;
    if (rec.next && rec.next.parentNode === rec.parent) rec.parent.insertBefore(el, rec.next);
    else rec.parent.appendChild(el);
  }

  function clearDockedPanelPosition(el) {
    if (!el || !el.style) return;
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.right = '';
    el.style.bottom = '';
    el.style.width = '';
    el.style.maxWidth = '';
    el.style.minWidth = '';
    try { if (el.dataset) el.dataset.popupDragged = '0'; } catch (_) {}
  }

  function syncRightSidebarDock(inGame) {
    const boardWrap = document.querySelector('section.boardWrap');
    if (!boardWrap || !ui.rightSidebar || !ui.rightSidebarInner) return;

    if (inGame && !rightSidebarDock.isDocked) {
      rightSidebarDock.isDocked = true;
      rightSidebarDock.originals = {
        log: ui.logCard ? rememberOriginal(ui.logCard) : null,
        dev: ui.devCard ? rememberOriginal(ui.devCard) : null,
      };
    }

    if (inGame) {
      setRightSidebarWidth(getSavedRightSidebarWidth());
      ensureRightSidebarResizeHandle();
      ui.rightSidebar.classList.remove('hidden');
      if (ui.rightSidebar.parentNode !== boardWrap) boardWrap.appendChild(ui.rightSidebar);

      // Ensure the bottom resources dock uses the same scale as the Dev panel.
      try {
        if (ui.rightSidebarResourcesDock && ui.rightSidebarResourcesDock.style) {
          ui.rightSidebarResourcesDock.style.setProperty('--tool-ui-scale', String(getToolUiScale('dev_panel')));
        }
      } catch (_) {}

      const anchor = ui.rightSidebarResourcesDock || null;
      if (ui.logCard) {
        ui.logCard.dataset.dragDisabled = '1';
        ui.logCard.classList.add('rightSidebarDocked');
        clearDockedPanelPosition(ui.logCard);
        if (ui.logCard.parentNode !== ui.rightSidebarInner) {
          if (anchor) ui.rightSidebarInner.insertBefore(ui.logCard, anchor);
          else ui.rightSidebarInner.appendChild(ui.logCard);
        }
      }
      if (ui.devCard) {
        ui.devCard.dataset.dragDisabled = '1';
        ui.devCard.classList.add('rightSidebarDocked');
        ui.devCard.classList.remove('hudDevOverlay');
        clearDockedPanelPosition(ui.devCard);
        if (ui.devCard.parentNode !== ui.rightSidebarInner) {
          if (anchor) ui.rightSidebarInner.insertBefore(ui.devCard, anchor);
          else ui.rightSidebarInner.appendChild(ui.devCard);
        }
      }
      return;
    }

    ui.rightSidebar.classList.add('hidden');
    if (!rightSidebarDock.isDocked) return;
    rightSidebarDock.isDocked = false;

    if (ui.logCard) {
      delete ui.logCard.dataset.dragDisabled;
      ui.logCard.classList.remove('rightSidebarDocked');
      clearDockedPanelPosition(ui.logCard);
      restoreOriginal(ui.logCard, rightSidebarDock.originals && rightSidebarDock.originals.log);
    }
    if (ui.devCard) {
      delete ui.devCard.dataset.dragDisabled;
      ui.devCard.classList.remove('rightSidebarDocked');
      clearDockedPanelPosition(ui.devCard);
      restoreOriginal(ui.devCard, rightSidebarDock.originals && rightSidebarDock.originals.dev);
    }
  }

  function buildToolsHudOnce() {
    if (!ui.toolsCard || hudDock.builtToolsHud) return;
    hudDock.builtToolsHud = true;

    const card = ui.toolsCard;
    card.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'hudBarRow';

    const grip = document.createElement('div');
    grip.className = 'dragGrip';
    grip.textContent = '⋮⋮';
    row.appendChild(grip);

    const conn = document.createElement('div');
    conn.className = 'hudConn connInline connTight';
    if (ui.connDot) conn.appendChild(ui.connDot);
    if (ui.connText) conn.appendChild(ui.connText);
    row.appendChild(conn);

    const btns = document.createElement('div');
    btns.className = 'hudBtns';
    // In-game: keep the same tools as the lobby, but in a compact HUD bar.
    // The user expects Rules to be available in-game next to Game Log.
    for (const b of [ui.logBtn, ui.rulesBtn, ui.diceBtn, ui.chatBtn, ui.audioBtn, ui.colorblindBtn, ui.leaveGameBtn, ui.endGameVoteBtn, ui.idsBtn]) {
      if (!b) continue;
      b.classList.add('btnTiny');
      btns.appendChild(b);
    }
    row.appendChild(btns);

    card.appendChild(row);
    ensureInGamePanelScaleControls();
  }

  function buildTurnHudOnce() {
    if (!ui.turnCard || hudDock.builtTurnHud) return;
    hudDock.builtTurnHud = true;

    const card = ui.turnCard;
    card.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'hudBarRow';

    const grip = document.createElement('div');
    grip.className = 'dragGrip';
    grip.textContent = '⋮⋮';
    row.appendChild(grip);

    const actions = document.createElement('div');
    actions.className = 'hudBtns';
    const order = [
      ui.rollBtn,
      ui.endBtn,
      ui.buildRoadBtn,
      ui.buildShipBtn,
      ui.moveShipBtn,
      ui.buildSettlementBtn,
      ui.buildCityBtn,
      ui.bankTradeBtn,
      ui.playerTradeBtn,
      ui.pauseBtn,
    ];
    for (const b of order) {
      if (!b) continue;
      b.classList.add('btnTiny');
      actions.appendChild(b);
    }
    row.appendChild(actions);

    // Reserve the scale-control slot between actions and the turn/timer text so the
    // bottom bar reads left-to-right as: buttons → scale → status text.
    const scaleHost = document.createElement('div');
    scaleHost.className = 'hudBarScaleHost';
    row.appendChild(scaleHost);

    const info = document.createElement('div');
    info.className = 'hudTurnInfo';
    if (ui.turnInfo) info.appendChild(ui.turnInfo);
    if (ui.timerInfo) info.appendChild(ui.timerInfo);
    row.appendChild(info);

    card.appendChild(row);
    ensureInGamePanelScaleControls();
  }

  function dockHudToBoard(inGame) {
    const panel = document.querySelector('section.panel');
    const boardWrap = document.querySelector('section.boardWrap');
    if (!panel || !boardWrap) return;

    if (inGame && !hudDock.isDocked) {
      hudDock.isDocked = true;
      hudDock.originals = {
        tools: ui.toolsCard ? rememberOriginal(ui.toolsCard) : null,
        turn: ui.turnCard ? rememberOriginal(ui.turnCard) : null,
        dev: ui.devCard ? rememberOriginal(ui.devCard) : null,
        dock: ui.rollDock ? rememberOriginal(ui.rollDock) : null,
      };

      buildToolsHudOnce();
      buildTurnHudOnce();

      if (ui.toolsCard) {
        ui.toolsCard.classList.add('hudBar', 'hudTopLeft');
        boardWrap.appendChild(ui.toolsCard);
        // Drag handle lives inside the HUD bar so button clicks don't start dragging.
        try {
          const grip = ui.toolsCard.querySelector('.dragGrip');
          if (grip && !ui.toolsCard.dataset.dragReady) {
            makeDraggablePanel(ui.toolsCard, grip, 'hexsettlers_tools_pos_v2');
            ui.toolsCard.dataset.dragReady = '1';
          }
        } catch (_) {}
      }
      if (ui.turnCard) {
        ui.turnCard.classList.add('hudBar', 'hudBottomLeft');
        boardWrap.appendChild(ui.turnCard);
        try {
          const grip = ui.turnCard.querySelector('.dragGrip');
          if (grip && !ui.turnCard.dataset.dragReady) {
            makeDraggablePanel(ui.turnCard, grip, 'hexsettlers_turn_pos_v2');
            ui.turnCard.dataset.dragReady = '1';
          }
        } catch (_) {}
      }
      ensureInGamePanelScaleControls();
      if (ui.rollDock) {
        ui.rollDock.classList.add('hudRollDock');
        boardWrap.appendChild(ui.rollDock);
      }
    }

    if (!inGame && hudDock.isDocked) {
      hudDock.isDocked = false;
      if (ui.toolsCard) ui.toolsCard.classList.remove('hudBar', 'hudTopLeft');
      if (ui.turnCard) ui.turnCard.classList.remove('hudBar', 'hudBottomLeft');
      if (ui.devCard) ui.devCard.classList.remove('hudDevOverlay');
      if (ui.rollDock) ui.rollDock.classList.remove('hudRollDock');

      // When undocking back to the side panel, clear fixed positioning so the layout is normal.
      for (const el of [ui.toolsCard, ui.turnCard, ui.devCard]) {
        if (!el) continue;
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
      }

      restoreOriginal(ui.toolsCard, hudDock.originals?.tools);
      restoreOriginal(ui.turnCard, hudDock.originals?.turn);
      restoreOriginal(ui.devCard, hudDock.originals?.dev);
      restoreOriginal(ui.rollDock, hudDock.originals?.dock);
    }
  }

  const draggablePanelLayoutRegistry = new Set();

  function getLocalPanelLayoutOwnerKey() {
    try {
      const explicit = (window && window.__hexSettlersPanelLayoutOwnerKey != null)
        ? String(window.__hexSettlersPanelLayoutOwnerKey || '').trim()
        : '';
      if (explicit) return `player:${explicit}`;
    } catch (_) {}
    try {
      if (authUser && authUser.id) return `user:${String(authUser.id)}`;
    } catch (_) {}
    try {
      if (authToken) return `token:${String(authToken).slice(0, 48)}`;
    } catch (_) {}
    return 'anon';
  }

  function scopedPanelStorageKey(baseKey) {
    if (!baseKey) return null;
    return `${String(baseKey)}::${getLocalPanelLayoutOwnerKey()}`;
  }

  function applySavedPanelPosition(panelEl, storageKey) {
    if (!panelEl || !storageKey) return false;
    let raw = null;
    let scopedKey = null;
    try {
      scopedKey = scopedPanelStorageKey(storageKey);
      if (scopedKey) raw = localStorage.getItem(scopedKey);
      if (!raw) {
        const legacy = localStorage.getItem(storageKey);
        if (legacy) {
          raw = legacy;
          try {
            if (scopedKey) localStorage.setItem(scopedKey, legacy);
          } catch (_) {}
        }
      }
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || typeof p.left !== 'number' || typeof p.top !== 'number') return false;
      const pad = 6;
      let left = Number(p.left);
      let top = Number(p.top);
      try {
        const r = panelEl.getBoundingClientRect ? panelEl.getBoundingClientRect() : null;
        const w = Math.max(0, Math.round((r && Number.isFinite(r.width)) ? r.width : (panelEl.offsetWidth || 0)));
        const h = Math.max(0, Math.round((r && Number.isFinite(r.height)) ? r.height : (panelEl.offsetHeight || 0)));
        if (w > 0) left = Math.max(pad, Math.min(left, Math.max(pad, window.innerWidth - w - pad)));
        if (h > 0) top = Math.max(pad, Math.min(top, Math.max(pad, window.innerHeight - h - pad)));
      } catch (_) {}
      panelEl.style.position = 'fixed';
      panelEl.style.left = left + 'px';
      panelEl.style.top = top + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      return true;
    } catch (_) {
      return false;
    }
  }

  function registerPanelLayoutRestorer(fn) {
    if (typeof fn !== 'function') return;
    try { draggablePanelLayoutRegistry.add(fn); } catch (_) {}
  }

  function reapplySavedInGamePanelLayouts() {
    try {
      draggablePanelLayoutRegistry.forEach(fn => {
        try { fn(); } catch (_) {}
      });
    } catch (_) {}
  }

  function setLocalPanelLayoutOwnerKey(ownerKey) {
    try {
      if (ownerKey == null || ownerKey === '') {
        delete window.__hexSettlersPanelLayoutOwnerKey;
      } else {
        window.__hexSettlersPanelLayoutOwnerKey = String(ownerKey);
      }
    } catch (_) {}
    reapplySavedInGamePanelLayouts();
    try { loadAudioSfxLevelsForCurrentOwner(); } catch (_) {}
  }

  // Make a floating panel draggable (pointer-based, desktop + touch).
  function makeDraggablePanel(panelEl, handleEl, storageKey) {
    if (!panelEl || !handleEl) return;

    handleEl.style.cursor = 'grab';
    handleEl.style.userSelect = 'none';
    handleEl.style.touchAction = 'none';

    function restoreSavedPosition() {
      try {
        if (!storageKey) return;
        applySavedPanelPosition(panelEl, storageKey);
      } catch (_) {}
    }

    // Restore saved position.
    restoreSavedPosition();
    if (storageKey) registerPanelLayoutRestorer(restoreSavedPosition);

    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }

    handleEl.addEventListener('pointerdown', (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      try {
        const t = ev.target;
        if (t && t.closest && t.closest('button, input, select, textarea, a, label, .toolScaleControl, .panelScaleHost, .hudBarScaleHost')) return;
      } catch (_) {}
      try { if (panelEl && panelEl.dataset && panelEl.dataset.dragDisabled === '1') return; } catch (_) {}
      dragging = true;
      handleEl.style.cursor = 'grabbing';
      const r = panelEl.getBoundingClientRect();
      panelEl.style.position = 'fixed';
      panelEl.style.left = r.left + 'px';
      panelEl.style.top = r.top + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      startLeft = r.left;
      startTop = r.top;
      startX = ev.clientX;
      startY = ev.clientY;
      try { handleEl.setPointerCapture(ev.pointerId); } catch (_) {}
      ev.preventDefault();
    });

    handleEl.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const r = panelEl.getBoundingClientRect();
      const maxLeft = window.innerWidth - r.width - 6;
      const maxTop = window.innerHeight - r.height - 6;
      const left = clamp(startLeft + dx, 6, maxLeft);
      const top = clamp(startTop + dy, 6, maxTop);
      panelEl.style.left = left + 'px';
      panelEl.style.top = top + 'px';
      try { if (panelEl && panelEl.dataset) panelEl.dataset.popupDragged = '1'; } catch (_) {}
      if (storageKey) {
        try {
          const scopedKey = scopedPanelStorageKey(storageKey);
          if (scopedKey) localStorage.setItem(scopedKey, JSON.stringify({ left, top }));
        } catch (_) {}
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      handleEl.style.cursor = 'grab';
    }

    handleEl.addEventListener('pointerup', endDrag);
    handleEl.addEventListener('pointercancel', endDrag);
  }

  function normalizeAudioSfxPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return AUDIO_SFX_DEFAULT_PCT;
    return Math.max(AUDIO_SFX_MIN_PCT, Math.min(AUDIO_SFX_MAX_PCT, Math.round(n)));
  }

  function defaultAudioSfxLevels() {
    const out = Object.create(null);
    for (const def of AUDIO_SFX_DEFS) out[def.key] = AUDIO_SFX_DEFAULT_PCT;
    return out;
  }

  function getAudioSfxStorageKey() {
    return `${AUDIO_SFX_LEVELS_KEY}::${getLocalPanelLayoutOwnerKey()}`;
  }

  function saveAudioSfxLevelsForCurrentOwner() {
    try {
      localStorage.setItem(getAudioSfxStorageKey(), JSON.stringify(audioSfxLevels || {}));
    } catch (_) {}
  }

  function refreshAudioPanelUi() {
    if (!audioPanel) return;
    try {
      const rows = audioPanel.querySelectorAll('[data-audio-sfx-key]');
      rows.forEach((row) => {
        const key = String(row.getAttribute('data-audio-sfx-key') || '');
        if (!key) return;
        const pct = normalizeAudioSfxPercent((audioSfxLevels && audioSfxLevels[key] != null) ? audioSfxLevels[key] : AUDIO_SFX_DEFAULT_PCT);
        const slider = row.querySelector('input[type="range"]');
        const valueEl = row.querySelector('.audioSfxPct');
        if (slider && String(slider.value) !== String(pct)) slider.value = String(pct);
        if (valueEl) valueEl.textContent = `${pct}%`;
      });
    } catch (_) {}
  }

  function setAudioPanelVisible(visible) {
    const show = !!visible;
    if (show) ensureAudioPanel();
    audioPanelOpen = show;
    if (!audioPanel) return;
    audioPanel.classList.toggle('hidden', !show);
    if (ui.audioBtn) ui.audioBtn.classList.toggle('primary', show);
    if (show) refreshAudioPanelUi();
  }

  function toggleAudioPanel() {
    if (!(state && state.phase && state.phase !== 'lobby')) return;
    setAudioPanelVisible(!audioPanelOpen);
  }

  function ensureAudioPanel() {
    if (audioPanel) return audioPanel;
    const panel = document.createElement('div');
    panel.id = 'audioSfxPanel';
    panel.className = 'audioSfxPanel hidden';

    const header = document.createElement('div');
    header.className = 'audioSfxPanelHeader';
    const title = document.createElement('div');
    title.className = 'audioSfxPanelTitle';
    title.textContent = 'Audio';
    const actions = document.createElement('div');
    actions.className = 'audioSfxPanelActions';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btnTiny';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      applyAudioSfxLevels(defaultAudioSfxLevels(), { persist: true });
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btnTiny';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => setAudioPanelVisible(false));
    actions.appendChild(resetBtn);
    actions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(actions);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'audioSfxPanelBody';
    for (const def of AUDIO_SFX_DEFS) {
      const row = document.createElement('div');
      row.className = 'audioSfxRow';
      row.setAttribute('data-audio-sfx-key', def.key);

      const labelWrap = document.createElement('div');
      labelWrap.className = 'audioSfxRowHead';
      const label = document.createElement('div');
      label.className = 'audioSfxLabel';
      label.textContent = def.label;
      const pct = document.createElement('div');
      pct.className = 'audioSfxPct';
      pct.textContent = '100%';
      labelWrap.appendChild(label);
      labelWrap.appendChild(pct);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(AUDIO_SFX_MIN_PCT);
      slider.max = String(AUDIO_SFX_MAX_PCT);
      slider.step = '1';
      slider.value = String(AUDIO_SFX_DEFAULT_PCT);
      slider.className = 'audioSfxSlider';
      slider.addEventListener('input', () => {
        setAudioSfxLevel(def.key, slider.value, { persist: true, refreshPanel: true });
      });

      row.appendChild(labelWrap);
      row.appendChild(slider);
      body.appendChild(row);
    }
    panel.appendChild(body);

    const foot = document.createElement('div');
    foot.className = 'audioSfxPanelFoot';
    foot.textContent = 'Per-player local volume. 100% = default mix, 0–200% range.';
    panel.appendChild(foot);

    document.body.appendChild(panel);
    try { makeDraggablePanel(panel, header, 'hexsettlers_audio_panel_pos_v1'); } catch (_) {}

    document.addEventListener('mousedown', (ev) => {
      if (!audioPanel || !audioPanelOpen) return;
      const t = ev.target;
      if (t === audioPanel || (audioPanel.contains && audioPanel.contains(t))) return;
      if (ui.audioBtn && (t === ui.audioBtn || (t && t.closest && t.closest('#audioBtn')))) return;
      setAudioPanelVisible(false);
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && audioPanelOpen) setAudioPanelVisible(false);
    });

    audioPanel = panel;
    refreshAudioPanelUi();
    return audioPanel;
  }

  // Build popup (context menu) for click-to-build.
  let buildPopup = null;
  let pendingBuildClick = null; // { absX, absY, targetKind, targetId }

  function ensureBuildPopup() {
    if (buildPopup) return;
    buildPopup = document.createElement('div');
    buildPopup.className = 'buildPopup hidden';
    buildPopup.innerHTML = `
      <div class="buildPopupTitle">Build</div>
      <div class="buildPopupBtns" id="buildPopupBtns"></div>
    `;
    document.body.appendChild(buildPopup);
    try { makeDraggablePanel(buildPopup, buildPopup, null); } catch (_) {}

    // Close on outside click
    document.addEventListener('mousedown', (ev) => {
      if (!buildPopup || buildPopup.classList.contains('hidden')) return;
      if (ev.target === buildPopup || buildPopup.contains(ev.target)) return;
      hideBuildPopup();
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideBuildPopup();
    });
  }

  function hideBuildPopup() {
    if (!buildPopup) return;
    buildPopup.classList.add('hidden');
    buildPopup.style.left = '-9999px';
    buildPopup.style.top = '-9999px';
    pendingBuildClick = null;
    // keep node-confirm separate; build popup closing should not clear hover indicator
  }

  function showBuildPopup(absX, absY, options, onPick) {
    ensureBuildPopup();
    const btnWrap = buildPopup.querySelector('#buildPopupBtns');
    btnWrap.innerHTML = '';

    for (const opt of options) {
      const b = document.createElement('button');
      b.className = 'choiceBtn';
      b.textContent = opt.label || opt.kind;
      b.addEventListener('click', () => {
        hideBuildPopup();
        onPick(opt);
      });
      btnWrap.appendChild(b);
    }

    // Position near cursor, keep on-screen.
    buildPopup.classList.remove('hidden');
    buildPopup.style.left = `${Math.round(absX)}px`;
    buildPopup.style.top = `${Math.round(absY)}px`;

    const r = buildPopup.getBoundingClientRect();
    const pad = 8;
    let nx = absX;
    let ny = absY;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - pad - r.width);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, window.innerHeight - pad - r.height);
    if (nx !== absX || ny !== absY) {
      buildPopup.style.left = `${Math.round(nx)}px`;
      buildPopup.style.top = `${Math.round(ny)}px`;
    }
  }

  // HiDPI canvas
  function resizeCanvas() {
    const rect = ui.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ui.canvas.width = Math.floor(rect.width * dpr);
    ui.canvas.height = Math.floor((rect.height) * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { try { setRightSidebarWidth(getSavedRightSidebarWidth()); } catch (_) {} resizeCanvas(); render(); });
  try {
    if (window.visualViewport) {
      const onVvResize = () => { resizeCanvas(); render(); };
      window.visualViewport.addEventListener('resize', onVvResize);
      window.visualViewport.addEventListener('scroll', onVvResize);
    }
  } catch (_) {}
  resizeCanvas();

  // Allow the Resources panel to be moved freely.
  try {
    ensureInGamePanelScaleControls();
    const handle = ui.resourcesCard ? (ui.resourcesCard.querySelector('.resourcesHeaderRow') || ui.resourcesCard.querySelector('h2')) : null;
    makeDraggablePanel(ui.resourcesCard, handle, 'hexsettlers_resources_pos_v2');
  } catch (_) {}

  // Allow the Game Log panel to be moved freely.
  try {
    const handle = ui.logCard ? ui.logCard.querySelector('h2') : null;
    makeDraggablePanel(ui.logCard, handle, 'hexsettlers_log_pos_v2');
  } catch (_) {}

  // Allow the top-right timer/pause HUD to be moved freely (drag handle lives inside the timer box).
  try {
    const rh = document.querySelector('.rightHud');
    const grip = ensureTimerBoxControls();
    if (rh && grip && !rh.dataset.dragReady) {
      makeDraggablePanel(rh, grip, 'hexsettlers_rightHud_pos_v2');
      rh.dataset.dragReady = '1';
    }
  } catch (_) {}

  // Pan/zoom
  const view = { scale: 150, ox: 0, oy: 0, dragging: false, lastX: 0, lastY: 0 };
  const touchNav = { active: false, moved: false, pinch: false, startX: 0, startY: 0, lastX: 0, lastY: 0, tapClientX: 0, tapClientY: 0, pinchLastDist: 0, pinchLastCx: 0, pinchLastCy: 0 };
  let mobileSyntheticClickSig = null;

  function applyZoomAtScreenPoint(factor, clientX, clientY) {
    if (!ui || !ui.canvas || !Number.isFinite(factor) || factor <= 0) return;
    const rect = ui.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const before = {
      x: (sx - cx - view.ox) / view.scale,
      y: (sy - cy - view.oy) / view.scale,
    };
    const nextScale = clamp(view.scale * factor, 10, 800);
    if (nextScale === view.scale) return;
    view.scale = nextScale;
    view.ox = sx - cx - (before.x * view.scale);
    view.oy = sy - cy - (before.y * view.scale);
    hideBoardHoverIndicator();
    hideEdgeHoverIndicator();
    render();
  }

  ui.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY);
    if (!delta) return;
    const factor = delta > 0 ? 1.08 : 0.92;
    applyZoomAtScreenPoint(factor, e.clientX, e.clientY);
  }, { passive: false });

  ui.canvas.addEventListener('mousedown', (e) => {
    hideBuildPopup();
    view.dragging = true;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => view.dragging = false);
  window.addEventListener('mousemove', (e) => {
    if (!view.dragging) return;
    const dx = e.clientX - view.lastX;
    const dy = e.clientY - view.lastY;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
    view.ox += dx;
    view.oy += dy;
    hideBoardHoverIndicator();
    hideEdgeHoverIndicator();
    render();
  });

  ui.canvas.addEventListener('mousemove', (e) => updateBoardHoverBuild(e));
  ui.canvas.addEventListener('mouseleave', () => {
    hoverNodeBuild.nodeId = null;
    hoverNodeBuild.actionKind = null;
    hoverEdgeBuild.edgeId = null;
    hoverEdgeBuild.actionKinds = [];
    hideBoardHoverIndicator();
    hideEdgeHoverIndicator();
  });

  ui.canvas.addEventListener('touchstart', (e) => {
    if (!ui || !ui.canvas) return;
    hideBuildPopup();
    const touches = e.touches;
    if (!touches || !touches.length) return;
    if (touches.length >= 2) {
      const a = touches[0];
      const b = touches[1];
      const cx = (a.clientX + b.clientX) * 0.5;
      const cy = (a.clientY + b.clientY) * 0.5;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      touchNav.active = false;
      touchNav.moved = true;
      touchNav.pinch = true;
      touchNav.pinchLastCx = cx;
      touchNav.pinchLastCy = cy;
      touchNav.pinchLastDist = Math.max(1, Math.hypot(dx, dy));
      e.preventDefault();
      return;
    }
    const t = touches[0];
    touchNav.active = true;
    touchNav.moved = false;
    touchNav.pinch = false;
    touchNav.startX = t.clientX;
    touchNav.startY = t.clientY;
    touchNav.lastX = t.clientX;
    touchNav.lastY = t.clientY;
    touchNav.tapClientX = t.clientX;
    touchNav.tapClientY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  ui.canvas.addEventListener('touchmove', (e) => {
    const touches = e.touches;
    if (!touches || !touches.length) return;
    if (touches.length >= 2) {
      const a = touches[0];
      const b = touches[1];
      const cx = (a.clientX + b.clientX) * 0.5;
      const cy = (a.clientY + b.clientY) * 0.5;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (!touchNav.pinch) {
        touchNav.pinch = true;
        touchNav.pinchLastCx = cx;
        touchNav.pinchLastCy = cy;
        touchNav.pinchLastDist = dist;
      } else {
        const factor = dist / Math.max(1, touchNav.pinchLastDist);
        if (Number.isFinite(factor) && Math.abs(factor - 1) > 0.003) {
          applyZoomAtScreenPoint(factor, cx, cy);
        }
        const pdx = cx - touchNav.pinchLastCx;
        const pdy = cy - touchNav.pinchLastCy;
        if (pdx || pdy) {
          view.ox += pdx;
          view.oy += pdy;
          hideBoardHoverIndicator();
          hideEdgeHoverIndicator();
          render();
        }
        touchNav.pinchLastCx = cx;
        touchNav.pinchLastCy = cy;
        touchNav.pinchLastDist = dist;
      }
      touchNav.active = false;
      touchNav.moved = true;
      e.preventDefault();
      return;
    }
    const t = touches[0];
    if (!touchNav.active) {
      touchNav.active = true;
      touchNav.lastX = t.clientX;
      touchNav.lastY = t.clientY;
      touchNav.startX = t.clientX;
      touchNav.startY = t.clientY;
    }
    const dx = t.clientX - touchNav.lastX;
    const dy = t.clientY - touchNav.lastY;
    if (dx || dy) {
      view.ox += dx;
      view.oy += dy;
      touchNav.lastX = t.clientX;
      touchNav.lastY = t.clientY;
      if (Math.hypot(t.clientX - touchNav.startX, t.clientY - touchNav.startY) > 8) touchNav.moved = true;
      hideBoardHoverIndicator();
      hideEdgeHoverIndicator();
      render();
    }
    e.preventDefault();
  }, { passive: false });

  ui.canvas.addEventListener('touchend', (e) => {
    if (touchNav.pinch && e.touches && e.touches.length === 1) {
      const t = e.touches[0];
      touchNav.active = true;
      touchNav.pinch = false;
      touchNav.lastX = t.clientX;
      touchNav.lastY = t.clientY;
      touchNav.startX = t.clientX;
      touchNav.startY = t.clientY;
      touchNav.tapClientX = t.clientX;
      touchNav.tapClientY = t.clientY;
      e.preventDefault();
      return;
    }
    if (e.touches && e.touches.length) {
      e.preventDefault();
      return;
    }
    const tapX = touchNav.tapClientX;
    const tapY = touchNav.tapClientY;
    const shouldTap = !touchNav.moved && !touchNav.pinch && Number.isFinite(tapX) && Number.isFinite(tapY);
    touchNav.active = false;
    touchNav.moved = false;
    touchNav.pinch = false;
    if (shouldTap) {
      mobileSyntheticClickSig = { x: tapX, y: tapY, t: Date.now() };
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: tapX, clientY: tapY });
      ui.canvas.dispatchEvent(evt);
    }
    e.preventDefault();
  }, { passive: false });

  // Networking
  let ws = null;
  let myPlayerId = null;
  let room = null;
  let state = null;

  function roomPlayersList() {
    return (room && Array.isArray(room.players)) ? room.players : [];
  }

  function roomSpectatorsList() {
    return (room && Array.isArray(room.spectators)) ? room.spectators : [];
  }

  function currentRoomPhase() {
    const phase = String(((state && state.phase) || (room && room.gamePhase) || 'lobby') || 'lobby');
    return phase || 'lobby';
  }

  function amRoomSpectator() {
    if (!room || !myPlayerId) return false;
    return roomSpectatorsList().some(p => p && p.id === myPlayerId);
  }

  function resetViewportForRoomChange() {
    try {
      lastTileCountForView = 0;
      view.scale = 150;
      view.ox = 0;
      view.oy = 0;
    } catch (_) {}
  }

  function handleLocalRoomExit(reason) {
    try {
      if (postgameState && postgameState.historyMode) closePostgameSnapshot();
      else if (postgameState && postgameState.active) exitPostgame();
    } catch (_) {}
    try { closeModal(); } catch (_) {}
    pendingAutoRejoin = false;
    room = null;
    state = null;
    resetViewportForRoomChange();
    isHost = false;
    myPlayerId = null;
    try { setLocalPanelLayoutOwnerKey(null); } catch (_) {}
    try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
    if (ui.rejoinIdInput) ui.rejoinIdInput.value = '';
    if (ui.codeInput) ui.codeInput.value = '';
    if (ui.roomCode) ui.roomCode.textContent = '----';
    if (ui.roomJoinLinkInput) ui.roomJoinLinkInput.value = '';
    if (ui.copyJoinLinkBtn) ui.copyJoinLinkBtn.disabled = true;
    if (ui.genJoinLinkBtn) ui.genJoinLinkBtn.disabled = true;
    if (ui.playersList) ui.playersList.innerHTML = '';
    if (ui.startBtn) ui.startBtn.classList.add('hidden');
    if (ui.roomBox) ui.roomBox.classList.add('hidden');
    refreshLobbyJoinLinkUi();
    updateAuthUi();
    updateButtons();
    renderLobby();
    render();
    setError(reason || 'You left the room.');
  }

  let isHost = false;
  let lastEventIdSeen = 0;
  let serverTimeOffsetMs = 0;
  let timerUiInterval = null;
  let modalLocked = false;
  let modalType = null;
  let playerTradeTimerPauseRequested = false;
  let activeToolModal = null; // 'log' | 'dice' | 'chat'
  let chatRefs = null;
  let lastDiscardPromptId = 0;
  let lastStealPromptId = 0;
  let lastPirateStealPromptId = 0;
  let lastPirateChoicePromptId = 0;
  let lastTileCountForView = 0;
  // Track canvas CSS size so we can resync the backing store when the layout changes
  // (e.g., when the game transitions into full-screen board mode). Without this,
  // some browsers can end up with mismatched hit-testing until the next real resize.
  let lastCanvasSizeKey = '';
  let cartographerDraftSelection = 'sea';

  function updateCartographerDraftPanel() {
    try {
      let panel = document.getElementById('cartographerDraftPanel');
      const active = !!(state && String(state.phase || '') === 'cartographer-draft');
      if (!active) {
        if (panel) panel.style.display = 'none';
        return;
      }
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'cartographerDraftPanel';
        panel.classList.add('panelScalable');
        try {
          const autoScale = getAutoDefaultToolUiScale('cartographer_draft_panel');
          if (autoScale != null) panel.style.setProperty('--tool-ui-scale', String(autoScale));
        } catch (_) {}
        panel.style.position = 'fixed';
        panel.style.left = '12px';
        panel.style.bottom = '12px';
        panel.style.zIndex = '60';
        panel.style.minWidth = '260px';
        panel.style.maxWidth = '360px';
        panel.style.background = 'rgba(14,18,26,0.95)';
        panel.style.border = '1px solid rgba(120,160,220,0.55)';
        panel.style.borderRadius = '10px';
        panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        panel.style.padding = '10px';
        panel.style.color = '#dce8ff';
        panel.style.font = '12px/1.35 system-ui, sans-serif';

        const header = document.createElement('div');
        header.className = 'cartographerDraftHeader';
        header.style.display = 'grid';
        header.style.gridTemplateColumns = 'auto 1fr auto';
        header.style.alignItems = 'center';
        header.style.gap = '8px';
        header.style.marginBottom = '6px';

        const grip = document.createElement('div');
        grip.className = 'dragGrip';
        grip.textContent = '⋮⋮';
        grip.title = 'Move Cartographer Draft panel';
        grip.style.opacity = '.9';
        grip.style.fontWeight = '700';
        grip.style.lineHeight = '1';
        grip.style.padding = '2px 4px';
        grip.style.borderRadius = '6px';
        grip.style.border = '1px solid rgba(120,160,220,.25)';
        grip.style.background = 'rgba(255,255,255,.03)';

        const title = document.createElement('strong');
        title.className = 'cartographerDraftTitle';
        title.style.fontSize = '13px';
        title.textContent = 'Cartographer Draft';

        const right = document.createElement('div');
        right.className = 'cartographerDraftHeaderRight';
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        const progress = document.createElement('span');
        progress.className = 'cartographerDraftProgress';
        progress.style.opacity = '.85';
        progress.textContent = '0/44';
        right.appendChild(progress);

        header.appendChild(grip);
        header.appendChild(title);
        header.appendChild(right);
        panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'panelScaleContent cartographerDraftBody';
        panel.appendChild(body);

        document.body.appendChild(panel);

        try {
          ensurePanelHeaderScaleControl(panel, header, 'cartographer_draft_panel', 'Scale Cartographer Draft panel');
        } catch (_) {}
        try {
          makeDraggablePanel(panel, grip, 'hexsettlers_cartographer_draft_pos_v1');
          panel.dataset.dragReady = '1';
        } catch (_) {}
      }
      panel.style.display = 'block';

      const cd = state.cartographerDraft || {};
      const invAll = cd.inventoryByPlayer || {};
      const inv = (myPlayerId && invAll[myPlayerId]) || null;
      const isMyTurn = !!(myPlayerId && state.currentPlayerId === myPlayerId);
      const counts = inv || { sea:0, gold:0, desert:0, hills:0, forest:0, pasture:0, field:0, mountains:0 };
      const placed = Math.max(0, Number(cd.placedCount || 0));
      const total = Math.max(0, Number(cd.totalCount || (state.geom && state.geom.tiles ? state.geom.tiles.length : 44)));

      const progEl = panel.querySelector('.cartographerDraftProgress');
      if (progEl) progEl.textContent = `${placed}/${total}`;

      const btn = (key, label) => {
        const selected = cartographerDraftSelection === key;
        const remaining = Math.max(0, Number(counts[key] || 0));
        const disabled = !isMyTurn || remaining <= 0;
        return `<button data-ctile="${key}" ${disabled ? 'disabled' : ''} style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid ${selected ? 'rgba(140,220,180,.9)' : 'rgba(120,160,220,.35)'};background:${selected ? 'rgba(70,120,90,.45)' : 'rgba(30,42,64,.55)'};color:#e8f0ff;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? '.55' : '1'};font:inherit;"><span>${label}</span><strong>${remaining}</strong></button>`;
      };

      const body = panel.querySelector('.cartographerDraftBody') || panel;
      const tileChoices = [
        ['sea','Sea'],
        ['gold','Gold Field'],
        ['desert','Desert'],
        ['hills','Brick (Hills)'],
        ['forest','Lumber (Forest)'],
        ['pasture','Wool (Pasture)'],
        ['field','Grain (Field)'],
        ['mountains','Ore (Mountains)'],
      ].filter(([key]) => Number(counts[key] || 0) > 0 || key === cartographerDraftSelection);
      if (!tileChoices.some(([key]) => key === cartographerDraftSelection)) {
        cartographerDraftSelection = (tileChoices[0] && tileChoices[0][0]) || 'sea';
      }
      const selLabel = ({ sea:'Sea', gold:'Gold Field', desert:'Desert', hills:'Brick (Hills)', forest:'Lumber (Forest)', pasture:'Wool (Pasture)', field:'Grain (Field)', mountains:'Ore (Mountains)' })[cartographerDraftSelection] || cartographerDraftSelection;
      body.innerHTML = [
        `<div style="margin-bottom:8px;opacity:.9">${isMyTurn ? 'Your turn: click a ? board hex to place the selected tile.' : 'Waiting for the current player to place a tile.'}</div>`,
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`,
          ...tileChoices.map(([key,label]) => btn(key, label)),
        `</div>`,
        `<div style="margin-top:8px;opacity:.75">Selected: <strong>${selLabel}</strong></div>`
      ].join('');

      body.querySelectorAll('button[data-ctile]').forEach((b) => {
        b.addEventListener('click', () => {
          const v = String(b.getAttribute('data-ctile') || 'sea');
          cartographerDraftSelection = v;
          updateCartographerDraftPanel();
        });
      });
    } catch (_) {}
  }

  // Game Log panel (toggleable overlay)
  let logPanelOpen = false;
  try {
    logPanelOpen = localStorage.getItem('hexsettlers_log_open_v1') === '1';
  } catch (_) {}

  const images = {};
  const TILE_IMG = {
    desert: 'texture%20pack/Resource%20Hexes/Desert.png',
    field: 'texture%20pack/Resource%20Hexes/Field.png',
    forest: 'texture%20pack/Resource%20Hexes/Forest.png',
    gold: 'texture%20pack/Resource%20Hexes/GoldFields.png',
    hills: 'texture%20pack/Resource%20Hexes/Hills.png',
    mountains: 'texture%20pack/Resource%20Hexes/Mountains.png',
    pasture: 'texture%20pack/Resource%20Hexes/Pasture.png',
    sea: 'texture%20pack/Resource%20Hexes/Seas.png',
    unexplored: 'texture%20pack/Resource%20Hexes/Unexplored.png',
  };

  const DEV_IMG = {
    knight: 'texture%20pack/Dev%20Cards/Knight.png',
    road_building: 'texture%20pack/Dev%20Cards/RoadBuilding.png',
    invention: 'texture%20pack/Dev%20Cards/Invention.png',
    monopoly: 'texture%20pack/Dev%20Cards/Monopoly.png',
    victory_point: 'texture%20pack/Dev%20Cards/VictoryPoint.png',
  };


  const NUM_TOKEN_IMG = {
    2: 'texture%20pack/Numbers/2.png',
    3: 'texture%20pack/Numbers/3.png',
    4: 'texture%20pack/Numbers/4.png',
    5: 'texture%20pack/Numbers/5.png',
    6: 'texture%20pack/Numbers/6.png',
    8: 'texture%20pack/Numbers/8.png',
    9: 'texture%20pack/Numbers/9.png',
    10: 'texture%20pack/Numbers/10.png',
    11: 'texture%20pack/Numbers/11.png',
    12: 'texture%20pack/Numbers/12.png',
  };

  const PORT_IMG = {
    generic: 'texture%20pack/Ports/generic.png',
    brick: 'texture%20pack/Ports/brick.png',
    lumber: 'texture%20pack/Ports/lumber.png',
    wool: 'texture%20pack/Ports/wool.png',
    grain: 'texture%20pack/Ports/grain.png',
    ore: 'texture%20pack/Ports/ore.png',
  };

  const THIEF_IMG = {
    robber: 'texture%20pack/Robber%20Pirate/thief_robber.png',
    pirate: 'texture%20pack/Robber%20Pirate/thief_pirate.png',
  };


  // Turn notification sound (played only for the active player when it's time to roll)
  const turnBell = new Audio('assets/sfx/turn_bell.wav');
  const TURN_BELL_BASE_VOLUME = 0.85;
  turnBell.preload = 'auto';
  turnBell.volume = TURN_BELL_BASE_VOLUME;
  let lastBellKey = '';


  // --- Shared SFX (broadcast by server; played locally on all clients) ---
  function makeSfxPool(src, volume = 0.9, poolSize = 4) {
    const pool = [];
    const baseVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    let gainPct = 100;
    function applyPoolVolume(a) {
      try { a.volume = clamp(baseVolume * (gainPct / 100), 0, 1); } catch (_) {}
    }
    for (let i = 0; i < poolSize; i++) {
      const a = new Audio(src);
      a.preload = 'auto';
      applyPoolVolume(a);
      pool.push(a);
    }
    let idx = 0;
    return {
      play() {
        const a = pool[idx++ % pool.length];
        try { a.__hsPausedForGamePause = false; } catch (_) {}
        try { a.currentTime = 0; } catch (_) {}
        applyPoolVolume(a);
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      },
      stopAll() {
        for (const a of pool) {
          try { a.__hsPausedForGamePause = false; } catch (_) {}
          try { a.pause(); } catch (_) {}
          try { a.currentTime = 0; } catch (_) {}
        }
      },
      pauseAll() {
        for (const a of pool) {
          try {
            const active = !a.paused && !a.ended && Number(a.currentTime || 0) > 0;
            a.__hsPausedForGamePause = !!active;
            if (active) a.pause();
          } catch (_) {}
        }
      },
      resumeAll() {
        for (const a of pool) {
          try {
            if (!a.__hsPausedForGamePause) continue;
            a.__hsPausedForGamePause = false;
            applyPoolVolume(a);
            const p = a.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
      },
      prime() {
        for (const a of pool) {
          try {
            applyPoolVolume(a);
            const p = a.play();
            if (p && typeof p.then === 'function') {
              p.then(() => { try { a.pause(); a.currentTime = 0; a.__hsPausedForGamePause = false; } catch (_) {} }).catch(() => {});
            }
          } catch (_) {}
        }
      },
      setGainPercent(pct) {
        gainPct = Math.max(0, Math.min(200, Math.round(Number(pct) || 0)));
        for (const a of pool) applyPoolVolume(a);
      },
      getGainPercent() {
        return gainPct;
      }
    };
  }

  const sfx = {
    dice_roll: makeSfxPool('assets/sfx/dice_roll.wav', 0.9, 4),
    gold_field_production: makeSfxPool('assets/sfx/gold_field_production.wav', 0.9, 2),
    robber_pirate: makeSfxPool('assets/sfx/robber_pirate.wav', 0.9, 3),
    structure: makeSfxPool('assets/sfx/structure.wav', 0.85, 4),
    end_turn: makeSfxPool('assets/sfx/end_turn.wav', 0.9, 2),
    dev_card: makeSfxPool('assets/sfx/dev_card.wav', 0.9, 2),
    trade_proposed: makeSfxPool('assets/sfx/trade_proposed.wav', 0.9, 1),
    trade_success: makeSfxPool('assets/sfx/trade_success.wav', 0.9, 1),
    paired_turn: makeSfxPool('assets/sfx/paired_turn.wav', 0.85, 1),
  };

  function applyAudioSfxLevels(levels, opts = {}) {
    const merged = defaultAudioSfxLevels();
    const src = (levels && typeof levels === 'object') ? levels : {};
    for (const def of AUDIO_SFX_DEFS) {
      merged[def.key] = normalizeAudioSfxPercent(src[def.key]);
    }
    audioSfxLevels = merged;

    try {
      turnBell.volume = clamp(TURN_BELL_BASE_VOLUME * ((audioSfxLevels.turn_bell || AUDIO_SFX_DEFAULT_PCT) / 100), 0, 1);
    } catch (_) {}

    try {
      for (const def of AUDIO_SFX_DEFS) {
        if (def.key === 'turn_bell') continue;
        const snd = sfx && sfx[def.key];
        if (snd && typeof snd.setGainPercent === 'function') snd.setGainPercent(audioSfxLevels[def.key]);
      }
    } catch (_) {}

    if (opts && opts.persist) saveAudioSfxLevelsForCurrentOwner();
    if (!(opts && opts.refreshPanel === false)) refreshAudioPanelUi();
  }

  function loadAudioSfxLevelsForCurrentOwner() {
    let parsed = null;
    try {
      const scopedKey = getAudioSfxStorageKey();
      let raw = localStorage.getItem(scopedKey);
      if (!raw) {
        const legacy = localStorage.getItem(AUDIO_SFX_LEVELS_KEY);
        if (legacy) {
          raw = legacy;
          try { localStorage.setItem(scopedKey, legacy); } catch (_) {}
        }
      }
      if (raw) parsed = JSON.parse(raw);
    } catch (_) {
      parsed = null;
    }
    applyAudioSfxLevels(parsed || defaultAudioSfxLevels(), { persist: false, refreshPanel: true });
  }

  function setAudioSfxLevel(key, pct, opts = {}) {
    const k = String(key || '').trim().toLowerCase();
    if (!k) return;
    if (!AUDIO_SFX_DEFS.some(def => def.key === k)) return;
    const next = Object.assign(defaultAudioSfxLevels(), audioSfxLevels || {});
    next[k] = normalizeAudioSfxPercent(pct);
    applyAudioSfxLevels(next, { persist: !!opts.persist, refreshPanel: opts.refreshPanel !== false });
  }

  loadAudioSfxLevelsForCurrentOwner();

  let sfxUnlocked = false;
  function unlockSfxOnce() {
    if (sfxUnlocked) return;
    sfxUnlocked = true;
    try { Object.values(sfx).forEach(x => x.prime()); } catch (_) {}

    // Prime turn bell too (avoids autoplay blocks during early setup turns)
    try {
      const prevVol = turnBell.volume;
      turnBell.volume = 0;
      try { turnBell.currentTime = 0; } catch (_) {}
      const p = turnBell.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          try { turnBell.pause(); } catch (_) {}
          try { turnBell.currentTime = 0; } catch (_) {}
          turnBell.volume = prevVol;
        }).catch(() => { turnBell.volume = prevVol; });
      } else {
        turnBell.volume = prevVol;
      }
    } catch (_) {}
  }
  window.addEventListener('pointerdown', unlockSfxOnce, { once: true, passive: true });
  window.addEventListener('keydown', unlockSfxOnce, { once: true });

  function playSfx(name) {
    const key = String(name || '').toLowerCase();
    const snd = sfx[key];
    if (!snd) return;
    snd.play();
  }

  function stopEndTurnWarnAudio() {
    try { if (sfx && sfx.end_turn && typeof sfx.end_turn.stopAll === 'function') sfx.end_turn.stopAll(); } catch (_) {}
  }
  function endTurnWarnStateKey(st) {
    try {
      if (!st || st.paused) return '';
      if (st.timerHold && typeof st.timerHold.remainingMs === 'number') return '';
      const t = st.timer;
      const endsAt = Number(t?.endsAt || 0);
      if (!t || !endsAt) return '';
      const phase = String(st.phase || t.phase || '');
      const segKey = String(t.segmentKey || '');
      return `${phase}:${segKey}:${endsAt}`;
    } catch (_) {
      return '';
    }
  }
  function syncEndTurnWarnAudioState(prevState, nextState) {
    try {
      const prevKey = endTurnWarnStateKey(prevState);
      const nextKey = endTurnWarnStateKey(nextState);
      if (prevKey && prevKey !== nextKey) stopEndTurnWarnAudio();
      if (prevKey && !nextKey) stopEndTurnWarnAudio();
    } catch (_) {}
  }

  // Countdown warning (played exactly 6s before any active countdown ends)
  let endTurnWarnTimeout = null;
  let lastEndTurnWarnKey = null;

  function clearEndTurnWarn() {
    if (endTurnWarnTimeout) {
      clearTimeout(endTurnWarnTimeout);
      endTurnWarnTimeout = null;
    }
  }

  function scheduleEndTurnWarn() {
    clearEndTurnWarn();
    try {
      const key = endTurnWarnStateKey(state);
      if (!key) return;
      if (lastEndTurnWarnKey === key) return;

      const endsAt = Number(state?.timer?.endsAt || 0);
      if (!endsAt) return;

      const nowMs = serverNowMs();
      const remainingMs = endsAt - nowMs;
      if (remainingMs <= 0) return;

      const warnAtMs = endsAt - 6000;
      const delay = warnAtMs - nowMs;
      if (delay <= 0) return;

      endTurnWarnTimeout = setTimeout(() => {
        // Re-check that the same timer is still active and not paused/held.
        try {
          const curKey = endTurnWarnStateKey(state);
          if (!curKey || curKey !== key) return;
          const currentEndsAt = Number(state?.timer?.endsAt || 0);
          if (!currentEndsAt || currentEndsAt !== endsAt) return;
          const msLeft = currentEndsAt - serverNowMs();
          if (msLeft <= 0 || msLeft > 6000) return;
          if (lastEndTurnWarnKey === curKey) return;
          lastEndTurnWarnKey = curKey;
          playSfx('end_turn');
        } catch (_) {}
      }, Math.max(0, delay));
    } catch (_) {}
  }


  function setError(msg) {
    if (!msg) {
      ui.errBox.classList.add('hidden');
      ui.errBox.textContent = '';
      return;
    }
    ui.errBox.classList.remove('hidden');
    ui.errBox.textContent = msg;
  }

  function setConn(ok, text) {
    ui.connDot.classList.toggle('ok', !!ok);
    ui.connDot.classList.toggle('bad', !ok);
    ui.connText.textContent = text || (ok ? 'Connected' : 'Disconnected');
  }

  function toast(msg) {
    if (!msg) return;
    // Don't stomp a real error.
    if (!ui.errBox.classList.contains('hidden')) return;
    setError(msg);
    setTimeout(() => {
      if (ui.errBox.textContent === msg) setError(null);
    }, 900);
  }

  async function copyText(text) {
    const t = String(text || '');
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      toast('Copied.');
    } catch (e) {
      // Clipboard may be blocked; fall back to prompt.
      window.prompt('Copy to clipboard:', t);
    }
  }

  function parseDirectJoinCodeFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      let code = String(params.get('room') || params.get('code') || '').trim().toUpperCase();
      code = code.replace(/[^A-Z0-9]/g, '');
      if (!code) return null;
      if (ui.codeInput && !ui.codeInput.value) ui.codeInput.value = code;
      return code;
    } catch (_) {
      return null;
    }
  }

let localShareOriginOverride = '';
let localShareOriginLookupPromise = null;

function isLikelyLocalShareLinkHost(hostname) {
  const h = String(hostname || '').trim().toLowerCase();
  if (!h) return false;
  if (h === 'localhost' || h === '::1' || h === '[::1]') return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 16 && n <= 31) return true;
  }
  return false;
}

function formatHostForUrl(host) {
  const h = String(host || '').trim();
  if (!h) return '';
  if (h.includes(':') && !/^\[.*\]$/.test(h)) return `[${h}]`;
  return h;
}

function ensureLocalShareOriginOverride() {
  try {
    if (localShareOriginOverride) return;
    if (localShareOriginLookupPromise) return;
    if (!isLikelyLocalShareLinkHost(window.location && window.location.hostname)) return;
    // Keep deployed Railway / public domains unchanged. Only override local/private hosting.
    localShareOriginLookupPromise = (async () => {
      try {
        const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (!r || !r.ok) return;
        const j = await r.json().catch(() => null);
        const ip = String((j && j.ip) || '').trim();
        if (!ip) return;
        const host = formatHostForUrl(ip);
        if (!host) return;
        const protocol = (window.location && window.location.protocol === 'https:') ? 'https:' : 'http:';
        localShareOriginOverride = `${protocol}//${host}:25000`;
      } catch (_) {
        // fall back to current local origin if public IP lookup fails
      } finally {
        localShareOriginLookupPromise = null;
        try { refreshLobbyJoinLinkUi(); } catch (_) {}
      }
    })();
  } catch (_) {}
}

function buildDirectJoinUrl(roomCode) {
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) return '';
  try {
    ensureLocalShareOriginOverride();
    const u = new URL(window.location.href);
    if (localShareOriginOverride && isLikelyLocalShareLinkHost(u.hostname)) {
      const base = new URL(localShareOriginOverride);
      u.protocol = base.protocol;
      u.hostname = base.hostname;
      u.port = base.port;
    }
    u.searchParams.set('room', code);
    return u.toString();
  } catch (_) {
    let origin = (window.location && window.location.origin) || '';
    try {
      ensureLocalShareOriginOverride();
      if (localShareOriginOverride && isLikelyLocalShareLinkHost(window.location && window.location.hostname)) {
        origin = localShareOriginOverride;
      }
    } catch (_) {}
    return `${origin}${(window.location && window.location.pathname) || '/'}?room=${encodeURIComponent(code)}`;
  }
}

function refreshLobbyJoinLinkUi() {

    const code = String((room && room.code) || '').trim().toUpperCase();
    const link = code ? buildDirectJoinUrl(code) : '';
    if (ui.roomJoinLinkInput) ui.roomJoinLinkInput.value = link;
    if (ui.copyJoinLinkBtn) ui.copyJoinLinkBtn.disabled = !link;
    if (ui.genJoinLinkBtn) ui.genJoinLinkBtn.disabled = !code;
  }


  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws`;
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      setConn(true, 'Connected');
      setError(null);
      // Try auto-login with a saved token (allows login from any device/server instance).
      pendingAutoRejoin = true;
      let t = null;
      try { t = localStorage.getItem(AUTH_TOKEN_KEY); } catch (_) { t = null; }
      if (t) {
        send({ type: 'auth_token', token: t });
      } else {
        updateAuthUi();
      }
    });

    ws.addEventListener('close', () => {
      setConn(false, 'Disconnected');
      // simple retry
      setTimeout(connect, 1200);
    });

    ws.addEventListener('message', (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg || !msg.type) return;

      if (msg.type === 'build_options') {
        const tk = msg.targetKind;
        const tid = msg.targetId;
        const opts = Array.isArray(msg.options) ? msg.options : [];

        // Cache hoverable build options (current state only; cache is cleared on each state message).
        if ((tk === 'node' || tk === 'edge') && Number.isFinite(Number(tid))) {
          hoverNodeBuildCache.set(buildCacheKey(tk, tid), opts);
        }

        if (hoverNodeBuildQuery && hoverNodeBuildQuery.targetKind === tk && hoverNodeBuildQuery.targetId === tid) {
          hoverNodeBuildQuery = null;
          if (tk === 'node' && hoverNodeBuild.nodeId === tid) {
            const act = getNodeActionOption(opts);
            hoverNodeBuild.actionKind = act ? act.kind : null;
            if (act) showBoardHoverIndicator(hoverNodeBuild.absX, hoverNodeBuild.absY, act.kind);
            else hideBoardHoverIndicator();
          }
        }
        if (hoverEdgeBuildQuery && hoverEdgeBuildQuery.targetKind === tk && hoverEdgeBuildQuery.targetId === tid) {
          hoverEdgeBuildQuery = null;
          if (tk === 'edge' && hoverEdgeBuild.edgeId === tid) {
            const edgeOpts = getEdgeActionOptions(opts);
            hoverEdgeBuild.actionKinds = edgeOpts.map(o => o.kind);
            if (edgeOpts.length) showEdgeHoverIndicator(hoverEdgeBuild.absX, hoverEdgeBuild.absY, edgeOpts);
            else hideEdgeHoverIndicator();
          }
        }

        if (!pendingBuildClick) return;
        if (pendingBuildClick.targetKind !== tk || pendingBuildClick.targetId !== tid) return;

        const doAction = (opt) => {
          if (!opt || !opt.kind) return;
          if (opt.kind === 'place_settlement' || opt.kind === 'upgrade_city') {
            sendGameAction({ kind: opt.kind, nodeId: tid });
          } else if (opt.kind === 'place_road' || opt.kind === 'place_ship') {
            sendGameAction({ kind: opt.kind, edgeId: tid });
          }
        };

        if (pendingBuildClick.mode === 'node_confirm' && tk === 'node') {
          const clickMeta = pendingBuildClick;
          pendingBuildClick = null;
          const act = getNodeActionOption(opts);
          if (!act) { hideNodeConfirmPopup(); return; }
          showNodeConfirmPopup(clickMeta.absX, clickMeta.absY, act, () => doAction(act));
          return;
        }

        if (pendingBuildClick.mode === 'edge_confirm' && tk === 'edge') {
          const clickMeta = pendingBuildClick;
          pendingBuildClick = null;
          const edgeOpts = getEdgeActionOptions(opts);
          if (!edgeOpts.length) { hideEdgeConfirmPopup(); return; }
          showEdgeConfirmPopup(clickMeta.absX, clickMeta.absY, edgeOpts, (opt) => doAction(opt));
          return;
        }

        if (!opts.length) {
          hideBuildPopup();
          return;
        }

        if (opts.length === 1) {
          hideBuildPopup();
          doAction(opts[0]);
          return;
        }

        showBuildPopup(pendingBuildClick.absX, pendingBuildClick.absY, opts, doAction);
        return;
      }

      if (msg.type === 'ship_move_targets') {
        const from = Number(msg.fromEdgeId);
        const targets = Array.isArray(msg.targets) ? msg.targets.map(n => Number(n)).filter(Number.isFinite) : [];
        if (inputMode.kind !== 'move_ship') return;
        if (inputMode.moveShipFrom !== from) return;
        inputMode.moveShipTargetsLoading = false;
        inputMode.moveShipTargets = targets;
        render();
        return;
      }

      if (msg.type === 'sfx') {
        playSfx(msg.name);
        return;
      }

      if (msg.type === 'error') {
        const e = msg.error || 'Error';
        setError(e);
        // If a rematch attempt failed, re-enable the postgame Main Menu button.
        try {
          if (ui.pgMainMenuBtn) {
            ui.pgMainMenuBtn.disabled = false;
            ui.pgMainMenuBtn.textContent = postgameState.historyMode ? 'Back' : 'Main Menu';
          }
        } catch (_) {}
        try {
          if (/room (not found|expired)/i.test(e)) localStorage.removeItem(LAST_ROOM_KEY);
        } catch (_) {}
        updateAuthUi();
        return;
      }


      if (msg.type === 'game_history_list') {
        historyState.games = Array.isArray(msg.games) ? msg.games : [];
        historyState.loadingGames = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'game_history_entry') {
        const g = msg.game || null;
        const snap = g && (g.snapshot || g);
        if (snap && g) {
          if (!snap.winnerId && g.winnerId) snap.winnerId = g.winnerId;
          if (!snap.winnerName && g.winnerName) snap.winnerName = g.winnerName;
          if (snap.stats && !snap.stats.endedAt && g.endedAt) snap.stats.endedAt = g.endedAt;
          if (snap.stats && !snap.stats.startedAt && g.startedAt) snap.stats.startedAt = g.startedAt;
        }
        const openMode = historyState.openMode || 'summary';
        openPostgameSnapshot(snap, g, { tab: openMode === 'replay' ? 'resources' : 'summary' });
        historyState.openMode = 'summary';
        return;
      }

      if (msg.type === 'player_leaderboard') {
        historyState.leaderboard = Array.isArray(msg.rows) ? msg.rows : [];
        historyState.loadingBoard = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'hello') {
        const st = Number(msg.serverTime || 0);
        if (st) serverTimeOffsetMs = st - Date.now();
        return;
      }


      if (msg.type === 'auth_ok') {
        if (msg.user) {
          // Keep prior token if server didn't send one (e.g., display-name update)
          setAuthState(msg.user, (typeof msg.token === 'string' && msg.token.trim()) ? msg.token : authToken);
        } else {
          updateAuthUi();
        }

        if (pendingDirectJoinRoomCode && authUser) {
          const targetCode = String(pendingDirectJoinRoomCode || '').trim().toUpperCase();
          const alreadyThere = !!(room && String(room.code || '').trim().toUpperCase() === targetCode);
          if (targetCode && !alreadyThere) {
            pendingDirectJoinRoomCode = null; // one-shot
            const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || authUser.username || 'Player';
            send({ type: 'join_room', code: targetCode, displayName });
            return;
          }
          if (alreadyThere) pendingDirectJoinRoomCode = null;
        }

        if (pendingAutoRejoin) {
          pendingAutoRejoin = false;

          // One-shot: after clicking "Main Menu" from a finished game, start a fresh lobby instead of rejoining.
          let autoCreate = false;
          try { autoCreate = sessionStorage.getItem(AUTO_CREATE_ROOM_KEY) === '1'; } catch (_) { autoCreate = false; }
          if (autoCreate) {
            try { sessionStorage.removeItem(AUTO_CREATE_ROOM_KEY); } catch (_) {}
            try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
            const displayName =
              (ui.nameInput?.value || '').trim() ||
              (authUser ? (authUser.displayName || authUser.username) : '') ||
              'Host';
            send({ type: 'create_room', displayName });
            return;
          }

          let code = '';
          try { code = (room && room.code) ? room.code : (localStorage.getItem(LAST_ROOM_KEY) || ''); } catch (_) { code = (room && room.code) ? room.code : ''; }
          code = String(code || '').trim().toUpperCase();
          if (code) {
            send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
          }
        }
        return;
      }

      if (msg.type === 'auth_required') {
        clearAuthLocal();
        pendingAutoRejoin = false;
        return;
      }

      if (msg.type === 'user_stats') {
        if (msg.user && authUser && msg.user.id === authUser.id) {
          authUser = msg.user;
        } else if (msg.stats && authUser && msg.user && msg.user.id === authUser.id) {
          authUser.stats = msg.stats;
        }
        updateAuthUi();
        return;
      }

      if (msg.type === 'joined') {
        myPlayerId = msg.playerId;
        try { setLocalPanelLayoutOwnerKey(myPlayerId || null); } catch (_) {}
        room = msg.room;
        resetViewportForRoomChange();
        ensureStructureSpritesReady();
        isHost = !!msg.isHost;
        if (ui.rejoinIdInput) ui.rejoinIdInput.value = myPlayerId || '';
        if (ui.codeInput && room?.code) ui.codeInput.value = room.code;
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        refreshLobbyJoinLinkUi();
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !isHost);
        setError(null);
        renderLobby();
        updateButtons();
        queueTexturePackAnnounce(false);
        send({ type: 'get_state' });
        return;
      }

      if (msg.type === 'room') {
        room = msg.room;
        ensureStructureSpritesReady();
        isHost = !!(myPlayerId && room && room.hostId === myPlayerId);
        if (modalType !== 'playerTradeCompose') playerTradeTimerPauseRequested = false;
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        refreshLobbyJoinLinkUi();
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !(myPlayerId && room.hostId === myPlayerId));
        renderLobby();
        updateButtons();
        queueTexturePackAnnounce(false);
        return;
      }

      if (msg.type === 'left_room') {
        handleLocalRoomExit(msg.reason || (msg.kicked ? 'You were removed from the room.' : 'You left the room.'));
        return;
      }

      if (msg.type === 'leave_game_request') {
        openLeaveGameRequestPrompt(msg.playerId, msg.playerName);
        return;
      }

      if (msg.type === 'leave_game_result') {
        const body = document.createElement('div');
        body.className = 'modalText';
        body.textContent = msg.message || (msg.accepted ? 'Leave-game request approved.' : 'Leave-game request declined.');
        openModal({
          title: (msg.accepted === true) ? 'Now Spectating' : ((msg.accepted === false) ? 'Leave Game Declined' : 'Leave Game'),
          bodyNode: body,
          actions: [{ label: 'OK', primary: true, onClick: closeModal }]
        });
        return;
      }

      if (msg.type === 'texture_pack_payload') {
        const pack = msg.pack || null;
        if (!pack) {
          setError('Texture pack payload was empty.');
          return;
        }
        if (String(pack.id || '') === DEFAULT_TEXTURE_PACK_ID) {
          pendingTexturePackSelectId = null;
          void setActiveTexturePackById(DEFAULT_TEXTURE_PACK_ID, { announce: true, forcePublish: false }).catch((err) => {
            setError(err && err.message ? err.message : 'Failed to switch texture pack.');
          });
          return;
        }
        void saveTexturePackPayloadLocally(pack, { activate: false, forcePublish: false }).then((record) => {
          if (!record) throw new Error('Failed to save that texture pack.');
          pendingTexturePackSelectId = null;
          if (room && room.code) texturePackRoomPublished[`${room.code}|${record.id}`] = true;
          return setActiveTexturePackById(record.id, { announce: true, forcePublish: false });
        }).catch((err) => {
          pendingTexturePackSelectId = null;
          setError(err && err.message ? err.message : 'Failed to save that texture pack.');
        });
        return;
      }

      if (msg.type === 'state') {
        const prevState = state;
        state = msg.state;
        syncEndTurnWarnAudioState(prevState, state);
        try {
          if (modalType !== 'playerTradeCompose' && playerTradeTimerPauseRequested) {
            playerTradeTimerPauseRequested = false;
          }
        } catch (_) {}
        // Any state change should clear click-to-build UI and transient hover/confirm state.
        hideBuildPopup();
        hideNodeConfirmPopup();
        hideEdgeConfirmPopup();
        hideThiefMoveConfirmPopup();
        hideBoardHoverIndicator();
        hideEdgeHoverIndicator();
        hoverNodeBuildQuery = null;
        hoverEdgeBuildQuery = null;
        hoverNodeBuildCache.clear();
        if (inputMode) { inputMode.moveShipTargets = []; inputMode.moveShipTargetsLoading = false; }
        // Auto-fit view for larger boards (Seafarers)
        const tc = (state && state.geom && state.geom.tiles) ? state.geom.tiles.length : 0;
        if (tc && tc !== lastTileCountForView) {
          lastTileCountForView = tc;
          if (tc > 45) { view.scale = 95; view.ox = 0; view.oy = 0; }
          else if (tc > 19) { view.scale = 120; view.ox = 0; view.oy = 0; }
          else { view.scale = 150; view.ox = 0; view.oy = 0; }
        }
        maybePlayTurnBell();
        maybePlayPairedTurnSfx();
        scheduleEndTurnWarn();
        handleLastEvent();
        handlePendingTradePrompt();
        handleEndGameVotePrompt();
        handleDiscardPrompt();
        handleRobberStealPrompt();
        handlePirateChoicePrompt();
        handlePirateStealPrompt();
        handleDiscoveryGoldPrompt();
        handleProductionGoldPrompt();
        refreshToolModals();
        if (state && state.phase && state.phase !== 'lobby') ensureStructureSpritesReady();

        // Keep the draggable Game Log overlay in sync while it's open.
        try {
          const inGame = !!(state && state.phase && state.phase !== 'lobby');
          if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
          if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
        } catch (_) {}

        updateButtons();
        updateCartographerDraftPanel();
        renderLobby();
        render();
        syncPostgameToState();
        return;
      }
    });
  }

  function send(obj) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(obj));
  }

  function setPlayerTradeTimerPause(active) {
    const want = !!active;
    if (playerTradeTimerPauseRequested === want) return;
    playerTradeTimerPauseRequested = want;
    send({ type: 'trade_timer_pause', active: want });
  }


  // Paired-turn notification (Classic 5–6 & Seafarers 5–6): played only for the active paired player (Player 2).
  let lastPairedTurnKey = null;
  function maybePlayPairedTurnSfx() {
    try {
      if (!state || !myPlayerId) return;
      const paired = state.paired;
      if (!paired || !paired.enabled) return;
      if (String(paired.stage || '') !== 'p2') return;
      if (state.currentPlayerId !== myPlayerId) return;
      const key = `${state.turnNumber ?? 0}:${myPlayerId}:${paired.p1Id || ''}:${paired.stage}`;
      if (key === lastPairedTurnKey) return;
      lastPairedTurnKey = key;
      playSfx('paired_turn');
    } catch (_) {}
  }

  function shouldRingTurnBell(st) {
    if (!st) return false;
    const phase = String(st.phase || '');
    if (phase.startsWith('setup')) return true;
    if (phase === 'main-await-roll') return true;
    // Paired Player 2 uses the dedicated paired-turn cue (no turn bell).
    return false;
  }

  function maybePlayTurnBell() {
    try {
      if (!state || !myPlayerId) return;
      if (state.currentPlayerId !== myPlayerId) return;
      if (!shouldRingTurnBell(state)) return;

      const paired = state.paired || null;
      const stage = (paired && paired.enabled) ? String(paired.stage || '') : '';
      const key = `${String(state.phase || '')}|${state.turnNumber ?? 0}|${myPlayerId}|${stage}`;

      if (key === lastBellKey) return;
      lastBellKey = key;

      try { turnBell.currentTime = 0; } catch (_) {}
      const p = turnBell.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {
      // ignore autoplay restrictions/errors
    }
  }

  pendingDirectJoinRoomCode = parseDirectJoinCodeFromUrl();
  updateAuthUi();
  connect();
  // Keep the countdown clock ticking even when no state messages arrive.
  ensureTimerUiInterval();

  // Load images
  async function loadImages() {
    const load = (k, src) => new Promise((resolve) => {
      const img = new Image();
      const fallback = String(src || '');
      const primary = resolveLegacyTextureUrl(fallback) || fallback;
      let triedFallback = false;
      img.onload = () => { images[k] = img; resolve(); };
      img.onerror = () => {
        if (!triedFallback && fallback && primary !== fallback) {
          triedFallback = true;
          img.src = fallback;
          return;
        }
        images[k] = null;
        resolve();
      };
      img.src = primary || fallback;
    });
    const entries = [
      ...Object.entries(TILE_IMG),
      ...Object.entries(DEV_IMG).map(([k, v]) => [`dev_${k}`, v]),
      ...Object.entries(NUM_TOKEN_IMG).map(([k, v]) => [`num_${k}`, v]),
      ...Object.entries(PORT_IMG).map(([k, v]) => [`port_${k}`, v]),
      ...Object.entries(THIEF_IMG).map(([k, v]) => [`thief_${k}`, v]),
    ];
    await Promise.all(entries.map(([k, src]) => load(k, src)));
    return true;
  }
  loadImages().then(render);

  // Modal helpers
  function closeModal() {
    if (modalLocked) return;

    // If a player dismisses the proposed-trade popup, treat it as a reject.
    try {
      if (modalType === 'pendingTrade' && state && state.pendingTrade && myPlayerId) {
        const t = state.pendingTrade;
        if (t && t.id && myPlayerId !== t.fromId) {
          // Always reject on close (even if previously accepted).
          send({ type: 'game_action', action: { kind: 'respond_trade', tradeId: t.id, accept: false } });
        }
      }
    } catch (_) {}

    // If a player dismisses the end-game vote popup, treat it as a reject.
    try {
      if (modalType === 'endVote' && state && state.endVote && myPlayerId) {
        const v = state.endVote;
        if (v && v.id) {
          send({ type: 'game_action', action: { kind: 'respond_endgame', voteId: v.id, accept: false } });
        }
      }
    } catch (_) {}

    // Closing the player-trade compose modal should resume the turn timer.
    try {
      if (modalType === 'playerTradeCompose') setPlayerTradeTimerPause(false);
    } catch (_) {}

    ui.modal.classList.add('hidden');
    ui.modalTitle.textContent = '';
    ui.modalBody.innerHTML = '';
    ui.modalActions.innerHTML = '';
    modalType = null;
    activeToolModal = null;
    chatRefs = null;

    // If an end-game vote prompt was deferred because another modal was open,
    // try opening it immediately after the current modal closes.
    try {
      if (pendingEndVotePromptId && state && state.endVote && Number(state.endVote.id || 0) === Number(pendingEndVotePromptId || 0)) {
        setTimeout(() => {
          try { handleEndGameVotePrompt(); } catch (_) {}
        }, 0);
      }
    } catch (_) {}
  }

  function forceCloseModal() {
    modalLocked = false;
    closeModal();
  }

  function openModal({ title, bodyNode, actions }) {
    ui.modalTitle.textContent = title || '';
    ui.modalBody.innerHTML = '';
    if (bodyNode) ui.modalBody.appendChild(bodyNode);
    ui.modalActions.innerHTML = '';
    for (const a of (actions || [])) {
      const b = document.createElement('button');
      b.className = 'btn' + (a.primary ? ' primary' : '');
      b.textContent = a.label;
      b.disabled = !!a.disabled;
      b.addEventListener('click', () => a.onClick && a.onClick());
      ui.modalActions.appendChild(b);
    }
    ui.modal.classList.remove('hidden');
  }
  ui.modalBackdrop.addEventListener('click', closeModal);
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeModal();
  });

  function prettyCardName(type) {
    switch (type) {
      case 'knight': return 'Knight';
      case 'road_building': return 'Road Building';
      case 'invention': return 'Invention';
      case 'monopoly': return 'Monopoly';
      case 'victory_point': return 'Victory Point';
      default: return type;
    }
  }


  // -------------------- Tools: Log / Dice / Chat --------------------

  function formatTs(ts, { withSeconds = false } = {}) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' } : {}),
      });
    } catch {
      return '';
    }
  }

  function getChatMessages() {
    if (state && state.chat) return state.chat;
    if (room && room.chat) return room.chat;
    return [];
  }

  function renderChatList(listEl) {
    const msgs = getChatMessages();
    listEl.innerHTML = '';
    for (const m of msgs) {
      const row = document.createElement('div');
      row.className = 'chatRow';

      const meta = document.createElement('div');
      meta.className = 'chatMeta';
      meta.textContent = `[${formatTs(m.ts)}] ${m.from || 'Player'}`;

      const body = document.createElement('div');
      body.className = 'chatBody';
      body.textContent = m.text;

      row.appendChild(meta);
      row.appendChild(body);
      listEl.appendChild(row);
    }
    listEl.scrollTop = listEl.scrollHeight;
  }

  function openChatModal() {
    activeToolModal = 'chat';

    const { wrap, content } = makeScalableToolWrap('chat', 'Scale Chat tab');

    const list = document.createElement('div');
    list.className = 'chatList';
    content.appendChild(list);

    const row = document.createElement('div');
    row.className = 'chatInputRow';

    const input = document.createElement('input');
    input.className = 'input';
    input.placeholder = 'Type a message…';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'btn primary';
    sendBtn.textContent = 'Send';

    function doSend() {
      const t = input.value.trim();
      if (!t) return;
      send({ type: 'chat', text: t });
      input.value = '';
    }

    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSend();
    });

    row.appendChild(input);
    row.appendChild(sendBtn);
    content.appendChild(row);

    chatRefs = { list, input };

    renderChatList(list);

    openModal({
      title: 'Chat',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });

    setTimeout(() => input.focus(), 50);
  }

  function openRoomIdsModal() {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    activeToolModal = 'ids';

    const { wrap, content } = makeScalableToolWrap('ids', 'Scale Room IDs tab');

    const codeRow = document.createElement('div');
    codeRow.style.display = 'flex';
    codeRow.style.gap = '8px';
    codeRow.style.alignItems = 'center';
    codeRow.style.marginBottom = '10px';

    const codeLabel = document.createElement('div');
    codeLabel.textContent = 'Room code:';
    codeLabel.style.color = '#9fb0c6';

    const codeVal = document.createElement('div');
    codeVal.textContent = room.code || '—';
    codeVal.style.fontFamily = 'ui-monospace, monospace';
    codeVal.style.fontSize = '14px';
    codeVal.style.color = '#e8eef6';

    const copyCode = document.createElement('button');
    copyCode.className = 'btn';
    copyCode.textContent = 'Copy';
    copyCode.addEventListener('click', () => copyText(room.code || ''));

    codeRow.appendChild(codeLabel);
    codeRow.appendChild(codeVal);
    codeRow.appendChild(copyCode);
    content.appendChild(codeRow);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';

    for (const p of (room.players || [])) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.padding = '8px';
      row.style.background = 'rgba(0,0,0,.10)';
      row.style.border = '1px solid rgba(255,255,255,.08)';
      row.style.borderRadius = '10px';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';
      left.style.minWidth = '140px';

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;

      const name = document.createElement('div');
      name.textContent = p.name + (p.id === room.hostId ? ' (host)' : '');
      name.style.color = '#e8eef6';

      left.appendChild(badge);
      if (colorblindMode) {
        try {
          const shapeBadge = createColorblindShapeBadge(p.color, 14);
          shapeBadge.style.marginLeft = '-2px';
          shapeBadge.style.marginRight = '0';
          left.appendChild(shapeBadge);
        } catch (_) {}
      }
      left.appendChild(name);

      const id = document.createElement('div');
      id.textContent = p.id;
      id.style.flex = '1';
      id.style.minWidth = '0';
      id.style.color = '#9fb0c6';
      id.style.fontFamily = 'ui-monospace, monospace';
      id.style.fontSize = '11px';
      id.style.wordBreak = 'break-all';

      const copy = document.createElement('button');
      copy.className = 'btn';
      copy.textContent = 'Copy ID';
      copy.addEventListener('click', () => copyText(p.id));

      row.appendChild(left);
      row.appendChild(id);
      row.appendChild(copy);
      list.appendChild(row);
    }

    content.appendChild(list);

    openModal({
      title: 'Room IDs (host only)',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function setLogPanelVisible(next) {
    logPanelOpen = !!next;
    try { localStorage.setItem('hexsettlers_log_open_v1', logPanelOpen ? '1' : '0'); } catch (_) {}

    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
    if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
  }

  function toggleLogPanel() {
    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (!inGame) {
      openLogModal();
      return;
    }
    setLogPanelVisible(!logPanelOpen);
  }

  function makeLogRow(entry) {
    const row = document.createElement('div');
    row.className = 'logRow';

    const ts = document.createElement('span');
    ts.className = 'logTs';
    ts.textContent = `[${formatTs(entry.ts, { withSeconds: true })}]`;
    row.appendChild(ts);

    if (entry && entry.auto && entry.auto.kind === 'timeout') {
      const autoIcon = document.createElement('span');
      autoIcon.className = 'logAutoIcon';
      autoIcon.textContent = '🤖';
      autoIcon.title = 'Auto-played after timer expired';
      autoIcon.setAttribute('aria-label', 'Auto-played after timer expired');
      row.appendChild(autoIcon);
    }

    // Rich production rows: show per-player gains with resource icons.
    if (entry && entry.kind === 'production' && entry.data && entry.data.gains) {
      const data = entry.data;
      const title = document.createElement('span');
      const d1 = (typeof data.d1 === 'number') ? data.d1 : null;
      const d2 = (typeof data.d2 === 'number') ? data.d2 : null;
      const roll = (typeof data.roll === 'number') ? data.roll : null;

      const rollTxt = (roll != null) ? `Resources (${roll}${(d1 != null && d2 != null) ? ` ${d1}+${d2}` : ''}):` : 'Resources:';
      title.textContent = ` ${rollTxt}`;
      row.appendChild(title);

      const gains = data.gains || {};
      const pids = Object.keys(gains);
      // Keep stable ordering (turn order if possible)
      const order = (state && state.players) ? state.players.map(p => p.id) : [];
      pids.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      for (const pid of pids) {
        const g = gains[pid] || {};
        const sum = ['brick','lumber','wool','grain','ore'].reduce((a, k) => a + (g[k] || 0), 0);
        if (!sum) continue;

        const p = (state && state.players) ? state.players.find(pp => pp.id === pid) : null;

        const seg = document.createElement('span');
        seg.className = 'logPlayerSeg';

        const dot = document.createElement('span');
        dot.className = 'logDot';
        dot.style.background = (p && p.color) ? p.color : '#8899aa';
        seg.appendChild(dot);

        const name = document.createElement('span');
        name.textContent = (p && p.name) ? p.name : 'Player';
        seg.appendChild(name);

        for (const k of ['brick','lumber','wool','grain','ore']) {
          const n = g[k] || 0;
          if (!n) continue;

          const r = document.createElement('span');
          r.className = 'logRes';

          const img = document.createElement('img');
          img.className = 'logResIcon';
          setTextureImageElementSrcFromRel(img, `Ports/${k}.png`);
          img.alt = k;
          r.appendChild(img);

          const num = document.createElement('span');
          num.className = 'logResNum';
          num.textContent = `+${n}`;
          r.appendChild(num);

          seg.appendChild(r);
        }

        row.appendChild(seg);
      }

      return row;
    }

    const body = document.createElement('span');
    body.textContent = ` ${entry && entry.text ? entry.text : ''}`;
    row.appendChild(body);
    return row;
  }

  function renderLogList(listEl) {
    if (!listEl) return;
    const entries = (state && state.log) ? state.log : [];
    const stickToBottom = (listEl.scrollTop + listEl.clientHeight) >= (listEl.scrollHeight - 12);

    listEl.innerHTML = '';
    for (const e of entries) listEl.appendChild(makeLogRow(e));

    if (stickToBottom) listEl.scrollTop = listEl.scrollHeight;
  }

  function openLogModal() {
    activeToolModal = 'log';

    const { wrap, content } = makeScalableToolWrap('log', 'Scale Game Log tab');

    const list = document.createElement('div');
    list.className = 'logList';

    renderLogList(list);

    content.appendChild(list);
    openModal({
      title: 'Game Log',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });

    list.scrollTop = list.scrollHeight;
  }

  function openRulesModal() {
    activeToolModal = 'rules';

    const r = (state && state.rules) ? state.rules : (room && room.rules) ? room.rules : null;
    const rules = r || {};

    const discardLimit = Math.max(0, Math.floor(Number(rules.discardLimit ?? 7)));
    const setupMs = Math.max(0, Math.floor(Number(rules.setupTurnMs ?? 60000)));
    const playMs = Math.max(0, Math.floor(Number(rules.playTurnMs ?? 30000)));
    const microMs = Math.max(0, Math.floor(Number(rules.microPhaseMs ?? rules.microMs ?? 15000)));

    function msToS(ms) { return `${Math.round(ms / 1000)}s`; }

    function timerSpeedName() {
      const ratio = playMs / 30000;
      if (Math.abs(ratio - 0.5) < 0.12) return 'Fast';
      if (Math.abs(ratio - 1.0) < 0.12) return 'Normal';
      if (Math.abs(ratio - 2.0) < 0.25) return 'Slow';
      return 'Custom';
    }

    const mmRaw = String(rules.mapMode || 'classic').toLowerCase();
    const is56 = (mmRaw === 'classic56' || mmRaw === 'classic_5_6' || mmRaw === 'classic-5-6' || mmRaw === 'classic5_6' || mmRaw === 'classic5-6');
    const mapMode = (mmRaw === 'seafarers') ? 'Seafarers' : (is56 ? 'Classic 5–6' : 'Classic');
    const scenRaw = String(rules.seafarersScenario || '').toLowerCase();
    const scenario = (mmRaw === 'seafarers')
      ? (scenRaw === 'through_the_desert' || scenRaw === 'through-the-desert' || scenRaw === 'desert' || scenRaw === 'throughdesert' || scenRaw === 'through_the_desert_56')
        ? 'Through the Desert'
        : (scenRaw === 'fog_island' || scenRaw === 'fog-island' || scenRaw === 'fog' || scenRaw === 'fogisland' || scenRaw === 'fog_island_56' || scenRaw === 'fog-island-56' || scenRaw === 'fog56')
          ? 'Fog Island'
          : (scenRaw === 'heading_for_new_shores' || scenRaw === 'heading-for-new-shores' || scenRaw === 'new_shores' || scenRaw === 'newshores' || scenRaw === 'heading')
            ? 'Heading for New Shores'
            : (scenRaw === 'cartographer_4_manual' || scenRaw === 'cartographer-4-manual' || scenRaw === 'cartographer_manual' || scenRaw === 'manual_cartographer' || scenRaw === 'cartographer_56_manual' || scenRaw === 'cartographer-56-manual' || scenRaw === 'cartographer56_manual')
              ? 'Cartographer'
            : (scenRaw === 'cartographer_4_random' || scenRaw === 'cartographer-4-random' || scenRaw === 'cartographer_random' || scenRaw === 'random_cartographer' || scenRaw === 'cartographer_4' || scenRaw === 'cartographer-4' || scenRaw === 'cartographer4' || scenRaw === 'cartographer' || scenRaw === 'cartographer_56_random' || scenRaw === 'cartographer-56-random' || scenRaw === 'cartographer56_random' || scenRaw === 'scattered_tiles_56' || scenRaw === 'scattered_tiles56' || scenRaw === 'scattered_56')
              ? 'Scattered Tiles'
              : (scenRaw === 'test_builder' || scenRaw === 'test-builder' || scenRaw === 'test' || scenRaw === 'builder')
                ? 'Test Builder'
                : ((scenRaw === 'six_islands' || scenRaw === 'six-islands' || scenRaw === 'sixislands' || scenRaw === 'six')
                    ? 'Six Islands'
                    : 'Four Islands')
      : (is56 ? 'Paired players' : '—');

    const vpToWin = Math.max(0, Math.floor(Number(rules.victoryPointsToWin ?? rules.victoryTarget ?? 10)));

    const { wrap, content } = makeScalableToolWrap('rules', 'Scale Rules tab');

    const table = document.createElement('table');
    table.className = 'diceTable';
    const tbody = document.createElement('tbody');
    function addRow(k, v) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = k;
      const td2 = document.createElement('td');
      td2.textContent = v;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    }

    addRow('Map', mapMode);
    addRow('Scenario', scenario);
    addRow('Victory Condition', `${vpToWin} VP`);
    const ddMode = Math.floor(Number(rules.devDeckMode ?? 25));
    const ddSpec = (ddMode === 38)
      ? '38 cards (21K / 3RB / 3Inv / 3Mon / 8VP)'
      : (ddMode === 13)
        ? '13 cards (7K / 1RB / 1Inv / 1Mon / 3VP)'
        : '25 cards (14K / 2RB / 2Inv / 2Mon / 5VP)';
    addRow('Development Deck', ddSpec);
    addRow('Discard Limit', `${discardLimit}`);
    addRow('Timer Speed', `${timerSpeedName()} (setup ${msToS(setupMs)} / turn ${msToS(playMs)} / micro ${msToS(microMs)})`);

    table.appendChild(tbody);
    content.appendChild(table);

    if (is56) {
      const note = document.createElement('div');
      note.className = 'smallNote';
      note.style.marginTop = '10px';
      note.textContent = 'Paired turns: Player 1 rolls + takes a full action phase. If they do not win, Player 2 takes an action phase (bank trade only). The third player to the left of Player 1 is Player 2. After Player 2 ends, pass to the next Player 1.';
      content.appendChild(note);
    }

    openModal({
      title: 'Game Rules',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function openDiceModal() {
    activeToolModal = 'dice';

    const { wrap, content } = makeScalableToolWrap('dice', 'Scale Dice Stats tab');

    const ds = (state && state.diceStats) ? state.diceStats : null;
    const total = ds ? Object.values(ds).reduce((a, v) => a + v, 0) : 0;

    const table = document.createElement('table');
    table.className = 'diceTable';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Roll</th><th>Count</th><th>%</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 2; r <= 12; r++) {
      const c = ds ? (ds[r] || 0) : 0;
      const pct = total ? Math.round((c / total) * 1000) / 10 : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r}</td><td>${c}</td><td>${pct.toFixed(1)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const note = document.createElement('div');
    note.className = 'smallNote';
    note.textContent = `Total rolls: ${total}`;

    content.appendChild(note);
    content.appendChild(table);

    openModal({
      title: 'Dice Statistics',
      bodyNode: wrap,
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function refreshToolModals() {
    if (!activeToolModal) return;
    if (ui.modal.classList.contains('hidden')) return;

    if (activeToolModal === 'chat' && chatRefs && chatRefs.list) {
      renderChatList(chatRefs.list);
      return;
    }
    if (activeToolModal === 'log') {
      // Rebuild log body
      const { wrap, content } = makeScalableToolWrap('log', 'Scale Game Log tab');
      const list = document.createElement('div');
      list.className = 'logList';
      renderLogList(list);
      content.appendChild(list);
      ui.modalBody.innerHTML = '';
      ui.modalBody.appendChild(wrap);
      list.scrollTop = list.scrollHeight;
      return;
    }
    if (activeToolModal === 'rules') {
      // Rules rarely change, but if they do, rebuild.
      openRulesModal();
      return;
    }
    if (activeToolModal === 'dice') {
      // Rebuild dice body
      const { wrap, content } = makeScalableToolWrap('dice', 'Scale Dice Stats tab');
      const ds = (state && state.diceStats) ? state.diceStats : null;
      const total = ds ? Object.values(ds).reduce((a, v) => a + v, 0) : 0;

      const table = document.createElement('table');
      table.className = 'diceTable';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Roll</th><th>Count</th><th>%</th></tr>';
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let r = 2; r <= 12; r++) {
        const c = ds ? (ds[r] || 0) : 0;
        const pct = total ? Math.round((c / total) * 1000) / 10 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r}</td><td>${c}</td><td>${pct.toFixed(1)}</td>`;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);

      const note = document.createElement('div');
      note.className = 'smallNote';
      note.textContent = `Total rolls: ${total}`;

      content.appendChild(note);
      content.appendChild(table);

      ui.modalBody.innerHTML = '';
      ui.modalBody.appendChild(wrap);
      return;
    }
  }



  function handleLastEvent() {
    if (!state || !state.lastEvent) return;
    const ev = state.lastEvent;
    if (!ev.id || ev.id <= lastEventIdSeen) return;
    lastEventIdSeen = ev.id;

    if (ev.type === 'devcard_draw' && ev.playerId === myPlayerId) {
      const wrap = document.createElement('div');
      const img = document.createElement('img');
      img.className = 'modalImg';
      setTextureImageElementSrc(img, DEV_IMG[ev.cardType] || '');
      img.alt = prettyCardName(ev.cardType);
      wrap.appendChild(img);
      openModal({
        title: `Development Card: ${prettyCardName(ev.cardType)}`,
        bodyNode: wrap,
        actions: [{ label: 'OK', primary: true, onClick: closeModal }]
      });
    }

    if (ev.type === 'steal_result' && ev.playerId === myPlayerId && ev.resourceKind) {
      const wrap2 = document.createElement('div');
      wrap2.className = 'modalText';
      wrap2.textContent = `You stole: ${ev.resourceKind}`;
      openModal({
        title: 'Steal Result',
        bodyNode: wrap2,
        actions: [{ label: 'OK', primary: true, onClick: closeModal }]
      });
    }
  }

  // Lobby UI
  function openLeaveRoomConfirm() {
    if (!room || !myPlayerId) return;
    const wrap = document.createElement('div');
    wrap.className = 'modalText';
    wrap.textContent = 'Leave this room? You can rejoin later if the room is still open.';
    openModal({
      title: 'Leave Room',
      bodyNode: wrap,
      actions: [
        { label: 'Cancel', onClick: closeModal },
        {
          label: 'Leave Room',
          primary: true,
          onClick: () => {
            closeModal();
            send({ type: 'leave_room' });
          }
        }
      ]
    });
  }

  function openLeaveGameConfirm() {
    const phaseNow = currentRoomPhase();
    if (!room || phaseNow === 'lobby' || !myPlayerId) return;
    const amSpectatorNow = amRoomSpectator();
    const directLeave = !!(amSpectatorNow || phaseNow === 'game-over');
    const wrap = document.createElement('div');
    wrap.className = 'modalText';
    wrap.textContent = directLeave
      ? 'Leave this room? You will immediately leave the lobby and stop spectating.'
      : 'Leave the active game and become a spectator? The host must approve before you are removed from turn order.';
    openModal({
      title: directLeave ? 'Leave Room' : 'Leave Game',
      bodyNode: wrap,
      actions: [
        { label: 'Cancel', onClick: closeModal },
        {
          label: directLeave ? 'Leave Room' : 'Request Leave',
          primary: true,
          onClick: () => {
            closeModal();
            send({ type: directLeave ? 'leave_room' : 'request_leave_game' });
          }
        }
      ]
    });
  }

  function openKickPlayerConfirm(playerId, playerName) {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const targetId = String(playerId || '').trim();
    if (!targetId || targetId === room.hostId) return;
    const wrap = document.createElement('div');
    wrap.className = 'modalText';
    wrap.textContent = `Remove ${playerName || 'this player'} from the room?`;
    openModal({
      title: 'Kick Player',
      bodyNode: wrap,
      actions: [
        { label: 'Cancel', onClick: closeModal },
        {
          label: 'Kick Player',
          primary: true,
          onClick: () => {
            closeModal();
            send({ type: 'kick_player', playerId: targetId });
          }
        }
      ]
    });
  }

  function openLeaveGameRequestPrompt(playerId, playerName) {
    const targetId = String(playerId || '').trim();
    if (!targetId) return;
    const wrap = document.createElement('div');
    wrap.className = 'modalText';
    wrap.textContent = `${playerName || 'A player'} wants to leave the active game and become a spectator. Approve this request?`;
    openModal({
      title: 'Leave Game Request',
      bodyNode: wrap,
      actions: [
        {
          label: 'Reject',
          onClick: () => {
            closeModal();
            send({ type: 'respond_leave_game', playerId: targetId, accepted: false });
          }
        },
        {
          label: 'Approve',
          primary: true,
          onClick: () => {
            closeModal();
            send({ type: 'respond_leave_game', playerId: targetId, accepted: true });
          }
        }
      ]
    });
  }

  function renderLobby() {
    refreshLobbyJoinLinkUi();
    refreshTexturePackUi();

    if (ui.myAccountLabel) ui.myAccountLabel.textContent = authUser ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';
    if (!ui.playersList) return;

    ui.playersList.innerHTML = '';
    if (!room) return;

    const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
    const amHost = !!(myPlayerId && room.hostId === myPlayerId);
    const activePackIdNow = activeTexturePackId();

    function appendMemberRow(p, roleLabel) {
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'playerRow';

      const tag = document.createElement('div');
      tag.className = 'playerTag';
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;
      const name = document.createElement('div');
      let label = p.name;
      if (p.isAI) label += ' (AI)';
      if (roleLabel === 'spectator') label += ' (spectator)';
      if (p.id === room.hostId) label += ' (host)';
      if (p.id === myPlayerId) label += ' (you)';
      name.textContent = label;
      tag.appendChild(badge);
      tag.appendChild(name);
      row.appendChild(tag);

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.alignItems = 'center';
      controls.style.gap = '8px';
      controls.style.flexWrap = 'wrap';
      controls.style.justifyContent = 'flex-end';

      const playerPackId = String((p && p.texturePackId) || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
      const playerPackName = String((p && p.texturePackName) || (playerPackId === DEFAULT_TEXTURE_PACK_ID ? DEFAULT_TEXTURE_PACK_LABEL : 'Custom Pack'));
      if (p.id !== myPlayerId && playerPackId !== activePackIdNow) {
        const useBtn = document.createElement('button');
        useBtn.className = 'btn';
        useBtn.type = 'button';
        useBtn.style.padding = '6px 8px';
        useBtn.style.fontSize = '11px';
        useBtn.style.whiteSpace = 'nowrap';
        useBtn.textContent = `Use ${playerPackName}`;
        useBtn.title = (playerPackId === DEFAULT_TEXTURE_PACK_ID)
          ? 'Switch back to the default texture pack.'
          : 'Switch to this player\'s texture pack and save it in this browser.';
        useBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          void handlePlayerTexturePackChoice(p).catch((err) => {
            setError(err && err.message ? err.message : 'Failed to switch texture pack.');
          });
        });
        controls.appendChild(useBtn);
      }

      if (p.id === myPlayerId) {
        if (!gameStartedNow || roleLabel === 'spectator') {
          if (p.id !== room.hostId) {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 'btn';
            leaveBtn.type = 'button';
            leaveBtn.style.padding = '6px 8px';
            leaveBtn.style.fontSize = '11px';
            leaveBtn.textContent = 'Leave Room';
            leaveBtn.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              openLeaveRoomConfirm();
            });
            controls.appendChild(leaveBtn);
          }
        }

        if (!gameStartedNow) {
          const spectBtn = document.createElement('button');
          spectBtn.className = 'btn';
          spectBtn.type = 'button';
          spectBtn.style.padding = '6px 8px';
          spectBtn.style.fontSize = '11px';
          spectBtn.textContent = (roleLabel === 'spectator') ? 'Join Game' : 'Spectator Mode';
          if (p.id === room.hostId) {
            spectBtn.disabled = true;
            spectBtn.title = 'The host must remain an active player.';
          }
          spectBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (p.id === room.hostId) return;
            send({ type: 'set_spectator_mode', enabled: roleLabel !== 'spectator' });
          });
          controls.appendChild(spectBtn);
        }
      } else if (amHost && !p.isAI && p.id !== room.hostId) {
        const canKick = !gameStartedNow || roleLabel === 'spectator';
        if (canKick) {
          const kickBtn = document.createElement('button');
          kickBtn.className = 'btn';
          kickBtn.type = 'button';
          kickBtn.style.padding = '6px 8px';
          kickBtn.style.fontSize = '11px';
          kickBtn.textContent = 'Kick Player';
          kickBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openKickPlayerConfirm(p.id, p.name || 'this player');
          });
          controls.appendChild(kickBtn);
        }
      }

      if (controls.childNodes.length) row.appendChild(controls);
      ui.playersList.appendChild(row);
    }

    for (const p of roomPlayersList()) appendMemberRow(p, 'player');

    const spectators = roomSpectatorsList();
    if (spectators.length) {
      const label = document.createElement('div');
      label.className = 'smallNote';
      label.style.marginTop = '2px';
      label.textContent = 'Spectators';
      ui.playersList.appendChild(label);
      for (const p of spectators) appendMemberRow(p, 'spectator');
    }
    // AI fill controls (host-only, lobby only)
    try {
      const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
      const canManageAI = !!(myPlayerId && room.hostId === myPlayerId && !gameStartedNow);
      if (ui.aiFillRow) ui.aiFillRow.classList.toggle('hidden', !canManageAI);

      // AI difficulty (host-only, lobby only)
      if (ui.aiDifficultySelect) {
        ui.aiDifficultySelect.disabled = !canManageAI;
        const rawDiff = String(room?.aiDifficulty || 'test').toLowerCase();
        let diff = 'test';
        if (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard' || rawDiff === 'catanatron' || rawDiff === 'expert' || rawDiff === 'neural_net' || rawDiff === 'neural') {
          diff = (rawDiff === 'expert') ? 'catanatron' : ((rawDiff === 'neural') ? 'neural_net' : rawDiff);
        }
        ui.aiDifficultySelect.value = diff;
      }

      if (canManageAI && ui.aiFillSelect) {
        const raw = String(room?.rules?.mapMode || 'classic').toLowerCase();
        const mm = (raw === 'seafarers') ? 'seafarers'
          : (raw === 'classic56' || raw === 'classic_5_6' || raw === 'classic-5-6' || raw === 'classic5_6' || raw === 'classic5-6')
            ? 'classic56'
            : 'classic';
        const allowSolo = (mm === 'seafarers') && String(room?.rules?.seafarersScenario || '').toLowerCase() === 'test_builder';
        const scen = String(room?.rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
        const isSeafarers56 = (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random'));
        const minPlayers = (mm === 'classic56') ? 5 : (isSeafarers56 ? 5 : (allowSolo ? 1 : 2));
        const maxPlayers = (mm === 'classic56') ? 6 : (isSeafarers56 ? 6 : 4);
        const humans = (room.players || []).filter(pp => pp && !pp.isAI).length;
        const current = (room.players || []).length;
        const start = Math.max(humans, 1);
        const prev = ui.aiFillSelect.value;
        ui.aiFillSelect.innerHTML = '';
        for (let target = start; target <= maxPlayers; target++) {
          const opt = document.createElement('option');
          const add = Math.max(0, target - current);
          const rem = Math.max(0, current - target);
          let suffix = '';
          if (add > 0) suffix = `(+${add} AI)`;
          else if (rem > 0) suffix = `(-${rem} AI)`;
          opt.value = String(target);
          opt.textContent = `Fill to ${target} ${suffix}`.trim();
          ui.aiFillSelect.appendChild(opt);
        }
        // Keep selection if possible, otherwise default to the minimum needed to start.
        const desired = (prev && [...ui.aiFillSelect.options].some(o => o.value === prev)) ? prev : String(Math.max(minPlayers, Math.min(maxPlayers, current)));
        ui.aiFillSelect.value = desired;
      }
    } catch (_) {}


    // Color picker (unique per player)
    try {
      const myP = (myPlayerId && room && Array.isArray(room.players)) ? room.players.find(x => x && x.id === myPlayerId) : null;
      const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
      const canPick = !!myP && !gameStartedNow;

      if (ui.colorPickerRow) ui.colorPickerRow.classList.toggle('hidden', !canPick);
      if (ui.colorPicker) {
        if (!canPick) {
          ui.colorPicker.innerHTML = '';
        } else {
          const PLAYER_COLOR_OPTIONS = [
            { name: 'Red', hex: '#e74c3c' },
            { name: 'Blue', hex: '#3498db' },
            { name: 'Green', hex: '#2ecc71' },
            { name: 'Yellow', hex: '#f1c40f' },
            { name: 'Purple', hex: '#8000f8' },
            { name: 'Teal', hex: '#88f8f8' },
            { name: 'White', hex: '#f8f8f8' },
            { name: 'Orange', hex: '#f86800' },
            { name: 'Black', hex: '#111111' },
            { name: 'Pink', hex: '#ff6ec7' },
          ];

          const taken = new Map();
          for (const pl of room.players) {
            if (!pl) continue;
            const hc = String(pl.color || '').toLowerCase();
            if (hc) taken.set(hc, pl.id);
          }

          const myHex = String(myP.color || '').toLowerCase();
          const isLight = (hex) => {
            const h = String(hex || '').replace('#','');
            if (h.length !== 6) return false;
            const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
            // relative luminance
            const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
            return lum > 0.62;
          };

          ui.colorPicker.innerHTML = '';
          for (const opt of PLAYER_COLOR_OPTIONS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'colorChip';
            btn.style.background = opt.hex;

            const usedBy = taken.get(String(opt.hex).toLowerCase());
            const mine = (myHex && myHex === String(opt.hex).toLowerCase());

            if (mine) btn.classList.add('selected');
            if (usedBy && usedBy !== myPlayerId) {
              btn.classList.add('disabled');
              btn.disabled = true;
              btn.title = `${opt.name} (taken)`;
            } else {
              btn.title = opt.name;
            }

            const check = document.createElement('div');
            check.className = 'check';
            check.textContent = mine ? '✓' : '';
            check.style.color = isLight(opt.hex) ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.92)';
            btn.appendChild(check);

            btn.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (btn.disabled) return;
              if (mine) return;
              setError(null);
              send({ type: 'set_player_color', color: opt.hex });
            });

            ui.colorPicker.appendChild(btn);
          }
        }
      }
    } catch (_) {}

    // Setup visibility & controls
    const gameStarted = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.lobbyCard) ui.lobbyCard.classList.toggle('hidden', gameStarted);
    if (ui.setupCard) ui.setupCard.classList.toggle('hidden', gameStarted);

    const r = room.rules || { discardLimit: 7, setupTurnMs: 60000, playTurnMs: 30000, microPhaseMs: 15000 };
    const isHost = !!(myPlayerId && room.hostId === myPlayerId) && !gameStarted;

    if (ui.discardLimitInput) {
      ui.discardLimitInput.value = r.discardLimit ?? 7;
      ui.discardLimitInput.disabled = !isHost;
    }
    if (ui.timerSpeedSelect) {
      const factor = (r.setupTurnMs || 60000) / 60000;
      const preset = factor <= 0.75 ? 'fast' : (factor >= 1.5 ? 'slow' : 'normal');
      ui.timerSpeedSelect.value = preset;
      ui.timerSpeedSelect.disabled = !isHost;
    }
    if (ui.baseResourceCountSelect) {
      const defBase = defaultBaseResourcesFor(r);
      const rawBase = Math.floor(Number(r.baseResourcesPerType ?? r.baseResourceCount ?? defBase));
      const safeBase = Number.isFinite(rawBase) ? Math.max(1, Math.min(40, rawBase)) : defBase;
      ui.baseResourceCountSelect.value = String(safeBase);
      ui.baseResourceCountSelect.disabled = !isHost;
      baseResourceCountTouched = (safeBase !== defBase);
    }
    if (ui.mapModeSelect) {
      ui.mapModeSelect.value = uiMapModeFromRules(r);
      ui.mapModeSelect.disabled = !isHost;
    }
    if (ui.devDeckModeSelect) {
      const ddRaw = String(r.devDeckMode ?? 25);
      ui.devDeckModeSelect.value = (ddRaw === '13' || ddRaw === '25' || ddRaw === '38') ? ddRaw : '25';
      ui.devDeckModeSelect.disabled = !isHost;
    }
    // Seafarers scenario selector
    const mmNow = uiMapModeFromRules(r);
    if (ui.scenarioRow) ui.scenarioRow.classList.toggle('hidden', mmNow !== 'seafarers');
    if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mmNow !== 'seafarers56');
    if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mmNow !== 'classic56');
    if (ui.sixIslandsNote) ui.sixIslandsNote.classList.toggle('hidden', mmNow !== 'seafarers56');
    if (ui.mapScenarioSelect) {
      // Only meaningful when mapMode === 'seafarers'.
      ui.mapScenarioSelect.value = (mmNow === 'seafarers') ? (r.seafarersScenario || 'four_islands') : 'four_islands';
      ui.mapScenarioSelect.disabled = !isHost || (mmNow !== 'seafarers');
    }
    if (ui.mapScenario56Select) {
      const scen56 = (mmNow === 'seafarers56') ? String(r.seafarersScenario || 'six_islands').toLowerCase() : 'six_islands';
      ui.mapScenario56Select.value = (scen56 === 'through_the_desert_56')
        ? 'through_the_desert_56'
        : ((scen56 === 'fog_island_56') ? 'fog_island_56'
          : ((scen56 === 'cartographer_56_manual') ? 'cartographer_56_manual'
            : ((scen56 === 'cartographer_56_random') ? 'cartographer_56_random' : 'six_islands')));
      ui.mapScenario56Select.disabled = !isHost || (mmNow !== 'seafarers56');
    }

    // Test Builder (Solo) map painting UI (host-only)
    const scenNow = String(r.seafarersScenario || 'four_islands').toLowerCase();
    const showTestBuilder = (mmNow === 'seafarers' && scenNow === 'test_builder');
    if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTestBuilder || gameStarted);
    if (ui.testBrushSelect) ui.testBrushSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testNumberSelect) ui.testNumberSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testResetBtn) ui.testResetBtn.disabled = !isHost || !showTestBuilder || gameStarted;

    // Victory points to win
    if (ui.victoryPointsSelect) {
      const defVp = defaultVictoryPointsFor(r);
      const curVp = Math.floor(Number(r.victoryPointsToWin ?? r.victoryTarget ?? defVp));
      const safeVp = Number.isFinite(curVp) ? String(Math.max(3, Math.min(30, curVp))) : String(defVp);
      ui.victoryPointsSelect.value = safeVp;
      ui.victoryPointsSelect.disabled = !isHost;

      // If the current rules are non-default for the chosen map/scenario,
      // consider the VP target "touched" so we don't auto-reset it.
      vpTouched = (Number(ui.victoryPointsSelect.value) !== defVp);
    }
    if (ui.saveRulesBtn) ui.saveRulesBtn.disabled = !isHost;

    // Lobby map preview controls
    if (ui.regenMapBtn) {
      ui.regenMapBtn.classList.toggle('hidden', !!(gameStarted || !isHost));
      ui.regenMapBtn.disabled = !(isHost && !gameStarted);
    }
    if (ui.mapGenNote) {
      if (gameStarted) {
        ui.mapGenNote.classList.add('hidden');
        ui.mapGenNote.textContent = '';
      } else {
        ui.mapGenNote.classList.remove('hidden');
        const ts = (state && state.previewAt) ? new Date(state.previewAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
        ui.mapGenNote.textContent = ts ? `Preview generated at ${ts}.` : 'Preview map will lock when the game starts.';
      }
    }

    if (ui.rulesPreview) {
      const s1 = Math.round((r.setupTurnMs || 60000) / 1000);
      const s2 = Math.round((r.playTurnMs || 30000) / 1000);
      const s3 = Math.round((r.microPhaseMs || 15000) / 1000);
      const mmUi = uiMapModeFromRules(r);
      const mmL = String(mmUi || 'classic').toLowerCase();
      const scen = (mmL === 'seafarers56')
        ? (((r.seafarersScenario === 'through_the_desert_56') || (r.seafarersScenario === 'fog_island_56') || (r.seafarersScenario === 'cartographer_56_manual') || (r.seafarersScenario === 'cartographer_56_random')) ? r.seafarersScenario : 'six_islands')
        : (r.seafarersScenario || 'four_islands');
      const scenLabel = (scen === 'through_the_desert') ? 'Through the Desert'
        : (scen === 'through_the_desert_56') ? 'Through the Desert'
        : (scen === 'fog_island' || scen === 'fog_island_56' ? 'Fog Island'
          : (scen === 'heading_for_new_shores' ? 'Heading for New Shores'
            : (scen === 'cartographer_4_manual' || scen === 'cartographer_56_manual' ? 'Cartographer'
            : (scen === 'cartographer_4_random' || scen === 'cartographer_4' || scen === 'cartographer_56_random' ? 'Scattered Tiles'
              : (scen === 'test_builder' ? 'Test Builder'
                : (scen === 'six_islands' ? 'Six Islands' : 'Four Islands'))))));
      const is56 = (mmL === 'classic56' || mmL === 'classic_5_6' || mmL === 'classic-5-6' || mmL === 'classic5_6' || mmL === 'classic5-6');
      const mapLabel = (mmL === 'seafarers56') ? `seafarers 5–6 (${scenLabel.toLowerCase()}, paired turns)`
        : (mmL === 'seafarers') ? `seafarers (${scenLabel})`
          : (is56 ? 'classic 5–6 (paired turns)' : 'classic');
      const vpWin = Math.floor(Number(r.victoryPointsToWin ?? r.victoryTarget ?? defaultVictoryPointsFor(r)));
      const ddMode = Math.floor(Number(r.devDeckMode ?? 25));
      const ddCards = (ddMode === 13 || ddMode === 25 || ddMode === 38) ? ddMode : 25;
      ui.rulesPreview.textContent = `Map: ${mapLabel} • Win: ${vpWin} VP • Dev deck: ${ddCards} cards • Discard limit: ${r.discardLimit ?? 7} • Setup turn: ${s1}s • Turn: ${s2}s • Micro: ${s3}s`;
    }

    const allowSolo = (mmNow === 'seafarers' && scenNow === 'test_builder');
    const mmLow = String(mmNow || 'classic').toLowerCase();
    const isClassic56 = (mmLow === 'classic56' || mmLow === 'classic_5_6' || mmLow === 'classic-5-6' || mmLow === 'classic5_6' || mmLow === 'classic5-6');
    const isSix = uiIsSixIslands(r);
    const minPlayers = isClassic56 ? 5 : (isSix ? 5 : (allowSolo ? 1 : 2));
    ui.startBtn.disabled = !(myPlayerId && room.hostId === myPlayerId && room.players.length >= minPlayers && (!state || state.phase === 'lobby'));
  }

    // ---- Account / Auth ----
  if (ui.registerBtn) ui.registerBtn.addEventListener('click', () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    send({ type: 'auth_register', username, password, displayName });
  });

  if (ui.loginBtn) ui.loginBtn.addEventListener('click', () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    send({ type: 'auth_login', username, password, displayName });
  });

  if (ui.logoutBtn) ui.logoutBtn.addEventListener('click', () => {
    setError(null);
    clearAuthLocal();
    // Optional: drop room state
    room = null;
    myPlayerId = null;
    try { setLocalPanelLayoutOwnerKey(null); } catch (_) {}
    isHost = false;
    if (ui.roomBox) ui.roomBox.classList.add('hidden');
  });

  if (ui.rejoinLastBtn) ui.rejoinLastBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    const code = (ui.codeInput?.value || '').trim().toUpperCase() || (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (!code) { setError('Enter a room code first.'); return; }
    send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
  });

  // ---- Lobby ----
  ui.createBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    state = null;
    resetViewportForRoomChange();
    render();
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Host';
    send({ type: 'create_room', displayName });
  });

  ui.joinBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    state = null;
    resetViewportForRoomChange();
    render();
    const code = (ui.codeInput?.value || '').trim().toUpperCase();
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Player';
    send({ type: 'join_room', code, displayName });
  });

if (ui.copyMyIdBtn) {
    ui.copyMyIdBtn.addEventListener('click', () => {
      if (!myPlayerId) return;
      copyText(myPlayerId);
    });
  }
  if (ui.genJoinLinkBtn) {
    ui.genJoinLinkBtn.addEventListener('click', () => {
      refreshLobbyJoinLinkUi();
      const link = String(ui.roomJoinLinkInput?.value || '');
      if (!link) { setError('Join a room first.'); return; }
      toast('Join link generated.');
    });
  }
  if (ui.copyJoinLinkBtn) {
    ui.copyJoinLinkBtn.addEventListener('click', () => {
      refreshLobbyJoinLinkUi();
      const link = String(ui.roomJoinLinkInput?.value || '');
      if (!link) { setError('Join a room first.'); return; }
      copyText(link);
    });
  }
  ui.startBtn.addEventListener('click', () => {
    setError(null);
    send({ type: 'start_game' });
  });

  if (ui.aiDifficultySelect) ui.aiDifficultySelect.addEventListener('change', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const difficulty = String(ui.aiDifficultySelect.value || 'test').toLowerCase();
    send({ type: 'set_ai_difficulty', difficulty });
  });

  if (ui.aiFillBtn) ui.aiFillBtn.addEventListener('click', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const target = Math.floor(Number(ui.aiFillSelect?.value || 0));
    if (!Number.isFinite(target) || target <= 0) return;
    send({ type: 'fill_ai', targetCount: target });
  });

  if (ui.aiClearBtn) ui.aiClearBtn.addEventListener('click', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    send({ type: 'clear_ai' });
  });

  if (ui.mapModeSelect && ui.scenarioRow) {
    ui.mapModeSelect.addEventListener('change', () => {
      const mm = (ui.mapModeSelect.value || 'classic');
      ui.scenarioRow.classList.toggle('hidden', mm !== 'seafarers');
      if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mm !== 'seafarers56');
      if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mm !== 'classic56');
      if (ui.sixIslandsNote) {
        ui.sixIslandsNote.classList.toggle('hidden', mm !== 'seafarers56');
      }
      if (ui.mapScenarioSelect) ui.mapScenarioSelect.disabled = (mm !== 'seafarers') || (room && room.hostId !== myPlayerId);
      if (ui.mapScenario56Select) ui.mapScenario56Select.disabled = (mm !== 'seafarers56') || (room && room.hostId !== myPlayerId);

      // Test Builder UI only appears for seafarers:test_builder
      const showTest = (mm === 'seafarers' && ui.mapScenarioSelect && String(ui.mapScenarioSelect.value).toLowerCase() === 'test_builder');
      if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTest);

      // If the host hasn't manually set a win target yet, auto-fill the scenario default.
      if (ui.victoryPointsSelect && !vpTouched) {
        const scen = (mm === 'seafarers')
          ? (ui.mapScenarioSelect ? ui.mapScenarioSelect.value : (room?.rules?.seafarersScenario || 'four_islands'))
          : ((mm === 'seafarers56') ? (ui.mapScenario56Select?.value || 'six_islands') : 'six_islands');
        ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario: scen }));
        if (ui.baseResourceCountSelect && !baseResourceCountTouched) {
          ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode: mm, seafarersScenario: scen }));
        }
      }
    });
  }

  if (ui.mapScenarioSelect) {
    ui.mapScenarioSelect.addEventListener('change', () => {
      if (!ui.victoryPointsSelect) return;
      const mm = (ui.mapModeSelect ? (ui.mapModeSelect.value || 'classic') : 'classic');
      if (ui.testBuilderRow) {
        const showTest = (mm === 'seafarers' && String(ui.mapScenarioSelect.value).toLowerCase() === 'test_builder');
        ui.testBuilderRow.classList.toggle('hidden', !showTest);
      }
      if (ui.sixIslandsNote) {
        // Six Islands is exposed as its own map type (seafarers56), not a seafarers sub-scenario.
        ui.sixIslandsNote.classList.add('hidden');
      }
      if (mm !== 'seafarers') return;
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario: ui.mapScenarioSelect.value }));
      if (ui.baseResourceCountSelect && !baseResourceCountTouched) ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode: mm, seafarersScenario: ui.mapScenarioSelect.value }));
    });
  }

  if (ui.mapScenario56Select) {
    ui.mapScenario56Select.addEventListener('change', () => {
      if (!ui.victoryPointsSelect) return;
      const mm = (ui.mapModeSelect ? (ui.mapModeSelect.value || 'classic') : 'classic');
      if (mm !== 'seafarers56') return;
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario56: ui.mapScenario56Select.value }));
      if (ui.baseResourceCountSelect && !baseResourceCountTouched) ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode: mm, seafarersScenario56: ui.mapScenario56Select.value }));
    });
  }

  if (ui.victoryPointsSelect) {
    ui.victoryPointsSelect.addEventListener('change', () => { vpTouched = true; });
  }
  if (ui.baseResourceCountSelect) {
    ui.baseResourceCountSelect.addEventListener('change', () => { baseResourceCountTouched = true; });
  }

  // Lobby setup
  ui.saveRulesBtn.addEventListener('click', () => {
    if (!room || room.hostId !== myPlayerId) return;
    const discardLimit = parseInt(ui.discardLimitInput.value, 10);
    const vpToWin = ui.victoryPointsSelect ? parseInt(ui.victoryPointsSelect.value, 10) : NaN;
    const devDeckMode = ui.devDeckModeSelect ? parseInt(ui.devDeckModeSelect.value, 10) : NaN;
    const baseResourcesPerType = ui.baseResourceCountSelect ? parseInt(ui.baseResourceCountSelect.value, 10) : NaN;
    const preset = (ui.timerSpeedSelect.value || 'normal');
    const factor = preset === 'fast' ? 0.5 : (preset === 'slow' ? 2 : 1);
    const mmSel = (ui.mapModeSelect ? ui.mapModeSelect.value : 'classic');
    // 'seafarers56' is a UI convenience. The server stores this as seafarers + scenario.
    const mm = (String(mmSel).toLowerCase() === 'seafarers56') ? 'seafarers' : mmSel;
    const scenario = (String(mmSel).toLowerCase() === 'seafarers56')
      ? (ui.mapScenario56Select?.value || 'six_islands')
      : ((ui.mapScenarioSelect && mm === 'seafarers') ? ui.mapScenarioSelect.value : (room?.rules?.seafarersScenario || 'four_islands'));
    const rules = {
      discardLimit: Number.isFinite(discardLimit) ? discardLimit : 7,
      setupTurnMs: Math.round(60000 * factor),
      playTurnMs: Math.round(30000 * factor),
      microPhaseMs: Math.round(15000 * factor),
      mapMode: mm,
      victoryPointsToWin: Number.isFinite(vpToWin) ? vpToWin : undefined,
      devDeckMode: (devDeckMode === 13 || devDeckMode === 25 || devDeckMode === 38) ? devDeckMode : undefined,
      baseResourcesPerType: Number.isFinite(baseResourcesPerType) ? Math.max(1, Math.min(40, baseResourcesPerType)) : undefined,
      // Only used if mapMode === 'seafarers'
      seafarersScenario: (mm === 'seafarers') ? scenario : (room?.rules?.seafarersScenario || 'four_islands'),
    };
    send({ type: 'set_rules', rules });
  });

  if (ui.regenMapBtn) {
    ui.regenMapBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

  if (ui.testResetBtn) {
    ui.testResetBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

  // Tools
  ui.logBtn.addEventListener('click', () => toggleLogPanel());
  if (ui.rulesBtn) ui.rulesBtn.addEventListener('click', () => openRulesModal());
  ui.diceBtn.addEventListener('click', () => openDiceModal());
  ui.chatBtn.addEventListener('click', () => openChatModal());
  if (ui.audioBtn) ui.audioBtn.addEventListener('click', () => toggleAudioPanel());
  if (ui.colorblindBtn) {
    updateColorblindUi();
    ui.colorblindBtn.addEventListener('click', () => setColorblindMode(!colorblindMode));
  }
  if (ui.leaveGameBtn) ui.leaveGameBtn.addEventListener('click', () => openLeaveGameConfirm());
  if (ui.endGameVoteBtn) ui.endGameVoteBtn.addEventListener('click', () => {
    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    const isHostNow = !!(room && myPlayerId && room.hostId === myPlayerId);
    if (!inGame || !isHostNow) return;
    // If a vote is already open, just re-open the panel.
    if (state && state.endVote && state.endVote.id) {
      openEndGameVoteModal(true);
      return;
    }
    sendGameAction({ kind: 'propose_endgame' });
  });
  if (ui.idsBtn) ui.idsBtn.addEventListener('click', () => openRoomIdsModal());

  if (ui.logHideBtn) {
    ui.logHideBtn.addEventListener('click', () => setLogPanelVisible(false));
  }

  // Game action mode
  const inputMode = { kind: null, moveShipFrom: null, moveShipTargets: [], moveShipTargetsLoading: false }; // 'place_settlement' | 'place_road' | 'upgrade_city' | 'move_robber'
  function setMode(kind) {
    // Clear any partial ship-move selection when leaving that mode.
    if (kind !== 'move_ship') {
      inputMode.moveShipFrom = null;
      inputMode.moveShipTargets = [];
      inputMode.moveShipTargetsLoading = false;
      hideShipMoveCancelPopup();
    }

    inputMode.kind = kind;
    let msg = '';
    if (!kind) {
      msg = 'Tip: Hover a node to build/upgrade with confirmation. Click edges to build roads/ships; click one of your ships to move it.';
    } else if (kind === 'place_ship') {
      msg = 'Click an eligible sea edge to place a ship.';
    } else if (kind === 'move_ship') {
      msg = inputMode.moveShipFrom == null
        ? 'Click one of your end ships to select it, then click an empty sea edge to move it.'
        : 'Now click an empty sea edge to move the selected ship.';
    } else if (kind === 'move_thief') {
      msg = 'Click a land tile to move the robber, or a sea tile to move the pirate.';
    } else if (kind === 'move_pirate') {
      msg = 'Click a sea tile to move the pirate.';
    } else if (kind === 'move_robber') {
      msg = 'Click a land tile to move the robber.';
    } else {
      msg = `Click on the board to ${kind.replaceAll('_', ' ')}.`;
    }
    ui.hintBox.textContent = msg;
  }

  function sendGameAction(action) {
    if (!action) return;
    if (amRoomSpectator()) {
      setError('Spectators cannot take game actions.');
      return;
    }
    if (state && state.paused) {
      setError('Game is paused.');
      return;
    }
    send({ type: 'game_action', action });
  }

  let hoverNodeBuild = { nodeId: null, absX: 0, absY: 0, actionKind: null };
  let hoverNodeBuildQuery = null; // { targetKind:'node', targetId:number }
  let hoverEdgeBuild = { edgeId: null, absX: 0, absY: 0, actionKinds: [] };
  let hoverEdgeBuildQuery = null; // { targetKind:'edge', targetId:number }
  let hoverNodeBuildCache = new Map(); // key => build_options[] for current state snapshot
  let nodeConfirmPopup = null;
  let boardHoverIndicator = null;
  let edgeHoverIndicator = null;
  let edgeConfirmPopup = null;
  let shipMoveCancelPopup = null;
  let thiefMoveConfirmPopup = null;

  function buildCacheKey(targetKind, targetId) {
    return `${targetKind}:${targetId}`;
  }

  function getNodeActionOption(options) {
    const opts = Array.isArray(options) ? options : [];
    const city = opts.find(o => o && o.kind === 'upgrade_city');
    const settlement = opts.find(o => o && o.kind === 'place_settlement');
    return city || settlement || null;
  }

  function getBuildActionIcon(kind) {
    if (kind === 'upgrade_city') return '🏰';
    if (kind === 'place_settlement') return '🏠';
    if (kind === 'place_ship') return '⛵';
    if (kind === 'place_road') return '🛣️';
    return '•';
  }

  function hideBoardHoverIndicator() {
    if (!boardHoverIndicator) return;
    boardHoverIndicator.classList.add('hidden');
  }

  function showBoardHoverIndicator(absX, absY, actionKind) {
    ensureNodeBuildUi();
    if (!boardHoverIndicator) return;
    const iconEl = boardHoverIndicator.querySelector('.nodeBuildHoverIcon');
    const txtEl = boardHoverIndicator.querySelector('.nodeBuildHoverText');
    if (iconEl) iconEl.textContent = getBuildActionIcon(actionKind);
    if (txtEl) txtEl.textContent = (actionKind === 'upgrade_city') ? 'City' : 'Settlement';
    boardHoverIndicator.classList.remove('hidden');
    const pad = 10;
    boardHoverIndicator.style.left = `${Math.round(absX + 12)}px`;
    boardHoverIndicator.style.top = `${Math.round(absY - 12)}px`;
    const r = boardHoverIndicator.getBoundingClientRect();
    let nx = absX + 12;
    let ny = absY - 12;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, window.innerHeight - r.height - pad);
    if (ny < pad) ny = pad;
    boardHoverIndicator.style.left = `${Math.round(nx)}px`;
    boardHoverIndicator.style.top = `${Math.round(ny)}px`;
  }

  function hideNodeConfirmPopup() {
    if (!nodeConfirmPopup) return;
    nodeConfirmPopup.classList.add('hidden');
    nodeConfirmPopup.style.left = '-9999px';
    nodeConfirmPopup.style.top = '-9999px';
  }

  function showNodeConfirmPopup(absX, absY, actionOpt, onConfirm) {
    ensureNodeBuildUi();
    if (!nodeConfirmPopup || !actionOpt) return;
    const iconEl = nodeConfirmPopup.querySelector('.nodeBuildConfirmIcon');
    const labelEl = nodeConfirmPopup.querySelector('.nodeBuildConfirmLabel');
    if (iconEl) iconEl.textContent = getBuildActionIcon(actionOpt.kind);
    if (labelEl) labelEl.textContent = (actionOpt.kind === 'upgrade_city') ? 'Upgrade to City?' : 'Build Settlement?';
    const okBtn = nodeConfirmPopup.querySelector('.nodeBuildConfirmOk');
    const cancelBtn = nodeConfirmPopup.querySelector('.nodeBuildConfirmCancel');
    if (okBtn) okBtn.onclick = () => { hideNodeConfirmPopup(); onConfirm && onConfirm(); };
    if (cancelBtn) cancelBtn.onclick = () => hideNodeConfirmPopup();

    try { nodeConfirmPopup.dataset.popupDragged = '0'; } catch (_) {}
    nodeConfirmPopup.classList.remove('hidden');
    nodeConfirmPopup.style.left = `${Math.round(absX + 12)}px`;
    nodeConfirmPopup.style.top = `${Math.round(absY + 12)}px`;
    const r = nodeConfirmPopup.getBoundingClientRect();
    const pad = 10;
    let nx = absX + 12;
    let ny = absY + 12;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, absY - r.height - 12);
    if (ny < pad) ny = pad;
    nodeConfirmPopup.style.left = `${Math.round(nx)}px`;
    nodeConfirmPopup.style.top = `${Math.round(ny)}px`;
  }

  function ensureNodeBuildUi() {
    if (!boardHoverIndicator) {
      boardHoverIndicator = document.createElement('div');
      boardHoverIndicator.className = 'nodeBuildHover hidden';
      boardHoverIndicator.innerHTML = `<div class="nodeBuildHoverIcon">🏠</div><div class="nodeBuildHoverText">Settlement</div>`;
      document.body.appendChild(boardHoverIndicator);
    }
    if (!nodeConfirmPopup) {
      nodeConfirmPopup = document.createElement('div');
      nodeConfirmPopup.className = 'nodeBuildConfirm hidden';
      nodeConfirmPopup.innerHTML = `
        <div class="nodeBuildConfirmIcon">🏠</div>
        <div class="nodeBuildConfirmLabel">Build Settlement?</div>
        <button class="nodeBuildConfirmOk" title="Confirm" aria-label="Confirm">✓</button>
        <button class="nodeBuildConfirmCancel" title="Cancel" aria-label="Cancel">✕</button>
      `;
      document.body.appendChild(nodeConfirmPopup);
      try { makeDraggablePanel(nodeConfirmPopup, nodeConfirmPopup, null); } catch (_) {}
      document.addEventListener('mousedown', (ev) => {
        if (!nodeConfirmPopup || nodeConfirmPopup.classList.contains('hidden')) return;
        if (ev.target === nodeConfirmPopup || nodeConfirmPopup.contains(ev.target)) return;
        hideNodeConfirmPopup();
      });
      window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideNodeConfirmPopup(); });
    }
  }

  function requestBuildOptions(targetKind, targetId) {
    if (!ws || ws.readyState !== 1) return false;
    send({ type: 'query_build_options', targetKind, targetId });
    return true;
  }

  function queryBuildOptions(targetKind, targetId, absX, absY) {
    if (!requestBuildOptions(targetKind, targetId)) return;
    ensureBuildPopup();
    pendingBuildClick = { absX, absY, targetKind, targetId, mode: 'menu' };
  }

  function queryNodeBuildConfirm(nodeId, absX, absY) {
    ensureNodeBuildUi();
    const cached = hoverNodeBuildCache.get(buildCacheKey('node', nodeId));
    const act = getNodeActionOption(cached);
    pendingBuildClick = { absX, absY, targetKind: 'node', targetId: nodeId, mode: 'node_confirm' };
    if (act) {
      pendingBuildClick = null;
      showNodeConfirmPopup(absX, absY, act, () => sendGameAction({ kind: act.kind, nodeId }));
      return;
    }
    requestBuildOptions('node', nodeId);
  }

  function canShowNodeHoverBuild() {
    if (!state || !myPlayerId || state.paused) return false;
    if (state.currentPlayerId !== myPlayerId) return false;
    const phase = String(state.phase || '');
    return (phase === 'main-actions' || phase === 'setup1-settlement' || phase === 'setup2-settlement');
  }

  function canShowEdgeHoverBuild() {
    if (!state || !myPlayerId || state.paused) return false;
    if (state.currentPlayerId !== myPlayerId) return false;
    if (inputMode && inputMode.kind === 'move_ship') return false;
    const phase = String(state.phase || '');
    return (phase === 'main-actions' || phase === 'setup1-road' || phase === 'setup2-road');
  }

  function getEdgeActionOptions(options) {
    const opts = Array.isArray(options) ? options : [];
    return opts.filter(o => o && (o.kind === 'place_road' || o.kind === 'place_ship'));
  }

  function hideEdgeHoverIndicator() {
    if (!edgeHoverIndicator) return;
    edgeHoverIndicator.classList.add('hidden');
  }

  function showEdgeHoverIndicator(absX, absY, actionOpts) {
    ensureEdgeBuildUi();
    if (!edgeHoverIndicator) return;
    const iconsEl = edgeHoverIndicator.querySelector('.edgeBuildHoverIcons');
    const txtEl = edgeHoverIndicator.querySelector('.edgeBuildHoverText');
    const opts = getEdgeActionOptions(actionOpts);
    if (iconsEl) {
      iconsEl.innerHTML = '';
      for (const opt of opts) {
        const s = document.createElement('span');
        s.className = 'nodeBuildHoverIcon';
        s.textContent = getBuildActionIcon(opt.kind);
        iconsEl.appendChild(s);
      }
    }
    if (txtEl) {
      const labels = opts.map(opt => opt.kind === 'place_ship' ? 'Ship' : 'Road');
      txtEl.textContent = labels.length > 1 ? labels.join(' / ') : (labels[0] || 'Build');
    }
    edgeHoverIndicator.classList.remove('hidden');
    const pad = 10;
    edgeHoverIndicator.style.left = `${Math.round(absX + 12)}px`;
    edgeHoverIndicator.style.top = `${Math.round(absY - 12)}px`;
    const r = edgeHoverIndicator.getBoundingClientRect();
    let nx = absX + 12;
    let ny = absY - 12;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, window.innerHeight - r.height - pad);
    if (ny < pad) ny = pad;
    if (nx < pad) nx = pad;
    edgeHoverIndicator.style.left = `${Math.round(nx)}px`;
    edgeHoverIndicator.style.top = `${Math.round(ny)}px`;
  }

  function hideEdgeConfirmPopup() {
    if (!edgeConfirmPopup) return;
    edgeConfirmPopup.classList.add('hidden');
    edgeConfirmPopup.style.display = 'none';
    edgeConfirmPopup.style.left = '-9999px';
    edgeConfirmPopup.style.top = '-9999px';
  }

  function showEdgeConfirmPopup(absX, absY, actionOpts, onPick) {
    ensureEdgeBuildUi();
    if (!edgeConfirmPopup) return;
    const opts = getEdgeActionOptions(actionOpts);
    if (!opts.length) { hideEdgeConfirmPopup(); return; }

    const row = edgeConfirmPopup.querySelector('.edgeBuildConfirmChoices');
    if (row) {
      row.innerHTML = '';
      for (const opt of opts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'edgeBuildConfirmChoice';
        b.style.display = 'inline-flex';
        b.style.alignItems = 'center';
        b.style.gap = '6px';
        b.style.border = '1px solid rgba(255,255,255,.18)';
        b.style.background = 'rgba(255,255,255,.05)';
        b.style.color = 'var(--text)';
        b.style.borderRadius = '10px';
        b.style.padding = '5px 8px';
        b.style.cursor = 'pointer';
        b.style.fontWeight = '700';
        b.title = opt.kind === 'place_ship' ? 'Confirm ship placement' : 'Confirm road placement';
        b.innerHTML = `<span class="edgeBuildConfirmChoiceIcon">${getBuildActionIcon(opt.kind)}</span><span>${opt.kind === 'place_ship' ? 'Ship' : 'Road'}</span>`;
        b.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          hideEdgeConfirmPopup();
          onPick && onPick(opt);
        });
        row.appendChild(b);
      }
    }

    const labelEl = edgeConfirmPopup.querySelector('.edgeBuildConfirmLabel');
    if (labelEl) labelEl.textContent = (opts.length > 1) ? 'Choose build' : `Build ${opts[0].kind === 'place_ship' ? 'Ship' : 'Road'}?`;

    try { edgeConfirmPopup.dataset.popupDragged = '0'; } catch (_) {}
    edgeConfirmPopup.classList.remove('hidden');
    edgeConfirmPopup.style.display = 'grid';
    edgeConfirmPopup.style.left = `${Math.round(absX + 12)}px`;
    edgeConfirmPopup.style.top = `${Math.round(absY + 12)}px`;

    const r = edgeConfirmPopup.getBoundingClientRect();
    const pad = 10;
    let nx = absX + 12;
    let ny = absY + 12;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, absY - r.height - 12);
    if (ny < pad) ny = pad;
    if (nx < pad) nx = pad;
    edgeConfirmPopup.style.left = `${Math.round(nx)}px`;
    edgeConfirmPopup.style.top = `${Math.round(ny)}px`;
  }

  function ensureEdgeBuildUi() {
    if (!edgeHoverIndicator) {
      edgeHoverIndicator = document.createElement('div');
      edgeHoverIndicator.className = 'nodeBuildHover hidden edgeBuildHover';
      edgeHoverIndicator.innerHTML = `<div class="edgeBuildHoverIcons"></div><div class="edgeBuildHoverText">Road / Ship</div>`;
      const icons = edgeHoverIndicator.querySelector('.edgeBuildHoverIcons');
      if (icons) {
        icons.style.display = 'flex';
        icons.style.alignItems = 'center';
        icons.style.gap = '6px';
      }
      document.body.appendChild(edgeHoverIndicator);
    }
    if (!edgeConfirmPopup) {
      edgeConfirmPopup = document.createElement('div');
      edgeConfirmPopup.className = 'hidden edgeBuildConfirm';
      edgeConfirmPopup.style.display = 'none';
      edgeConfirmPopup.style.position = 'fixed';
      edgeConfirmPopup.style.zIndex = '1205';
      edgeConfirmPopup.style.display = 'grid';
      edgeConfirmPopup.style.gridTemplateColumns = '1fr auto';
      edgeConfirmPopup.style.gap = '8px';
      edgeConfirmPopup.style.alignItems = 'center';
      edgeConfirmPopup.style.border = '1px solid rgba(255,255,255,.18)';
      edgeConfirmPopup.style.borderRadius = '14px';
      edgeConfirmPopup.style.background = 'linear-gradient(180deg, rgba(14,19,28,.98), rgba(10,14,20,.96))';
      edgeConfirmPopup.style.color = 'var(--text)';
      edgeConfirmPopup.style.padding = '8px 10px';
      edgeConfirmPopup.style.boxShadow = '0 16px 36px rgba(0,0,0,.42)';
      edgeConfirmPopup.innerHTML = `
        <div style="display:grid; gap:6px;">
          <div class="edgeBuildConfirmLabel" style="font-size:12px;font-weight:800;white-space:nowrap;">Choose build</div>
          <div class="edgeBuildConfirmChoices" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
        </div>
        <button type="button" class="edgeBuildConfirmCancel" title="Cancel placement" aria-label="Cancel placement">✕</button>
      `;
      const cancelBtn = edgeConfirmPopup.querySelector('.edgeBuildConfirmCancel');
      if (cancelBtn) {
        cancelBtn.style.border = '1px solid rgba(255,255,255,.18)';
        cancelBtn.style.background = 'rgba(255,255,255,.04)';
        cancelBtn.style.color = 'var(--text)';
        cancelBtn.style.width = '28px';
        cancelBtn.style.height = '28px';
        cancelBtn.style.borderRadius = '10px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontWeight = '900';
        cancelBtn.style.lineHeight = '1';
        cancelBtn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); hideEdgeConfirmPopup(); });
      }
      document.body.appendChild(edgeConfirmPopup);
      try { makeDraggablePanel(edgeConfirmPopup, edgeConfirmPopup, null); } catch (_) {}
      document.addEventListener('mousedown', (ev) => {
        if (!edgeConfirmPopup || edgeConfirmPopup.classList.contains('hidden')) return;
        if (ev.target === edgeConfirmPopup || edgeConfirmPopup.contains(ev.target)) return;
        hideEdgeConfirmPopup();
      });
      window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideEdgeConfirmPopup(); });
    }
  }

  function queryEdgeBuildConfirm(edgeId, absX, absY) {
    ensureEdgeBuildUi();
    const cached = hoverNodeBuildCache.get(buildCacheKey('edge', edgeId));
    const opts = getEdgeActionOptions(cached);
    pendingBuildClick = { absX, absY, targetKind: 'edge', targetId: edgeId, mode: 'edge_confirm' };
    if (opts && opts.length) {
      pendingBuildClick = null;
      showEdgeConfirmPopup(absX, absY, opts, (opt) => {
        if (!opt || !opt.kind) return;
        sendGameAction({ kind: opt.kind, edgeId });
      });
      return;
    }
    requestBuildOptions('edge', edgeId);
  }

  function updateBoardHoverBuild(e) {
    if (!e || view.dragging || !screenCache) {
      hoverNodeBuild.nodeId = null;
      hoverNodeBuild.actionKind = null;
      hoverEdgeBuild.edgeId = null;
      hoverEdgeBuild.actionKinds = [];
      hideBoardHoverIndicator();
      hideEdgeHoverIndicator();
      return;
    }

    const rect = ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Node hover (settlement / city)
    if (!canShowNodeHoverBuild()) {
      hoverNodeBuild.nodeId = null;
      hoverNodeBuild.actionKind = null;
      hideBoardHoverIndicator();
    } else {
      const nodeId = pickNode(x, y);
      if (nodeId == null) {
        hoverNodeBuild.nodeId = null;
        hoverNodeBuild.actionKind = null;
        hideBoardHoverIndicator();
      } else {
        hoverNodeBuild.nodeId = nodeId;
        hoverNodeBuild.absX = e.clientX;
        hoverNodeBuild.absY = e.clientY;

        const cached = hoverNodeBuildCache.get(buildCacheKey('node', nodeId));
        const act = getNodeActionOption(cached);
        if (act) {
          hoverNodeBuild.actionKind = act.kind;
          showBoardHoverIndicator(e.clientX, e.clientY, act.kind);
        } else {
          hoverNodeBuild.actionKind = null;
          hideBoardHoverIndicator();
          if (!hoverNodeBuildQuery || hoverNodeBuildQuery.targetKind !== 'node' || hoverNodeBuildQuery.targetId !== nodeId) {
            hoverNodeBuildQuery = { targetKind: 'node', targetId: nodeId };
            requestBuildOptions('node', nodeId);
          }
        }
      }
    }

    // Edge hover (road / ship)
    if (!canShowEdgeHoverBuild()) {
      hoverEdgeBuild.edgeId = null;
      hoverEdgeBuild.actionKinds = [];
      hideEdgeHoverIndicator();
      return;
    }

    const edgeId = pickEdge(x, y);
    if (edgeId == null) {
      hoverEdgeBuild.edgeId = null;
      hoverEdgeBuild.actionKinds = [];
      hideEdgeHoverIndicator();
      return;
    }

    hoverEdgeBuild.edgeId = edgeId;
    hoverEdgeBuild.absX = e.clientX;
    hoverEdgeBuild.absY = e.clientY;

    const edgeCached = hoverNodeBuildCache.get(buildCacheKey('edge', edgeId));
    const edgeOpts = getEdgeActionOptions(edgeCached);
    if (edgeOpts.length) {
      hoverEdgeBuild.actionKinds = edgeOpts.map(o => o.kind);
      showEdgeHoverIndicator(e.clientX, e.clientY, edgeOpts);
      return;
    }

    hoverEdgeBuild.actionKinds = [];
    hideEdgeHoverIndicator();
    if (!hoverEdgeBuildQuery || hoverEdgeBuildQuery.targetKind !== 'edge' || hoverEdgeBuildQuery.targetId !== edgeId) {
      hoverEdgeBuildQuery = { targetKind: 'edge', targetId: edgeId };
      requestBuildOptions('edge', edgeId);
    }
  }

  function edgeTouchesPirateClient(edgeId) {
    try {
      if (!state || !state.geom) return false;
      const adj = (state.geom.edgeAdjTiles && state.geom.edgeAdjTiles[edgeId]) || [];
      if (!Array.isArray(adj) || !adj.length) return false;
      for (const tid of adj) {
        const t = state.geom.tiles && state.geom.tiles[tid];
        if (t && t.pirate) return true;
      }
    } catch (_) {}
    return false;
  }

  function hideShipMoveCancelPopup() {
    if (!shipMoveCancelPopup) return;
    shipMoveCancelPopup.classList.add('hidden');
    shipMoveCancelPopup.style.left = '-9999px';
    shipMoveCancelPopup.style.top = '-9999px';
  }

  function hideThiefMoveConfirmPopup() {
    if (!thiefMoveConfirmPopup) return;
    thiefMoveConfirmPopup.classList.add('hidden');
    thiefMoveConfirmPopup.style.display = 'none';
    thiefMoveConfirmPopup.style.left = '-9999px';
    thiefMoveConfirmPopup.style.top = '-9999px';
  }

  function ensureThiefMoveConfirmPopup() {
    if (thiefMoveConfirmPopup) return;
    const el = document.createElement('div');
    el.className = 'hidden thiefMoveConfirmPopup';
    el.style.display = 'none';
    el.style.position = 'fixed';
    el.style.zIndex = '1206';
    el.style.display = 'grid';
    el.style.gridTemplateColumns = '1fr auto';
    el.style.gap = '8px';
    el.style.alignItems = 'center';
    el.style.border = '1px solid rgba(255,255,255,.18)';
    el.style.borderRadius = '14px';
    el.style.background = 'linear-gradient(180deg, rgba(14,19,28,.98), rgba(10,14,20,.96))';
    el.style.color = 'var(--text)';
    el.style.padding = '8px 10px';
    el.style.boxShadow = '0 16px 36px rgba(0,0,0,.42)';
    el.innerHTML = `
      <div style="display:grid; gap:6px;">
        <div class="thiefMoveConfirmLabel" style="font-size:12px;font-weight:800;white-space:nowrap;">Move Robber here?</div>
        <div class="thiefMoveConfirmSub" style="font-size:11px;opacity:.85;">Confirm or cancel</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="thiefMoveConfirmOk" title="Confirm move" aria-label="Confirm move">✓</button>
        <button type="button" class="thiefMoveConfirmCancel" title="Cancel move" aria-label="Cancel move">✕</button>
      </div>
    `;
    for (const sel of ['.thiefMoveConfirmOk', '.thiefMoveConfirmCancel']) {
      const btn = el.querySelector(sel);
      if (!btn) continue;
      btn.style.border = '1px solid rgba(255,255,255,.18)';
      btn.style.background = 'rgba(255,255,255,.04)';
      btn.style.color = 'var(--text)';
      btn.style.width = '28px';
      btn.style.height = '28px';
      btn.style.borderRadius = '10px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = '900';
      btn.style.lineHeight = '1';
    }
    document.body.appendChild(el);
    thiefMoveConfirmPopup = el;
    try { makeDraggablePanel(thiefMoveConfirmPopup, thiefMoveConfirmPopup, null); } catch (_) {}

    document.addEventListener('mousedown', (ev) => {
      if (!thiefMoveConfirmPopup || thiefMoveConfirmPopup.classList.contains('hidden')) return;
      if (ev.target === thiefMoveConfirmPopup || thiefMoveConfirmPopup.contains(ev.target)) return;
      hideThiefMoveConfirmPopup();
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideThiefMoveConfirmPopup();
    });
  }

  function showThiefMoveConfirmPopup(absX, absY, action, onConfirm) {
    ensureThiefMoveConfirmPopup();
    if (!thiefMoveConfirmPopup || !action || !action.kind) return;

    const isPirate = action.kind === 'move_pirate';
    const labelEl = thiefMoveConfirmPopup.querySelector('.thiefMoveConfirmLabel');
    const subEl = thiefMoveConfirmPopup.querySelector('.thiefMoveConfirmSub');
    const okBtn = thiefMoveConfirmPopup.querySelector('.thiefMoveConfirmOk');
    const cancelBtn = thiefMoveConfirmPopup.querySelector('.thiefMoveConfirmCancel');

    if (labelEl) labelEl.textContent = isPirate ? 'Move Pirate here?' : 'Move Robber here?';
    if (subEl) subEl.textContent = `Tile ${action.tileId == null ? '—' : action.tileId}`;
    if (okBtn) okBtn.onclick = (ev) => {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      hideThiefMoveConfirmPopup();
      onConfirm && onConfirm(action);
    };
    if (cancelBtn) cancelBtn.onclick = (ev) => {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      hideThiefMoveConfirmPopup();
    };

    try { thiefMoveConfirmPopup.dataset.popupDragged = '0'; } catch (_) {}
    thiefMoveConfirmPopup.classList.remove('hidden');
    thiefMoveConfirmPopup.style.display = 'grid';
    thiefMoveConfirmPopup.style.left = `${Math.round(absX + 12)}px`;
    thiefMoveConfirmPopup.style.top = `${Math.round(absY + 12)}px`;

    const r = thiefMoveConfirmPopup.getBoundingClientRect();
    const pad = 10;
    let nx = absX + 12;
    let ny = absY + 12;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, absY - r.height - 12);
    if (ny < pad) ny = pad;
    if (nx < pad) nx = pad;
    thiefMoveConfirmPopup.style.left = `${Math.round(nx)}px`;
    thiefMoveConfirmPopup.style.top = `${Math.round(ny)}px`;
  }

  function promptThiefMoveConfirm(action, absX, absY) {
    if (!action || !action.kind || action.tileId == null) return;
    showThiefMoveConfirmPopup(absX, absY, action, (finalAction) => {
      sendGameAction(finalAction);
    });
  }

  function clearShipMoveSelection(opts = {}) {
    inputMode.moveShipFrom = null;
    inputMode.moveShipTargets = [];
    inputMode.moveShipTargetsLoading = false;
    hideShipMoveCancelPopup();
    if (opts.keepMode) setMode('move_ship');
    else if (inputMode.kind === 'move_ship') setMode('move_ship');
  }

  function ensureShipMoveCancelPopup() {
    if (shipMoveCancelPopup) return;
    const el = document.createElement('div');
    el.className = 'shipMoveCancelPopup hidden';
    el.style.position = 'fixed';
    el.style.zIndex = '1200';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.padding = '6px 8px';
    el.style.borderRadius = '10px';
    el.style.border = '1px solid rgba(255,255,255,.2)';
    el.style.background = 'rgba(10,14,20,.94)';
    el.style.boxShadow = '0 10px 24px rgba(0,0,0,.35)';
    el.style.color = '#eef3ff';
    el.style.font = '600 12px/1.2 system-ui, sans-serif';
    el.style.userSelect = 'none';
    el.innerHTML = `
      <span class="shipMoveCancelIcon" aria-hidden="true">⛵</span>
      <span class="shipMoveCancelLabel">Ship selected</span>
      <button type="button" class="shipMoveCancelBtn" title="Cancel ship move">✕</button>
    `;
    const btn = el.querySelector('.shipMoveCancelBtn');
    if (btn) {
      btn.style.border = '1px solid rgba(255,255,255,.18)';
      btn.style.background = 'rgba(255,255,255,.06)';
      btn.style.color = '#fff';
      btn.style.borderRadius = '8px';
      btn.style.padding = '2px 8px';
      btn.style.cursor = 'pointer';
      btn.style.font = '700 12px/1 system-ui, sans-serif';
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        clearShipMoveSelection({ keepMode: true });
        render();
      });
    }
    document.body.appendChild(el);
    shipMoveCancelPopup = el;
    try { makeDraggablePanel(shipMoveCancelPopup, shipMoveCancelPopup, null); } catch (_) {}

    document.addEventListener('mousedown', (ev) => {
      if (!shipMoveCancelPopup || shipMoveCancelPopup.classList.contains('hidden')) return;
      if (ev.target === shipMoveCancelPopup || shipMoveCancelPopup.contains(ev.target)) return;
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if (!(inputMode && inputMode.kind === 'move_ship' && inputMode.moveShipFrom != null)) return;
      clearShipMoveSelection({ keepMode: true });
      render();
    });
  }

  function updateShipMoveCancelPopupPosition() {
    if (!(inputMode && inputMode.kind === 'move_ship' && inputMode.moveShipFrom != null && state && state.geom)) {
      hideShipMoveCancelPopup();
      return;
    }
    const e = state.geom.edges?.[inputMode.moveShipFrom];
    if (!e) { hideShipMoveCancelPopup(); return; }
    const a = state.geom.nodes?.[e.a];
    const b = state.geom.nodes?.[e.b];
    if (!a || !b) { hideShipMoveCancelPopup(); return; }

    ensureShipMoveCancelPopup();
    if (!shipMoveCancelPopup) return;

    const as = worldToScreen({ x: a.x, y: a.y });
    const bs = worldToScreen({ x: b.x, y: b.y });
    let x = (as.x + bs.x) / 2 + 14;
    let y = (as.y + bs.y) / 2 - 14;

    const hidden = shipMoveCancelPopup.classList.contains('hidden');
    const dragged = shipMoveCancelPopup.dataset && shipMoveCancelPopup.dataset.popupDragged === '1';
    shipMoveCancelPopup.classList.remove('hidden');

    if (hidden || !dragged) {
      shipMoveCancelPopup.style.left = `${Math.round(x)}px`;
      shipMoveCancelPopup.style.top = `${Math.round(y)}px`;
    }

    const r = shipMoveCancelPopup.getBoundingClientRect();
    const pad = 10;
    let nx = parseFloat(shipMoveCancelPopup.style.left) || x;
    let ny = parseFloat(shipMoveCancelPopup.style.top) || y;
    if (r.right > window.innerWidth - pad) nx = Math.max(pad, window.innerWidth - r.width - pad);
    if (r.bottom > window.innerHeight - pad) ny = Math.max(pad, window.innerHeight - r.height - pad);
    if (ny < pad) ny = pad;
    if (nx < pad) nx = pad;
    shipMoveCancelPopup.style.left = `${Math.round(nx)}px`;
    shipMoveCancelPopup.style.top = `${Math.round(ny)}px`;
  }

  function requestShipMoveTargets(fromEdgeId) {
    if (!ws || ws.readyState !== 1) return;
    inputMode.moveShipTargetsLoading = true;
    inputMode.moveShipTargets = [];
    send({ type: 'query_ship_move_targets', fromEdgeId });
  }

  function selectShipForMove(edgeId) {
    try {
      const used = state && state.shipMoveUsed && state.shipMoveUsed[myPlayerId] === state.turnNumber;
      if (used) { setError('You have already moved a ship this turn.'); return; }
    } catch (_) {}
    if (edgeTouchesPirateClient(edgeId)) {
      setError('The pirate blocks moving that ship.');
      return;
    }
    inputMode.kind = 'move_ship';
    inputMode.moveShipFrom = edgeId;
    inputMode.moveShipTargets = [];
    inputMode.moveShipTargetsLoading = false;
    setMode('move_ship');
    requestShipMoveTargets(edgeId);
    try { if (shipMoveCancelPopup) shipMoveCancelPopup.dataset.popupDragged = '0'; } catch (_) {}
    updateShipMoveCancelPopupPosition();
    render();
  }

  ui.pauseBtn.addEventListener('click', () => {
    if (!room || room.hostId !== myPlayerId) return;
    const desired = !(state && state.paused);
    send({ type: 'pause_game', paused: desired });
  });



// History / Leaderboard overlay controls
if (ui.historyBtn) ui.historyBtn.addEventListener('click', () => openHistoryOverlay('games'));
if (ui.leaderboardBtn) ui.leaderboardBtn.addEventListener('click', () => openHistoryOverlay('players'));

if (ui.historyCloseBtn) ui.historyCloseBtn.addEventListener('click', () => closeHistoryOverlay());
if (ui.historyRefreshBtn) ui.historyRefreshBtn.addEventListener('click', () => {
  historyState.loadingGames = true;
  historyState.loadingBoard = true;
  renderHistory();
  requestHistoryData();
});

if (ui.historyTabs) {
  ui.historyTabs.addEventListener('click', (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('.hTab') : null;
    if (!btn) return;
    historyState.tab = btn.dataset.tab || 'games';
    renderHistory();
  });
}

// Post-game overlay controls
if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.addEventListener('click', () => {
  if (postgameState.historyMode) {
    closePostgameSnapshot();
    return;
  }
  // After a victory, "Main Menu" acts as a rematch button:
  // it creates a new lobby with the same players and host, and moves everyone into it.
  try {
    if (ws && ws.readyState === 1) {
      ui.pgMainMenuBtn.disabled = true;
      ui.pgMainMenuBtn.textContent = 'Starting...';
      send({ type: 'rematch_room' });
      // If something goes wrong, the server will send an error and UI will re-enable below.
      return;
    }
  } catch (_) {}

  // Fallback: Back to lobby, but default to a NEW lobby so we don't auto-rejoin a finished game.
  try { sessionStorage.setItem(AUTO_CREATE_ROOM_KEY, '1'); } catch (_) {}
  try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
  location.reload();
});

if (ui.pgHideBtn) ui.pgHideBtn.addEventListener('click', () => {
  if (postgameState.historyMode) {
    closePostgameSnapshot();
    return;
  }
  // hide overlay to view the final board
  setPostgameHidden(true);
});

if (ui.pgShowBtn) ui.pgShowBtn.addEventListener('click', () => {
  const st = postgameState.snapshot || state;
  if (!st || st.phase !== 'game-over') return;
  setPostgameHidden(false);
  // if panel isn't visible yet (still in splash), force the panel visible
  setPostgamePanelVisible(true);
  refreshPostgameHeader();
  renderPostgameTab(postgameState.tab || 'summary');
});

if (ui.postgameTabs) {
  ui.postgameTabs.addEventListener('click', (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest('.pgTab') : null;
    if (!b) return;
    const tab = String(b.dataset.tab || 'summary');
    renderPostgameTab(tab);
  });
}

  ui.rollBtn.addEventListener('click', () => sendGameAction({ kind: 'roll_dice' }));
  ui.endBtn.addEventListener('click', () => {
    stopEndTurnWarnAudio();
    clearEndTurnWarn();
    sendGameAction({ kind: 'end_turn' });
  });

  if (ui.rollDockBtn) ui.rollDockBtn.addEventListener('click', () => sendGameAction({ kind: 'roll_dice' }));
  if (ui.endDockBtn) ui.endDockBtn.addEventListener('click', () => {
    stopEndTurnWarnAudio();
    clearEndTurnWarn();
    sendGameAction({ kind: 'end_turn' });
  });

  ui.buildRoadBtn.addEventListener('click', () => setMode('place_road'));
  ui.buildShipBtn.addEventListener('click', () => setMode('place_ship'));
  if (ui.moveShipBtn) ui.moveShipBtn.addEventListener('click', () => {
    if (inputMode.kind === 'move_ship') setMode(null);
    else setMode('move_ship');
  });
  ui.buildSettlementBtn.addEventListener('click', () => setMode('place_settlement'));
  ui.buildCityBtn.addEventListener('click', () => setMode('upgrade_city'));
  ui.buyDevBtn.addEventListener('click', () => sendGameAction({ kind: 'buy_dev_card' }));
  if (ui.bankTradeBtn) ui.bankTradeBtn.addEventListener('click', () => openBankTradeModal());
  if (ui.playerTradeBtn) ui.playerTradeBtn.addEventListener('click', () => openPlayerTradeModal());

  function canAffordClient(res, cost) {
    for (const k of Object.keys(cost)) if ((res?.[k] || 0) < cost[k]) return false;
    return true;
  }

  function myPlayer() {
    if (!state || !myPlayerId) return null;
    return (state.players || []).find(p => p.id === myPlayerId) || null;
  }

  // Interaction hit-testing cache (screen-space)
  let screenCache = null;


function serverNowMs() { return Date.now() + (serverTimeOffsetMs || 0); }

function timerSecondsLeft() {
  if (state && state.paused && state.pause && typeof state.pause.remainingMs === 'number') {
    return Math.max(0, Number(state.pause.remainingMs) / 1000);
  }
  if (state && state.timerHold && typeof state.timerHold.remainingMs === 'number') {
    return Math.max(0, Number(state.timerHold.remainingMs) / 1000);
  }
  const t = state && state.timer;
  if (!t || !t.endsAt) return null;
  const left = (Number(t.endsAt) - serverNowMs()) / 1000;
  return Math.max(0, left);
}

function formatClock(secs) {
  if (secs == null || !Number.isFinite(secs)) return '--:--';
  const s = Math.max(0, Math.ceil(secs));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function updateTimerInfo() {
  if (!ui.timerInfo) return;
  const t = state && state.timer;
  if (!t || !t.endsAt || !state || state.phase === 'lobby') {
    ui.timerInfo.classList.add('hidden');
    ui.timerInfo.textContent = '—';
    if (ui.countdownClock) ui.countdownClock.classList.add('hidden');
    if (ui.pausedOverlay) ui.pausedOverlay.classList.add('hidden');
    return;
  }
  const phaseKey = String((state && state.phase) || '');
  const phaseLabel = (phaseKey === 'production-gold') ? 'gold choice' : phaseKey;
  const left = timerSecondsLeft();
  const sec = left == null ? '—' : String(Math.ceil(left));
  ui.timerInfo.classList.remove('hidden');
  const timerHeld = !!(state && state.timerHold && typeof state.timerHold.remainingMs === 'number');
  ui.timerInfo.textContent = `${(state.paused || timerHeld) ? '⏸' : '⏱'} ${sec}s · ${phaseLabel}`;

  // Right-side clock (all players)
  if (ui.countdownClock) {
    ui.countdownClock.classList.remove('hidden');
    const timeEl = ui.countdownClock.querySelector('.clockTime');
    const metaEl = ui.countdownClock.querySelector('.clockMeta');
    if (timeEl) timeEl.textContent = formatClock(left);
    const timedPlayerId = (phaseKey === 'production-gold' && state && state.special && state.special.kind === 'production_gold' && state.special.forPlayerId)
      ? state.special.forPlayerId
      : state.currentPlayerId;
    const who = (state.players || []).find(p => p.id === timedPlayerId)?.name || '—';
    let pairTag = '';
    try {
      const mm = String((state && state.rules && state.rules.mapMode) || '').toLowerCase();
      const is56 = (mm === 'classic56' || mm === 'classic_5_6' || mm === 'classic-5-6' || mm === 'classic5_6' || mm === 'classic5-6');
      if (is56 && state && state.paired && state.paired.stage && phaseKey === 'main-actions') {
        pairTag = ` · ${state.paired.stage === 'p2' ? 'P2' : 'P1'}`;
      }
    } catch (_) {}
    const timerHeld = !!(state && state.timerHold && typeof state.timerHold.remainingMs === 'number');
    const timerStatus = state.paused
      ? 'Paused'
      : (timerHeld ? 'Trade paused' : (phaseKey === 'production-gold' ? 'Gold choice' : 'Turn'));
    const meta = `${timerStatus}: ${who}${pairTag} · ${phaseLabel}`;
    if (metaEl) metaEl.textContent = meta;
  }

  if (ui.pausedOverlay) ui.pausedOverlay.classList.toggle('hidden', !state.paused);
}

function ensureTimerUiInterval() {
  if (timerUiInterval) return;
  // Update once per second so the countdown is always readable and stable.
  timerUiInterval = setInterval(() => {
    updateTimerInfo();
    // Robustness: if an end-game vote is active and its prompt was deferred/missed,
    // keep retrying so every player reliably sees it.
    try { handleEndGameVotePrompt(); } catch (_) {}
  }, 1000);
  // Run immediately so you don't wait up to 1s after joining.
  updateTimerInfo();
}

  function updateButtons() {
    const phaseNow = currentRoomPhase();
    const inGame = !!state && state.phase !== 'lobby';
    const amSpectator = inGame && amRoomSpectator();

    // Hide in-game HUD cards during lobby.
    if (ui.turnCard) ui.turnCard.classList.toggle('hidden', !inGame);
    if (ui.devCard) ui.devCard.classList.toggle('hidden', !inGame);
    if (ui.resourcesCard) ui.resourcesCard.classList.toggle('hidden', !inGame);
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame || !logPanelOpen);
    const myTurn = inGame && !amSpectator && state.currentPlayerId === myPlayerId;

    // Global page state + HUD docking.
    try { document.body.classList.toggle('in-game', inGame); } catch (_) {}
    dockHudToBoard(inGame);
    syncRightSidebarDock(inGame);

    // IMPORTANT: the board layout (and thus the canvas CSS pixel size) changes when the
    // game transitions into the in-game full-page view. If we don't resync the canvas
    // backing store + transform at that moment, clicks can miss until a manual window
    // resize occurs (people end up hitting F12 / triggering a resize to "fix" it).
    try {
      const r = ui.canvas.getBoundingClientRect();
      const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (key && key !== lastCanvasSizeKey) {
        lastCanvasSizeKey = key;
        resizeCanvas();
      }
    } catch (_) {}

    // Host pause/resume (available during any player's turn)
    const isHostNow = !!(room && myPlayerId && room.hostId === myPlayerId);
    if (ui.pauseBtn) {
      ui.pauseBtn.classList.toggle('hidden', !(inGame && isHostNow));
      ui.pauseBtn.textContent = (state && state.paused) ? 'Resume' : 'Pause';
    }

    // Host-only room ID helper
    if (ui.idsBtn) {
      ui.idsBtn.classList.toggle('hidden', !isHostNow);
      ui.idsBtn.disabled = !isHostNow;
    }

    // Local per-player audio + colorblind toggles (client-only)
    if (ui.audioBtn) {
      ui.audioBtn.classList.toggle('hidden', !inGame);
      ui.audioBtn.disabled = !inGame;
      if (!inGame) setAudioPanelVisible(false);
    }
    if (ui.colorblindBtn) {
      ui.colorblindBtn.classList.toggle('hidden', !inGame);
      ui.colorblindBtn.disabled = !inGame;
    }
    if (ui.leaveGameBtn) {
      const canUseLeaveGame = !!(myPlayerId && room && room.hostId !== myPlayerId && phaseNow !== 'lobby');
      ui.leaveGameBtn.classList.toggle('hidden', !canUseLeaveGame);
      ui.leaveGameBtn.disabled = !canUseLeaveGame;
    }

    // Host-only end-game vote
    if (ui.endGameVoteBtn) {
      ui.endGameVoteBtn.classList.toggle('hidden', !(inGame && isHostNow));
      ui.endGameVoteBtn.disabled = !(inGame && isHostNow) || !!(state && state.endVote && state.endVote.id);
    }

    const paused = inGame && !!(state && state.paused);

    if (paused) {
      ui.rollBtn.disabled = true;
      ui.endBtn.disabled = true;
      if (ui.rollDockBtn) ui.rollDockBtn.disabled = true;
      if (ui.endDockBtn) ui.endDockBtn.disabled = true;
      if (ui.rollDock) ui.rollDock.classList.add('hidden');
      ui.buildRoadBtn.disabled = true;
      ui.buildShipBtn.disabled = true;
      if (ui.moveShipBtn) ui.moveShipBtn.disabled = true;
      ui.buildSettlementBtn.disabled = true;
      ui.buildCityBtn.disabled = true;
      if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = true;
      if (ui.playerTradeBtn) ui.playerTradeBtn.disabled = true;
      ui.buyDevBtn.disabled = true;
      setMode(null);
      // still render resources + dev hand (view-only)
      if (!inGame) {
        ui.turnInfo.textContent = room
        ? (amRoomSpectator() ? 'In lobby as a spectator.' : 'In lobby. Host can start when ready.')
        : 'Create or join a lobby.';
        ui.resourcesBox.textContent = '—';
        ui.devHand.textContent = '—';
        return;
      }
      ui.turnInfo.textContent = amSpectator
        ? (state.message ? `Spectating · ${state.message}` : 'Spectating this room.')
        : (state.message || '—');
      renderResources();
      renderDevCards();
      if (ui.devRemaining) {
        const n = (state && typeof state.devDeckCount === 'number') ? state.devDeckCount : null;
        ui.devRemaining.textContent = `Dev deck: ${n == null ? '—' : String(n)}`;
      }
      updateTimerInfo();
      return;
    }

    ui.rollBtn.disabled = !(myTurn && state.phase === 'main-await-roll');
    ui.endBtn.disabled = !(myTurn && state.phase === 'main-actions');

    // Duplicate quick-turn buttons (bottom dock)
    if (ui.rollDockBtn) ui.rollDockBtn.disabled = ui.rollBtn.disabled;
    if (ui.endDockBtn) ui.endDockBtn.disabled = ui.endBtn.disabled;
    if (ui.rollDock) {
      const showDock = !!(myTurn && state.phase === 'main-await-roll');
      ui.rollDock.classList.toggle('hidden', !showDock);
    }

    const setupSettlement = myTurn && (state.phase === 'setup1-settlement' || state.phase === 'setup2-settlement');
    const setupRoad = myTurn && (state.phase === 'setup1-road' || state.phase === 'setup2-road');
	    const thiefPick = myTurn && state.phase === 'pirate-or-robber';
    const robber = myTurn && state.phase === 'robber-move';
    const pirateMove = myTurn && state.phase === 'pirate-move';
    const seafarers = ((state && state.rules && state.rules.mapMode) || (room && room.rules && room.rules.mapMode) || 'classic') === 'seafarers';

    const awaiting = state.setup && state.setup.awaiting;
    const awaitingMine = !!(awaiting && awaiting.playerId === myPlayerId);

    // building buttons (main actions, plus initial setup road/ship selection)
    ui.buildRoadBtn.disabled = !((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine));
    if (ui.buildShipBtn) {
      ui.buildShipBtn.classList.add('hidden');
      ui.buildShipBtn.disabled = !(seafarers && ((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine)));
    }
if (ui.moveShipBtn) {
  ui.moveShipBtn.classList.add('hidden');
  // Once per turn, any time during your turn (including before rolling).
  let enabled = (seafarers && myTurn && (state.phase === 'main-actions' || state.phase === 'main-await-roll'));
  if (enabled) {
    const used = state.shipMoveUsed && state.shipMoveUsed[myPlayerId] === state.turnNumber;
    enabled = !used;
  }
  ui.moveShipBtn.disabled = !enabled;
}
    ui.buildSettlementBtn.disabled = !(myTurn && state.phase === 'main-actions');
    ui.buildCityBtn.disabled = !(myTurn && state.phase === 'main-actions');

    // Trading
    const mmTrade = String(((state && state.rules && state.rules.mapMode) || (room && room.rules && room.rules.mapMode) || 'classic')).toLowerCase();
    const isClassic56Trade = (mmTrade === 'classic56' || mmTrade === 'classic_5_6' || mmTrade === 'classic-5-6' || mmTrade === 'classic5_6' || mmTrade === 'classic5-6');
    const p2Stage = !!(isClassic56Trade && state && state.paired && state.paired.stage === 'p2');
    if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = !(myTurn && state.phase === 'main-actions');
    if (ui.playerTradeBtn) ui.playerTradeBtn.disabled = !(myTurn && state.phase === 'main-actions') || (myTurn && p2Stage);

    // Dev cards
    const me = myPlayer();
    const devCost = { wool: 1, grain: 1, ore: 1 };
    const deckOk = (state.devDeckCount ?? 0) > 0;
    ui.buyDevBtn.disabled = !(myTurn && state.phase === 'main-actions' && deckOk && me && canAffordClient(me.resources, devCost));

    // setup/robber uses click mode implicitly
    if (setupSettlement) {
      setMode('place_settlement');
    } else if (setupRoad) {
      // default to road, but allow the player to pick ship (Seafarers) during setup if coastal
      const k = inputMode && inputMode.kind;
      if (!(k === 'place_road' || k === 'place_ship')) setMode('place_road');
	    } else if (thiefPick) {
	      setMode('move_thief');
	    } else if (robber) {
      setMode('move_robber');
    } else if (pirateMove) {
      setMode('move_pirate');
    } else {
      setMode(null);
    }

    // Turn info + resources
    if (!inGame) {
      ui.turnInfo.textContent = room
        ? (amRoomSpectator() ? 'In lobby as a spectator.' : 'In lobby. Host can start when ready.')
        : 'Create or join a lobby.';
      ui.resourcesBox.textContent = '—';
      ui.devHand.textContent = '—';
      if (ui.devRemaining) ui.devRemaining.textContent = 'Dev deck: —';
      return;
    }
    ui.turnInfo.textContent = amSpectator
      ? (state.message ? `Spectating · ${state.message}` : 'Spectating this room.')
      : (state.message || '—');
    renderResources();
    renderDevCards();
    if (ui.devRemaining) {
      const n = (state && typeof state.devDeckCount === 'number') ? state.devDeckCount : null;
      ui.devRemaining.textContent = `Dev deck: ${n == null ? '—' : String(n)}`;
    }
    updateTimerInfo();
  }

  function renderResources() {
    if (!state) return;
    const summaryBox = ui.resourcesBox;
    const sideBox = ui.rightSidebarResourcesBody;
    if (summaryBox) summaryBox.innerHTML = '';
    if (sideBox) sideBox.innerHTML = '';

    const seafarers = ((state && state.rules && state.rules.mapMode) || 'classic') === 'seafarers';

    const RES_KEYS = ['brick','lumber','wool','grain','ore'];
    function resIconSrc(k) {
      return getTextureAssetUrl(`Ports/${k}.png`);
    }

    function makeResCell(k, v) {
      const cell = document.createElement('div');
      cell.className = 'resCell';
      const img = document.createElement('img');
      img.className = 'resIcon';
      img.src = resIconSrc(k);
      img.alt = k;
      img.draggable = false;
      const val = document.createElement('span');
      val.className = 'resVal';
      val.textContent = String(v ?? 0);
      cell.appendChild(val);
      cell.appendChild(img);
      return cell;
    }

    function pieceCounts(pid) {
      const edges = state?.geom?.edges || [];
      const nodes = state?.geom?.nodes || [];
      let roadsPlaced = 0;
      let shipsPlaced = 0;
      for (const e of edges) {
        if (!e) continue;
        if (e.roadOwner === pid) roadsPlaced++;
        if (e.shipOwner === pid) shipsPlaced++;
      }
      let settlementsPlaced = 0;
      let citiesPlaced = 0;
      for (const n of nodes) {
        const b = n && n.building;
        if (!b || b.owner !== pid) continue;
        if (b.type === 'settlement') settlementsPlaced++;
        if (b.type === 'city') citiesPlaced++;
      }
      const TOTAL = { roads: 15, ships: 15, settlements: 5, cities: 4 };
      return {
        roadsLeft: Math.max(0, TOTAL.roads - roadsPlaced),
        shipsLeft: Math.max(0, TOTAL.ships - shipsPlaced),
        settlementsLeft: Math.max(0, TOTAL.settlements - settlementsPlaced),
        citiesLeft: Math.max(0, TOTAL.cities - citiesPlaced),
      };
    }

    function sortedPlayers() {
      const arr = Array.isArray(state.players) ? [...state.players] : [];
      const order = Array.isArray(state.turnOrder) ? state.turnOrder : [];
      if (!order.length) return arr;
      const rank = new Map(order.map((pid, i) => [pid, i]));
      arr.sort((a, b) => {
        const ra = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''));
      });
      return arr;
    }

    function makePieceCellForColor(color, kind, count) {
      const cell = document.createElement('div');
      cell.className = 'pieceCell';

      const left = document.createElement('div');
      left.className = 'pieceLeft';

      const icon = document.createElement('div');
      icon.className = 'pieceIcon';
      const colIdx = playerColorIndex(color);
      const src = resolveLegacyTextureUrl(STRUCT_IMG_SRC[colIdx] || STRUCT_IMG_SRC[0]);
      icon.style.backgroundImage = `url('${src}')`;
      icon.style.backgroundSize = '200% 200%';
      const pos = tokenBgPosPct(kind);
      icon.style.backgroundPosition = `${pos.x}% ${pos.y}%`;

      const val = document.createElement('span');
      val.className = 'pieceVal';
      val.textContent = String(count);

      left.appendChild(val);
      left.appendChild(icon);
      cell.appendChild(left);
      return cell;
    }

    const playersForResources = sortedPlayers();

    if (summaryBox) {
      for (const p of playersForResources) {
        const row = document.createElement('div');
        row.className = 'resSummaryRow';
        if (p.id === state.currentPlayerId) row.classList.add('turnActive');

        const main = document.createElement('div');
        main.className = 'resSummaryMain';

        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.style.background = p.color;
        main.appendChild(badge);
        if (colorblindMode) {
          try {
            const shapeBadge = createColorblindShapeBadge(p.color, 14);
            shapeBadge.style.flexShrink = '0';
            main.appendChild(shapeBadge);
          } catch (_) {}
        }

        const name = document.createElement('div');
        name.className = 'resSummaryName';
        name.textContent = p.name + (p.id === myPlayerId ? ' (you)' : '');
        main.appendChild(name);

        const stats = document.createElement('div');
        stats.className = 'resSummaryStats';

        const handCount = (p.id === myPlayerId && p.resources)
          ? RES_KEYS.reduce((sum, k) => sum + Number(p.resources?.[k] || 0), 0)
          : Number(p.handCount || 0);
        const devCount = (p.id === myPlayerId && Array.isArray(p.devCards))
          ? p.devCards.length
          : Number(p.devCount || 0);

        function stat(label, value) {
          const el = document.createElement('span');
          el.className = 'resSummaryStat';
          el.textContent = `${label}: ${value}`;
          return el;
        }

        stats.appendChild(stat('CARDS', handCount));
        stats.appendChild(stat('DEV', devCount));
        stats.appendChild(stat('KP', Math.max(0, Number(p.army || 0))));

        const road = document.createElement('span');
        road.className = 'resSummaryStat resSummaryRoad';
        const sw = document.createElement('span');
        sw.className = 'resSummaryRoadSwatch';
        sw.style.background = p.color || '#7aa2ff';
        const rv = document.createElement('span');
        rv.textContent = String(Math.max(0, Number(p.longestRoadLen || 0)));
        road.appendChild(sw);
        road.appendChild(rv);
        stats.appendChild(road);

        const vp = document.createElement('span');
        vp.className = 'resSummaryStat resSummaryVp';
        vp.textContent = `VP ${Number(p.vp || 0)}`;
        const badges = [];
        if (state && state.largestArmy && state.largestArmy.playerId === p.id) badges.push('LA');
        if (state && state.longestRoad && state.longestRoad.playerId === p.id) badges.push('LR');
        if (badges.length) {
          const extra = document.createElement('span');
          extra.className = 'resSummaryBadges';
          extra.textContent = badges.join(' • ');
          vp.appendChild(extra);
        }
        stats.appendChild(vp);

        main.appendChild(stats);
        row.appendChild(main);
        summaryBox.appendChild(row);
      }
    }

    if (!sideBox) return;

    const bankTitle = document.createElement('div');
    bankTitle.className = 'rightSidebarBankTitle';
    bankTitle.textContent = 'Bank Resources';
    sideBox.appendChild(bankTitle);

    const bankStrip = document.createElement('div');
    bankStrip.className = 'rightSidebarResStrip';
    for (const k of RES_KEYS) bankStrip.appendChild(makeResCell(k, (state.bank && state.bank[k]) ?? 0));
    sideBox.appendChild(bankStrip);

    sideBox.appendChild(document.createElement('div')).className = 'rightSidebarSeparator';

    const me = myPlayer();
    if (!me || !me.resources) {
      const note = document.createElement('div');
      note.className = 'rightSidebarNote';
      note.textContent = 'Spectating — private hand details stay hidden.';
      sideBox.appendChild(note);
      return;
    }

    const myHandCount = RES_KEYS.reduce((sum, k) => sum + Number(me.resources?.[k] || 0), 0);
    const meta = document.createElement('div');
    meta.className = 'rightSidebarMeta';
    meta.innerHTML = `
      <span class="rightSidebarMetaStrong">CARDS: ${myHandCount}</span>
      <span>DEV: ${Array.isArray(me.devCards) ? me.devCards.length : Number(me.devCount || 0)}</span>
      <span>LR: ${Math.max(0, Number(me.longestRoadLen || 0))}</span>
      <span>KP: ${Math.max(0, Number(me.army || 0))}</span>
      <span>VP: ${Number(me.vp || 0)}</span>
    `;
    sideBox.appendChild(meta);

    const myResStrip = document.createElement('div');
    myResStrip.className = 'rightSidebarResStrip';
    for (const k of RES_KEYS) myResStrip.appendChild(makeResCell(k, me.resources?.[k] ?? 0));
    sideBox.appendChild(myResStrip);

    const pc = pieceCounts(me.id);
    const pieceStrip = document.createElement('div');
    pieceStrip.className = 'rightSidebarPieceStrip';
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'road', pc.roadsLeft));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'ship', seafarers ? pc.shipsLeft : '--'));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'settlement', pc.settlementsLeft));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'city', pc.citiesLeft));
    sideBox.appendChild(pieceStrip);

    const cost = document.createElement('div');
    cost.className = 'rightSidebarNote';
    cost.textContent = 'Costs: Road (brick+lumber), Ship (lumber+wool), Settlement (brick+lumber+wool+grain), City (2 grain + 3 ore).';
    sideBox.appendChild(cost);
  }

  function renderDevCards() {
    if (!state) return;
    const me = myPlayer();
    const box = ui.devHand;
    box.innerHTML = '';

    if (!me) {
      box.textContent = '—';
      return;
    }

    const hand = Array.isArray(me.devCards) ? me.devCards : [];
    if (hand.length === 0) {
      box.textContent = 'No development cards.';
      return;
    }

    const myTurn = state.currentPlayerId === myPlayerId;
    const actionPhase = myTurn && state.phase === 'main-actions';
    const awaitRollPhase = myTurn && state.phase === 'main-await-roll';
    const preRollPlayable = new Set(['knight','road_building','invention','monopoly','victory_point']);

    for (const card of hand) {
      const row = document.createElement('div');
      row.className = 'devRow';

      const left = document.createElement('div');
      left.className = 'devLeft';

      const thumb = document.createElement('img');
      thumb.className = 'devThumb';
      setTextureImageElementSrc(thumb, DEV_IMG[card.type] || '');
      thumb.alt = prettyCardName(card.type);

      const text = document.createElement('div');
      text.style.minWidth = '0';
      const name = document.createElement('div');
      name.className = 'devName';
      name.textContent = prettyCardName(card.type);
      const meta = document.createElement('div');
      meta.className = 'devMeta';

      const isVP = card.type === 'victory_point';
      const isNew = (card.boughtTurn === state.turnNumber);
      const alreadyPlayedThisTurn = (me.devPlayedTurn === state.turnNumber);
      const blockedByNew = (!isVP && isNew);
      const blockedByLimit = (!isVP && alreadyPlayedThisTurn);
      const canPlayNonVP = actionPhase || (awaitRollPhase && preRollPlayable.has(card.type));
      const playable = !card.played && ((isVP && myTurn) || (!isVP && myTurn && canPlayNonVP && !blockedByNew && !blockedByLimit));

      if (card.played) meta.textContent = 'Used.';
      else if (isVP) meta.textContent = 'Playable any time on your turn.';
      else if (!myTurn) meta.textContent = 'Wait for your turn.';
      else if (blockedByNew) meta.textContent = 'New (can’t play this turn).';
      else if (blockedByLimit) meta.textContent = 'Already played a dev card this turn.';
      else if (awaitRollPhase) meta.textContent = preRollPlayable.has(card.type) ? 'Playable before rolling.' : 'Roll first.';
      else if (!actionPhase) meta.textContent = 'Not playable right now.';
      else meta.textContent = 'Ready.';

      text.appendChild(name);
      text.appendChild(meta);
      left.appendChild(thumb);
      left.appendChild(text);

      const right = document.createElement('div');
      right.className = 'devRight';
      if (card.played) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = 'played';
        right.appendChild(t);
      } else {
        const play = document.createElement('button');
        play.className = 'btn' + (playable ? ' primary' : '');
        play.textContent = 'Play';
        play.disabled = !playable;
        play.addEventListener('click', () => playDevCard(card));
        right.appendChild(play);
      }

      row.appendChild(left);
      row.appendChild(right);
      box.appendChild(row);
    }
  }

  // -------------------- Trading UI --------------------

  let lastTradePromptIdSeen = 0;
  let lastEndVotePromptIdSeen = 0;
  let pendingEndVotePromptId = 0;
  // When the trade proposer hits "Revise Trade" from the proposed-trade popup,
  // we keep track of which trade is being replaced so the server can atomically
  // close the old offer and broadcast the updated one.
  let revisingTradeId = null;

  function playerHasPortClient(pid, port) {
    const nodes = state?.geom?.nodes || [];
    for (const nid of (port.nodeIds || [])) {
      const b = nodes[nid]?.building;
      if (b && b.owner === pid) return true;
    }
    return false;
  }

  function portsForPlayer(pid) {
    const ports = state?.geom?.ports || [];
    return ports.filter(p => playerHasPortClient(pid, p));
  }

  function tradeRatioForClient(giveKind) {
    let ratio = 4;
    for (const p of portsForPlayer(myPlayerId)) {
      if (p.kind === 'generic') ratio = Math.min(ratio, 3);
      if (p.kind === giveKind) ratio = Math.min(ratio, 2);
    }
    return ratio;
  }

  function portLabel(p) {
    if (!p) return '';
    if (p.kind === 'generic') return '3:1 (any)';
    return `2:1 (${p.kind})`;
  }


  function openBankTradeModal() {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const ports = portsForPlayer(myPlayerId);
    const portLine = document.createElement('div');
    portLine.className = 'smallNote';
    portLine.textContent = ports.length ? `Your ports: ${ports.map(portLabel).join(', ')}` : 'Your ports: none (default 4:1)';
    wrap.appendChild(portLine);

    const bankBox = document.createElement('div');
    bankBox.className = 'tradeBox';
    bankBox.innerHTML = `<div class="tradeTitle">Bank / Port trade</div>`;

    const help = document.createElement('div');
    help.className = 'smallNote';
    help.textContent = 'Left-click TOP row to choose what you receive (+1 each click). Left-click BOTTOM row to choose what you give to the bank. Right-click / Shift-click top row to reduce.';
    help.style.marginBottom = '6px';
    bankBox.appendChild(help);

    const model = {
      giveKind: 'brick',
      takeKind: 'grain',
      takeQty: 1,
    };

    const rows = document.createElement('div');
    rows.className = 'gTradeRows';

    function makeBankChip(k, rowMode) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'resChipBtn';
      chip.title = rowMode === 'take'
        ? 'Left-click +1 (or switch resource) · Shift-click / Right-click −1'
        : 'Left-click to choose resource traded to bank';

      chip.addEventListener('click', (ev) => {
        const down = !!ev.shiftKey;
        if (rowMode === 'take') {
          if (down) {
            if (model.takeKind === k) model.takeQty = Math.max(1, Number(model.takeQty || 1) - 1);
          } else {
            if (model.takeKind === k) {
              model.takeQty = Math.max(1, Number(model.takeQty || 1) + 1);
            } else {
              model.takeKind = k;
              model.takeQty = Math.max(1, Number(model.takeQty || 1));
            }
          }
        } else {
          if (!down) model.giveKind = k;
        }
        refresh();
      });

      chip.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        if (rowMode === 'take' && model.takeKind === k) {
          model.takeQty = Math.max(1, Number(model.takeQty || 1) - 1);
          refresh();
        }
      });

      const img = document.createElement('img');
      img.src = resIconSrcForTrade(k);
      img.alt = k;
      img.draggable = false;

      const val = document.createElement('div');
      val.className = 'delta';

      chip.appendChild(img);
      chip.appendChild(val);

      return {
        node: chip,
        update: () => {
          const ratio = force4.checked ? 4 : tradeRatioForClient(model.giveKind);
          const n = (rowMode === 'take')
            ? (model.takeKind === k ? Math.max(1, Number(model.takeQty || 1)) : 0)
            : (model.giveKind === k ? Math.max(1, ratio * Math.max(1, Number(model.takeQty || 1))) : 0);
          const shown = (rowMode === 'take') ? n : -n;
          chip.classList.toggle('pos', shown > 0);
          chip.classList.toggle('neg', shown < 0);
          chip.classList.toggle('zero', shown === 0);
          val.textContent = `${shown >= 0 ? '+' : ''}${shown}`;

          const selected = (rowMode === 'take') ? (model.takeKind === k) : (model.giveKind === k);
          chip.style.borderColor = selected ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)';
          chip.style.boxShadow = selected
            ? '0 0 0 2px rgba(255,255,255,.10) inset, 0 0 0 1px rgba(0,0,0,.15)'
            : 'inset 0 1px 0 rgba(255,255,255,.04)';
        }
      };
    }

    function makeBankRow(labelText, rowMode, arrowKind) {
      const row = document.createElement('div');
      row.className = 'gTradeRow';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.flexDirection = 'column';
      left.style.gap = '6px';
      left.style.flex = '1 1 auto';

      const lab = document.createElement('div');
      lab.className = 'labelTiny';
      lab.textContent = labelText;
      left.appendChild(lab);

      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'gTradeChips';

      const chips = [];
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const c = makeBankChip(k, rowMode);
        chips.push(c);
        chipsWrap.appendChild(c.node);
      }
      left.appendChild(chipsWrap);

      const arrow = document.createElement('div');
      arrow.className = 'gTradeArrow ' + (arrowKind === 'down' ? 'ok' : 'bad');
      arrow.textContent = arrowKind === 'down' ? '⬇' : '⬆';

      row.appendChild(left);
      row.appendChild(arrow);

      return { row, chips };
    }

    const topRow = makeBankRow('Receive from bank', 'take', 'down');
    const bottomRow = makeBankRow('Trade to bank', 'give', 'up');
    rows.appendChild(topRow.row);
    rows.appendChild(bottomRow.row);
    bankBox.appendChild(rows);

    const bankInfo = document.createElement('div');
    bankInfo.className = 'smallNote';
    bankInfo.style.marginTop = '4px';
    bankBox.appendChild(bankInfo);

    const forceRow = document.createElement('label');
    forceRow.style.display = 'flex';
    forceRow.style.gap = '8px';
    forceRow.style.alignItems = 'center';
    forceRow.style.marginTop = '6px';
    forceRow.style.color = '#aab4c2';
    forceRow.style.fontSize = '12px';
    const force4 = document.createElement('input');
    force4.type = 'checkbox';
    force4.checked = false;
    forceRow.appendChild(force4);
    forceRow.appendChild(document.createTextNode('Force 4:1 (ignore ports)'));
    bankBox.appendChild(forceRow);

    wrap.appendChild(bankBox);

    let tradeBtn = null;

    function refresh() {
      const takeQty = Math.max(1, Math.floor(Number(model.takeQty || 1)));
      model.takeQty = takeQty;
      const ratio = force4.checked ? 4 : tradeRatioForClient(model.giveKind);
      const cost = ratio * takeQty;
      const sameKind = model.giveKind === model.takeKind;

      for (const c of [...topRow.chips, ...bottomRow.chips]) c.update();

      if (sameKind) {
        bankInfo.textContent = `Choose different resources: you cannot trade ${model.giveKind} for ${model.takeKind}.`;
      } else {
        bankInfo.textContent = `Rate: ${ratio}:1 — Cost: ${cost} ${model.giveKind} for ${takeQty} ${model.takeKind}.`;
      }

      if (tradeBtn) tradeBtn.disabled = sameKind || !model.giveKind || !model.takeKind || takeQty < 1;
    }

    force4.addEventListener('change', refresh);

    openModal({
      title: 'Bank Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Trade', primary: true, onClick: () => {
          const giveKind = model.giveKind;
          const takeKind = model.takeKind;
          const takeQty = Math.max(1, Math.floor(Number(model.takeQty || 1)));
          if (!giveKind || !takeKind || giveKind === takeKind) return;
          closeModal();
          sendGameAction({ kind: 'bank_trade', giveKind, takeKind, takeQty, forceRatio: force4.checked ? 4 : null });
        } },
      ]
    });

    try {
      const btns = ui.modalActions.querySelectorAll('button');
      tradeBtn = btns && btns.length ? btns[btns.length - 1] : null;
    } catch {}
    refresh();
  }


  function resIconSrcForTrade(k) {
    return getTextureAssetUrl(`Ports/${k}.png`);
  }

  function openPendingTradeModal(forceOpen = false) {
    if (!state || !state.pendingTrade || !myPlayerId) return;
    const t = state.pendingTrade;

    // Don't interrupt other locked flows
    if (!forceOpen && !ui.modal.classList.contains('hidden') && modalType !== 'pendingTrade') return;

    const proposer = (state.players || []).find(p => p.id === t.fromId) || null;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const box = document.createElement('div');
    box.className = 'tradeBox';
    box.innerHTML = `<div class="tradeTitle">Proposed Trade</div>`;

    // --- Header: proposer + delta chips (net from acceptor's perspective)
    const head = document.createElement('div');
    head.className = 'ptHead';

    const left = document.createElement('div');
    left.className = 'ptProposer';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.style.background = proposer ? proposer.color : '#777';
    const nm = document.createElement('div');
    nm.className = 'ptName';
    nm.textContent = proposer ? proposer.name : 'Player';
    left.appendChild(badge);
    left.appendChild(nm);

    const chips = document.createElement('div');
    chips.className = 'ptChips';

    for (const k of ['brick','lumber','wool','grain','ore']) {
      const giveN = Number((t.offer && t.offer[k]) || 0);
      const getN = Number((t.request && t.request[k]) || 0);
      // Show from the perspective of a player accepting the trade.
      // If the proposer would net (request - offer), the acceptor nets the opposite.
      const delta = giveN - getN; // acceptor net
      const chip = document.createElement('div');
      chip.className = 'resChip' + (delta > 0 ? ' pos' : (delta < 0 ? ' neg' : ' zero'));
      const img = document.createElement('img');
      img.src = resIconSrcForTrade(k);
      img.alt = k;
      img.draggable = false;
      const val = document.createElement('div');
      val.className = 'delta';
      val.textContent = `${delta >= 0 ? '+' : ''}${delta}`;
      chip.appendChild(img);
      chip.appendChild(val);
      chips.appendChild(chip);
    }

    head.appendChild(left);
    head.appendChild(chips);
    box.appendChild(head);

    // --- Grid: players + approve/reject
    const grid = document.createElement('div');
    grid.className = 'ptGrid';

    const h1 = document.createElement('div');
    h1.className = 'ptCell ptHeader';
    h1.textContent = '';
    const h2 = document.createElement('div');
    h2.className = 'ptCell ptHeader';
    h2.textContent = 'Approve';
    const h3 = document.createElement('div');
    h3.className = 'ptCell ptHeader';
    h3.textContent = 'Reject';
    grid.appendChild(h1); grid.appendChild(h2); grid.appendChild(h3);

    const responses = (t.responses || {});
    const isProposer = myPlayerId === t.fromId;

    for (const p of (state.players || [])) {
      const nameCell = document.createElement('div');
      nameCell.className = 'ptCell ptNameCell';
      const rowBadge = document.createElement('div');
      rowBadge.className = 'badge';
      rowBadge.style.background = p.color;
      const rowName = document.createElement('div');
      rowName.className = 'ptRowName';
      rowName.textContent = p.name;
      nameCell.appendChild(rowBadge);
      nameCell.appendChild(rowName);

      const approveCell = document.createElement('div');
      approveCell.className = 'ptCell ptVoteCell';
      const rejectCell = document.createElement('div');
      rejectCell.className = 'ptCell ptVoteCell';

      if (p.id === t.fromId) {
        // proposer row: no votes
        approveCell.innerHTML = '';
        rejectCell.innerHTML = '';
      } else {
        const status = responses[p.id] || null;

        // Approve button/icon
        const approveBtn = document.createElement('button');
        approveBtn.className = 'voteBtn' + (status === 'accept' ? ' on ok' : '');
        approveBtn.type = 'button';
        approveBtn.innerHTML = status === 'accept' ? '✔' : '';
        approveBtn.title = status === 'accept' ? 'Approved' : 'Approve';

        // Reject button/icon
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'voteBtn' + (status === 'reject' ? ' on bad' : '');
        rejectBtn.type = 'button';
        rejectBtn.innerHTML = status === 'reject' ? '✖' : '';
        rejectBtn.title = status === 'reject' ? 'Rejected' : 'Reject';

        const isMeRow = p.id === myPlayerId;
        if (isMeRow && !isProposer) {
          approveBtn.disabled = false;
          rejectBtn.disabled = false;

          approveBtn.addEventListener('click', () => {
            sendGameAction({ kind: 'respond_trade', tradeId: t.id, accept: true });
          });
          rejectBtn.addEventListener('click', () => {
            sendGameAction({ kind: 'respond_trade', tradeId: t.id, accept: false });
          });
        } else if (isProposer) {
          // proposer can finalize by clicking an accepted player's checkmark
          approveBtn.disabled = !(status === 'accept');
          rejectBtn.disabled = true;

          approveBtn.addEventListener('click', () => {
            if (status !== 'accept') return;
            sendGameAction({ kind: 'finalize_trade', tradeId: t.id, withPlayerId: p.id });
          });
        } else {
          // other players: read-only
          approveBtn.disabled = true;
          rejectBtn.disabled = true;
        }

        approveCell.appendChild(approveBtn);
        rejectCell.appendChild(rejectBtn);
      }

      grid.appendChild(nameCell);
      grid.appendChild(approveCell);
      grid.appendChild(rejectCell);
    }

    box.appendChild(grid);
    wrap.appendChild(box);

    modalType = 'pendingTrade';
    modalLocked = false;

    const modalActions = [];
    if (isProposer) {
      modalActions.push({
        label: 'Revise Trade',
        onClick: () => {
          revisingTradeId = t.id;
          closeModal();
          // Open the proposer editor with the current offer/request prefilled.
          openPlayerTradeModal({
            reviseOfTradeId: t.id,
            initOffer: (t.offer || {}),
            initRequest: (t.request || {}),
          });
        }
      });
    }
    modalActions.push({ label: 'Close', onClick: closeModal });

    openModal({
      title: 'Player Trade',
      bodyNode: wrap,
      actions: modalActions
    });
  }


  function openEndGameVoteModal(forceOpen = false) {
    if (!state || !state.endVote || !myPlayerId) return;
    const v = state.endVote;

    // Don't interrupt other locked flows
    if (!forceOpen && !ui.modal.classList.contains('hidden') && modalType !== 'endVote') return;

    const proposer = (state.players || []).find(p => p.id === v.fromId) || null;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const box = document.createElement('div');
    box.className = 'tradeBox';
    box.innerHTML = `<div class="tradeTitle">End Game Vote</div>`;
    wrap.appendChild(box);

    const info = document.createElement('div');
    info.className = 'smallNote';
    info.textContent = (proposer ? `${proposer.name} (host)` : 'Host') + ' wants to end the game early. Everyone must approve.';
    box.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'ptGrid';

    const h1 = document.createElement('div');
    h1.className = 'ptCell ptHeader';
    h1.textContent = '';
    const h2 = document.createElement('div');
    h2.className = 'ptCell ptHeader';
    h2.textContent = 'Approve';
    const h3 = document.createElement('div');
    h3.className = 'ptCell ptHeader';
    h3.textContent = 'Reject';
    grid.appendChild(h1); grid.appendChild(h2); grid.appendChild(h3);

    const responses = (v.responses || {});
    for (const p of (state.players || [])) {
      const nameCell = document.createElement('div');
      nameCell.className = 'ptCell ptNameCell';
      const rowBadge = document.createElement('div');
      rowBadge.className = 'badge';
      rowBadge.style.background = p.color;
      const rowName = document.createElement('div');
      rowName.className = 'ptRowName';
      rowName.textContent = p.name + (p.id === v.fromId ? ' (host)' : '');
      nameCell.appendChild(rowBadge);
      nameCell.appendChild(rowName);

      const approveCell = document.createElement('div');
      approveCell.className = 'ptCell ptVoteCell';
      const rejectCell = document.createElement('div');
      rejectCell.className = 'ptCell ptVoteCell';

      const status = responses[p.id] || null;

      const approveBtn = document.createElement('button');
      approveBtn.className = 'voteBtn' + (status === 'accept' ? ' on ok' : '');
      approveBtn.type = 'button';
      approveBtn.innerHTML = status === 'accept' ? '✔' : '';
      approveBtn.title = status === 'accept' ? 'Approved' : 'Approve';

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'voteBtn' + (status === 'reject' ? ' on bad' : '');
      rejectBtn.type = 'button';
      rejectBtn.innerHTML = status === 'reject' ? '✖' : '';
      rejectBtn.title = status === 'reject' ? 'Rejected' : 'Reject';

      const isMeRow = (p.id === myPlayerId);
      if (isMeRow) {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;

        approveBtn.addEventListener('click', () => {
          sendGameAction({ kind: 'respond_endgame', voteId: v.id, accept: true });
        });
        rejectBtn.addEventListener('click', () => {
          sendGameAction({ kind: 'respond_endgame', voteId: v.id, accept: false });
        });
      } else {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
      }

      approveCell.appendChild(approveBtn);
      rejectCell.appendChild(rejectBtn);

      grid.appendChild(nameCell);
      grid.appendChild(approveCell);
      grid.appendChild(rejectCell);
    }

    box.appendChild(grid);

    modalType = 'endVote';
    modalLocked = false;
    activeToolModal = null;

    openModal({
      title: 'End Game Vote',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal }
      ]
    });
  }


  function openPlayerTradeModal(opts = null) {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const reviseOfTradeId = opts && opts.reviseOfTradeId ? Number(opts.reviseOfTradeId) : 0;

    // If there's an active proposed trade, show it (unless we are revising it)
    if (!reviseOfTradeId && state.pendingTrade && state.pendingTrade.id) {
      openPendingTradeModal(true);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const playerBox = document.createElement('div');
    playerBox.className = 'tradeBox';
    playerBox.innerHTML = `<div class="tradeTitle">Player trade (multi‑unit)</div>`;

    const recv = { brick:0, lumber:0, wool:0, grain:0, ore:0 };
    const give = { brick:0, lumber:0, wool:0, grain:0, ore:0 };

    // Prefill when revising an existing pending trade.
    if (opts && (opts.initOffer || opts.initRequest)) {
      const io = opts.initOffer || {};
      const ir = opts.initRequest || {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        give[k] = Math.max(0, Math.floor(Number(io[k] || 0)));
        recv[k] = Math.max(0, Math.floor(Number(ir[k] || 0)));
      }
    }

    function makeChip(k, getVal, setVal, signMode) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'resChipBtn';
      chip.title = 'Click +1 · Shift‑click −1';
      chip.addEventListener('click', (ev) => {
        const down = !!ev.shiftKey;
        const v = Number(getVal() || 0);
        const next = Math.max(0, v + (down ? -1 : 1));
        setVal(next);
        refresh();
      });
      chip.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const v = Number(getVal() || 0);
        const next = Math.max(0, v - 1);
        setVal(next);
        refresh();
      });

      const img = document.createElement('img');
      img.src = resIconSrcForTrade(k);
      img.alt = k;
      img.draggable = false;

      const val = document.createElement('div');
      val.className = 'delta';

      chip.appendChild(img);
      chip.appendChild(val);

      return {
        node: chip,
        update: () => {
          const n = Number(getVal() || 0);
          const shown = (signMode === 'minus') ? -n : n;
          chip.classList.toggle('pos', shown > 0);
          chip.classList.toggle('neg', shown < 0);
          chip.classList.toggle('zero', shown === 0);
          val.textContent = `${shown >= 0 ? '+' : ''}${shown}`;
        }
      };
    }

    const rows = document.createElement('div');
    rows.className = 'gTradeRows';

    function makeRow(kindLabel, arrowKind) {
      const row = document.createElement('div');
      row.className = 'gTradeRow';

      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'gTradeChips';

      const chips = [];
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const src = (arrowKind === 'down') ? recv : give;
        const sign = (arrowKind === 'down') ? 'plus' : 'minus';
        const c = makeChip(k, () => src[k], (v) => { src[k] = v; }, sign);
        chips.push(c);
        chipsWrap.appendChild(c.node);
      }

      const arrow = document.createElement('div');
      arrow.className = 'gTradeArrow ' + (arrowKind === 'down' ? 'ok' : 'bad');
      arrow.textContent = arrowKind === 'down' ? '⬇' : '⬆';

      row.appendChild(chipsWrap);
      row.appendChild(arrow);

      return { row, chips };
    }

    const topRow = makeRow('You receive', 'down');
    const bottomRow = makeRow('You give', 'up');
    rows.appendChild(topRow.row);
    rows.appendChild(bottomRow.row);

    playerBox.appendChild(rows);
    wrap.appendChild(playerBox);

    function totals(m) {
      let t = 0;
      for (const k of ['brick','lumber','wool','grain','ore']) t += (m[k] || 0);
      return t;
    }

    function getOffer() {
      const out = {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const n = Math.max(0, Math.floor(Number(give[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }
    function getRequest() {
      const out = {};
      for (const k of ['brick','lumber','wool','grain','ore']) {
        const n = Math.max(0, Math.floor(Number(recv[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }

    let proposeBtn = null;

    function refresh() {
      for (const c of [...topRow.chips, ...bottomRow.chips]) c.update();
      if (proposeBtn) {
        const offer = getOffer();
        const request = getRequest();
        proposeBtn.disabled = (totals(offer) === 0 || totals(request) === 0);
      }
    }

    modalType = 'playerTradeCompose';
    setPlayerTradeTimerPause(true);
    openModal({
      title: reviseOfTradeId ? 'Revise Trade' : 'Player Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Propose', primary: true, onClick: () => {
          const offer = getOffer();
          const request = getRequest();
          closeModal();
          const payload = { kind: 'propose_trade', offer, request };
          if (reviseOfTradeId) payload.replaceTradeId = reviseOfTradeId;
          sendGameAction(payload);
          if (reviseOfTradeId && revisingTradeId === reviseOfTradeId) revisingTradeId = null;
        }, disabled: false },
      ]
    });

    // Grab the propose button to enable/disable
    try {
      const btns = ui.modalActions.querySelectorAll('button');
      proposeBtn = btns && btns.length ? btns[btns.length - 1] : null;
    } catch {}
    refresh();
  }


  function openTradeModal() {
    if (!state || !myPlayerId) return;
    const me = myPlayer();
    if (!me) return;

    const wrap = document.createElement('div');
    wrap.className = 'tradeWrap';

    const ports = portsForPlayer(myPlayerId);
    const portLine = document.createElement('div');
    portLine.className = 'smallNote';
    portLine.textContent = ports.length ? `Your ports: ${ports.map(portLabel).join(', ')}` : 'Your ports: none (default 4:1)';
    wrap.appendChild(portLine);

    // --- Bank trade
    const bankBox = document.createElement('div');
    bankBox.className = 'tradeBox';
    bankBox.innerHTML = `<div class="tradeTitle">Bank / Port trade</div>`;

    const row = document.createElement('div');
    row.className = 'tradeRow';

    const giveSel = document.createElement('select');
    const takeSel = document.createElement('select');
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '1';
    qty.value = '1';
    qty.className = 'input';
    qty.style.maxWidth = '90px';

    const keys = ['brick','lumber','wool','grain','ore'];
    for (const k of keys) {
      const o1 = document.createElement('option');
      o1.value = k; o1.textContent = k;
      giveSel.appendChild(o1);
      const o2 = document.createElement('option');
      o2.value = k; o2.textContent = k;
      takeSel.appendChild(o2);
    }
    takeSel.value = 'grain';

    row.appendChild(labelNode('Give'));
    row.appendChild(giveSel);
    row.appendChild(labelNode('Get'));
    row.appendChild(takeSel);
    row.appendChild(labelNode('Qty'));
    row.appendChild(qty);
    bankBox.appendChild(row);

    const bankInfo = document.createElement('div');
    bankInfo.className = 'smallNote';
    bankBox.appendChild(bankInfo);

    // Optional: force a classic 4:1 bank trade even if ports are owned
    const forceRow = document.createElement('label');
    forceRow.style.display = 'flex';
    forceRow.style.gap = '8px';
    forceRow.style.alignItems = 'center';
    forceRow.style.marginTop = '6px';
    forceRow.style.color = '#aab4c2';
    forceRow.style.fontSize = '12px';
    const force4 = document.createElement('input');
    force4.type = 'checkbox';
    force4.checked = false;
    forceRow.appendChild(force4);
    forceRow.appendChild(document.createTextNode('Force 4:1 (ignore ports)'));
    bankBox.appendChild(forceRow);

    function updateBankInfo() {
      const g = giveSel.value;
      const q = Math.max(1, Math.floor(Number(qty.value || 1)));
      qty.value = String(q);
      const r = force4.checked ? 4 : tradeRatioForClient(g);
      bankInfo.textContent = `Rate: ${r}:1 — Cost: ${r * q} ${g} for ${q} ${takeSel.value}.`;
    }
    giveSel.addEventListener('change', updateBankInfo);
    takeSel.addEventListener('change', updateBankInfo);
    qty.addEventListener('input', updateBankInfo);
    force4.addEventListener('change', updateBankInfo);
    updateBankInfo();

    wrap.appendChild(bankBox);

    // --- Player trade
    const playerBox = document.createElement('div');
    playerBox.className = 'tradeBox';
    playerBox.innerHTML = `<div class="tradeTitle">Player trade (multi‑unit)</div>`;

    const targetRow = document.createElement('div');
    targetRow.className = 'tradeRow';
    const toSel = document.createElement('select');
    for (const p of (state.players || [])) {
      if (p.id === myPlayerId) continue;
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      toSel.appendChild(o);
    }
    targetRow.appendChild(labelNode('To'));
    targetRow.appendChild(toSel);
    playerBox.appendChild(targetRow);

    const grids = document.createElement('div');
    grids.className = 'tradeGrids';
    const offerGrid = tradeQtyGrid('You give');
    const reqGrid = tradeQtyGrid('You get');
    grids.appendChild(offerGrid.wrap);
    grids.appendChild(reqGrid.wrap);
    playerBox.appendChild(grids);

    wrap.appendChild(playerBox);

    openModal({
      title: 'Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Bank Trade', primary: true, onClick: () => {
          const giveKind = giveSel.value;
          const takeKind = takeSel.value;
          const takeQty = Math.max(1, Math.floor(Number(qty.value || 1)));
          closeModal();
          sendGameAction({ kind: 'bank_trade', giveKind, takeKind, takeQty, forceRatio: force4.checked ? 4 : null });
        } },
        { label: 'Propose Player Trade', onClick: () => {
          const toPlayerId = toSel.value;
          const offer = offerGrid.get();
          const request = reqGrid.get();
          closeModal();
          sendGameAction({ kind: 'propose_trade', offer, request });
        } },
      ]
    });
  }

  function labelNode(txt) {
    const d = document.createElement('div');
    d.className = 'labelTiny';
    d.style.minWidth = '50px';
    d.textContent = txt;
    return d;
  }

  function tradeQtyGrid(title) {
    const wrap = document.createElement('div');
    wrap.className = 'tradeGrid';
    const h = document.createElement('div');
    h.className = 'labelTiny';
    h.textContent = title;
    wrap.appendChild(h);

    const g = document.createElement('div');
    g.className = 'tradeGridInner';
    const inputs = {};
    for (const k of ['brick','lumber','wool','grain','ore']) {
      const cell = document.createElement('div');
      cell.className = 'tradeCell';
      const lab = document.createElement('div');
      lab.className = 'tradeCellLab';
      lab.textContent = k;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.value = '0';
      inp.className = 'input';
      inp.style.maxWidth = '80px';
      inputs[k] = inp;
      cell.appendChild(lab);
      cell.appendChild(inp);
      g.appendChild(cell);
    }
    wrap.appendChild(g);
    return {
      wrap,
      get: () => {
        const out = {};
        let total = 0;
        for (const [k, inp] of Object.entries(inputs)) {
          const n = Math.max(0, Math.floor(Number(inp.value || 0)));
          inp.value = String(n);
          if (n > 0) { out[k] = n; total += n; }
        }
        if (total === 0) return {};
        return out;
      }
    };
  }

  function handlePendingTradePrompt() {
    if (!state || !myPlayerId) return;

    const t = state.pendingTrade;

    // If trade cleared, close any open trade modal
    if (!t || !t.id) {
      if (modalType === 'pendingTrade') forceCloseModal();
      return;
    }

    // Keep the proposed-trade modal live-updated while it's open
    if (modalType === 'pendingTrade' && !ui.modal.classList.contains('hidden')) {
      openPendingTradeModal(true);
      return;
    }

    // Don't interrupt other modals
    if (!ui.modal.classList.contains('hidden')) return;

    if (t.id <= lastTradePromptIdSeen) return;
    lastTradePromptIdSeen = t.id;

    openPendingTradeModal(true);
  }



  function handleEndGameVotePrompt() {
    if (!state || !myPlayerId) return;

    const v = state.endVote;

    // If vote cleared, close any open end-vote modal and clear deferred prompt state.
    if (!v || !v.id) {
      pendingEndVotePromptId = 0;
      if (modalType === 'endVote') forceCloseModal();
      return;
    }

    const voteId = Number(v.id || 0);

    // Keep the end-vote modal live-updated while it's open.
    if (modalType === 'endVote' && !ui.modal.classList.contains('hidden')) {
      pendingEndVotePromptId = 0;
      lastEndVotePromptIdSeen = Math.max(Number(lastEndVotePromptIdSeen || 0), voteId);
      openEndGameVoteModal(true);
      return;
    }

    // If another modal is open, defer the end-vote prompt so it opens as soon as
    // that modal is closed. This prevents the prompt from getting "lost" if no more
    // state packets arrive before the player dismisses the other modal.
    if (!ui.modal.classList.contains('hidden')) {
      pendingEndVotePromptId = voteId;
      return;
    }

    // If this vote was already seen but was deferred, still open it now.
    if (voteId <= Number(lastEndVotePromptIdSeen || 0) && voteId !== Number(pendingEndVotePromptId || 0)) return;

    pendingEndVotePromptId = 0;
    lastEndVotePromptIdSeen = Math.max(Number(lastEndVotePromptIdSeen || 0), voteId);

    openEndGameVoteModal(true);
  }


function handleDiscardPrompt() {
  if (!state || !myPlayerId) return;
  const disc = state.discard;
  const req = disc && disc.required && disc.required[myPlayerId];
  const done = disc && disc.done && disc.done[myPlayerId];

  const needsDiscard = !!req && !done;
  if (!needsDiscard) {
    if (modalType === 'discard') forceCloseModal();
    return;
  }

  const discId = Number(disc.id || 0);
  if (modalType === 'discard' && discId === lastDiscardPromptId && !ui.modal.classList.contains('hidden')) return;
  lastDiscardPromptId = discId;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'discard') forceCloseModal();

  const me = (state.players || []).find(p => p.id === myPlayerId);
  const avail = (me && me.resources) || { brick:0, lumber:0, wool:0, grain:0, ore:0 };
  const sel = { brick:0, lumber:0, wool:0, grain:0, ore:0 };

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '8px';
  top.textContent = `Discard ${req} card${req === 1 ? '' : 's'} (manual selection).`;
  wrap.appendChild(top);

  const grid = document.createElement('div');
  grid.className = 'discardGrid';
  wrap.appendChild(grid);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.gap = '10px';
  footer.style.marginTop = '12px';

  const totalPill = document.createElement('div');
  totalPill.className = 'countPill';
  footer.appendChild(totalPill);

  const submit = document.createElement('button');
  submit.className = 'btn primary';
  submit.textContent = 'Discard';
  submit.disabled = true;
  footer.appendChild(submit);

  wrap.appendChild(footer);

  function totalSel() {
    return sel.brick + sel.lumber + sel.wool + sel.grain + sel.ore;
  }

  function rebuild() {
    grid.innerHTML = '';
    const rows = [
      ['brick','Brick'],
      ['lumber','Lumber'],
      ['wool','Wool'],
      ['grain','Grain'],
      ['ore','Ore'],
    ];

    for (const [k,label] of rows) {
      const row = document.createElement('div');
      row.className = 'discardRow';

      const left = document.createElement('div');
      left.className = 'discardLabel';
      left.textContent = `${label} (have ${avail[k] || 0})`;
      row.appendChild(left);

      const controls = document.createElement('div');
      controls.className = 'discardControls';

      const minus = document.createElement('button');
      minus.className = 'stepBtn';
      minus.textContent = '−';
      minus.disabled = (sel[k] <= 0);
      minus.addEventListener('click', () => {
        sel[k] = Math.max(0, (sel[k] || 0) - 1);
        rebuild();
      });

      const pill = document.createElement('div');
      pill.className = 'countPill';
      pill.textContent = `${sel[k] || 0}`;

      const plus = document.createElement('button');
      plus.className = 'stepBtn';
      plus.textContent = '+';
      const maxForK = Math.min(avail[k] || 0, (sel[k] || 0) + Math.max(0, req - totalSel()));
      plus.disabled = (totalSel() >= req) || ((sel[k] || 0) >= (avail[k] || 0));
      plus.addEventListener('click', () => {
        if (totalSel() >= req) return;
        if ((sel[k] || 0) >= (avail[k] || 0)) return;
        sel[k] = (sel[k] || 0) + 1;
        rebuild();
      });

      controls.appendChild(minus);
      controls.appendChild(pill);
      controls.appendChild(plus);
      row.appendChild(controls);

      grid.appendChild(row);
    }

    totalPill.textContent = `${totalSel()} / ${req}`;
    submit.disabled = (totalSel() !== req);
  }

  submit.addEventListener('click', () => {
    if (submit.disabled) return;
    submit.disabled = true;
    sendGameAction({ kind: 'discard_cards', cards: sel });
  });

  rebuild();

  modalLocked = true;
  modalType = 'discard';
  openModal({ title: 'Discard Cards', bodyNode: wrap, actions: [] });
}

function handleRobberStealPrompt() {
  if (!state || !myPlayerId) return;

  const isMySteal = state.phase === 'robber-steal' && state.currentPlayerId === myPlayerId;
  const ctx = state.robberSteal;
  if (!isMySteal || !ctx || !(ctx.victims || []).length) {
    if (modalType === 'robber-steal') forceCloseModal();
    return;
  }

  const sid = Number(ctx.id || 0);
  if (modalType === 'robber-steal' && sid === lastStealPromptId && !ui.modal.classList.contains('hidden')) return;
  lastStealPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'robber-steal') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Choose a player to steal 1 random resource from:';
  wrap.appendChild(top);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';

  for (const vid of ctx.victims || []) {
    const vp = (state.players || []).find(p => p.id === vid);
    const cardCount = vp ? (vp.handCount ?? ((vp.resources?.brick||0) + (vp.resources?.lumber||0) + (vp.resources?.wool||0) + (vp.resources?.grain||0) + (vp.resources?.ore||0))) : 0;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${vp ? vp.name : 'Player'} (${cardCount} cards)`;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'robber_steal', victimId: vid });
    });
    list.appendChild(b);
  }

  wrap.appendChild(list);

  modalLocked = true;
  modalType = 'robber-steal';
  openModal({ title: 'Choose Victim', bodyNode: wrap, actions: [] });
}

function handlePirateChoicePrompt() {
  if (!state || !myPlayerId) return;

  // No popup: during this phase, the active player chooses by clicking a land tile (robber)
  // or a sea tile (pirate).
  const isMyChoice = state.phase === 'pirate-or-robber' && state.currentPlayerId === myPlayerId;
  const ctx = state.thiefChoice;
  if (!isMyChoice || !ctx || ctx.playerId !== myPlayerId) {
    if (modalType === 'thief-choice') forceCloseModal();
    lastPirateChoicePromptId = null;
    return;
  }

  // If an old modal is still open from a previous version/client, close it.
  if (modalType === 'thief-choice') forceCloseModal();
  lastPirateChoicePromptId = Number(ctx.id || 0);
}

function handlePirateStealPrompt() {
  if (!state || !myPlayerId) return;

  const isMySteal = state.phase === 'pirate-steal' && state.currentPlayerId === myPlayerId;
  const ctx = state.pirateSteal;
  if (!isMySteal || !ctx || !(ctx.victims || []).length) {
    if (modalType === 'pirate-steal') forceCloseModal();
    return;
  }

  const sid = Number(ctx.id || 0);
  if (modalType === 'pirate-steal' && sid === lastPirateStealPromptId && !ui.modal.classList.contains('hidden')) return;
  lastPirateStealPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'pirate-steal') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Choose a player to steal 1 random resource from (pirate):';
  wrap.appendChild(top);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';

  for (const vid of ctx.victims || []) {
    const vp = (state.players || []).find(p => p.id === vid);
    const cardCount = vp ? (vp.handCount ?? ((vp.resources?.brick||0) + (vp.resources?.lumber||0) + (vp.resources?.wool||0) + (vp.resources?.grain||0) + (vp.resources?.ore||0))) : 0;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${vp ? vp.name : 'Player'} (${cardCount} cards)`;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'pirate_steal', victimId: vid });
    });
    list.appendChild(b);
  }

  wrap.appendChild(list);

  modalLocked = true;
  modalType = 'pirate-steal';
  openModal({ title: 'Pirate Steal', bodyNode: wrap, actions: [] });
}

let lastDiscoveryGoldPromptId = 0;

function handleDiscoveryGoldPrompt() {
  if (!state || !myPlayerId) return;
  const sp = state.special;
  const needs = sp && sp.kind === 'discovery_gold' && sp.forPlayerId === myPlayerId;
  if (!needs) {
    if (modalType === 'discovery-gold') forceCloseModal();
    return;
  }

  const sid = Number(sp.id || 0);
  if (modalType === 'discovery-gold' && sid === lastDiscoveryGoldPromptId && !ui.modal.classList.contains('hidden')) return;
  lastDiscoveryGoldPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'discovery-gold') forceCloseModal();

  const wrap = document.createElement('div');
  const top = document.createElement('div');
  top.style.marginBottom = '10px';
  top.textContent = 'Gold Field discovered! Choose 1 resource to take from the bank:';
  wrap.appendChild(top);

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.gap = '8px';

  const choices = [
    ['brick', 'Brick'],
    ['lumber', 'Lumber'],
    ['wool', 'Wool'],
    ['grain', 'Grain'],
    ['ore', 'Ore'],
  ];

  for (const [k,label] of choices) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = label;
    b.addEventListener('click', () => {
      sendGameAction({ kind: 'choose_discovery', resourceKind: k });
    });
    row.appendChild(b);
  }

  wrap.appendChild(row);

  modalLocked = true;
  modalType = 'discovery-gold';
  openModal({ title: 'Discovery', bodyNode: wrap, actions: [] });
}

let lastProductionGoldPromptId = 0;

function handleProductionGoldPrompt() {
  if (!state || !myPlayerId) return;
  const sp = state.special;
  const needs = sp && sp.kind === 'production_gold' && sp.forPlayerId === myPlayerId;
  if (!needs) {
    if (modalType === 'production-gold') forceCloseModal();
    return;
  }

  const sid = Number(sp.id || 0);
  if (modalType === 'production-gold' && sid === lastProductionGoldPromptId && !ui.modal.classList.contains('hidden')) return;
  lastProductionGoldPromptId = sid;

  if (!ui.modal.classList.contains('hidden') && modalType !== 'production-gold') forceCloseModal();

  const amount = Math.max(1, Number(sp.amount || 1) | 0);

  const wrap = document.createElement('div');

  const top = document.createElement('div');
  top.style.marginBottom = '8px';
  top.textContent = `Gold Field production! Choose ${amount} resource${amount === 1 ? '' : 's'} from the bank:`;
  wrap.appendChild(top);

  const sub = document.createElement('div');
  sub.style.opacity = '0.85';
  sub.style.fontSize = '12px';
  sub.style.marginBottom = '10px';
  sub.textContent = (sp.roll != null)
    ? `Triggered by roll ${sp.roll}. You have 10 seconds before the game auto-picks.`
    : 'You have 10 seconds before the game auto-picks.';
  wrap.appendChild(sub);

  const picksLabel = document.createElement('div');
  picksLabel.style.marginBottom = '6px';
  picksLabel.style.fontSize = '12px';
  picksLabel.style.opacity = '0.9';
  wrap.appendChild(picksLabel);

  const picksRow = document.createElement('div');
  picksRow.style.display = 'flex';
  picksRow.style.flexWrap = 'wrap';
  picksRow.style.gap = '6px';
  picksRow.style.marginBottom = '10px';
  wrap.appendChild(picksRow);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.flexWrap = 'wrap';
  btnRow.style.gap = '8px';
  btnRow.style.marginBottom = '10px';

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.justifyContent = 'flex-end';

  const choices = [
    ['brick', 'Brick'],
    ['lumber', 'Lumber'],
    ['wool', 'Wool'],
    ['grain', 'Grain'],
    ['ore', 'Ore'],
  ];
  const picks = [];

  function renderPicks() {
    picksLabel.textContent = `Selected: ${picks.length} / ${amount}`;
    picksRow.innerHTML = '';
    if (!picks.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.7';
      empty.style.fontSize = '12px';
      empty.textContent = 'No resources selected yet.';
      picksRow.appendChild(empty);
    } else {
      for (let i = 0; i < picks.length; i++) {
        const chip = document.createElement('button');
        chip.className = 'btn';
        chip.style.padding = '4px 8px';
        chip.textContent = `${i + 1}. ${picks[i]}`;
        chip.title = 'Click to remove';
        chip.addEventListener('click', () => {
          picks.splice(i, 1);
          renderPicks();
        });
        picksRow.appendChild(chip);
      }
    }
    submitBtn.disabled = (picks.length !== amount);
    resetBtn.disabled = (picks.length === 0);
  }

  for (const [k, label] of choices) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = label;
    b.addEventListener('click', () => {
      if (picks.length >= amount) return;
      picks.push(k);
      renderPicks();
      if (amount === 1) {
        sendGameAction({ kind: 'choose_production_gold', choices: picks.slice() });
      }
    });
    btnRow.appendChild(b);
  }

  wrap.appendChild(btnRow);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    picks.length = 0;
    renderPicks();
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn primary';
  submitBtn.textContent = 'Confirm';
  submitBtn.disabled = true;
  submitBtn.addEventListener('click', () => {
    if (picks.length !== amount) return;
    sendGameAction({ kind: 'choose_production_gold', choices: picks.slice() });
  });

  footer.appendChild(resetBtn);
  if (amount !== 1) footer.appendChild(submitBtn);
  wrap.appendChild(footer);

  renderPicks();

  playSfx('gold_field_production');
  modalLocked = true;
  modalType = 'production-gold';
  openModal({ title: 'Gold Field Production', bodyNode: wrap, actions: [] });
}



  function playDevCard(card) {
    if (!card) return;

    if (card.type === 'invention') {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div>Take any 2 resource cards from the supply.</div>`;

      const choices = ['brick','lumber','wool','grain','ore'];
      const row = document.createElement('div');
      row.className = 'choiceRow';

      const sel1 = document.createElement('select');
      const sel2 = document.createElement('select');
      for (const s of [sel1, sel2]) {
        for (const k of choices) {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          s.appendChild(opt);
        }
      }
      row.appendChild(sel1);
      row.appendChild(sel2);
      wrap.appendChild(row);

      openModal({
        title: 'Invention',
        bodyNode: wrap,
        actions: [
          { label: 'Cancel', onClick: closeModal },
          { label: 'Take', primary: true, onClick: () => {
            closeModal();
            sendGameAction({ kind: 'play_dev_card', cardId: card.id, choices: [sel1.value, sel2.value] });
          } },
        ]
      });
      return;
    }

    if (card.type === 'monopoly') {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div>Choose a resource type. Each other player gives you all cards of that type.</div>`;
      const row = document.createElement('div');
      row.className = 'choiceRow';
      const choices = ['brick','lumber','wool','grain','ore'];
      for (const k of choices) {
        const b = document.createElement('button');
        b.className = 'choiceBtn';
        b.textContent = k;
        b.addEventListener('click', () => {
          closeModal();
          sendGameAction({ kind: 'play_dev_card', cardId: card.id, resourceKind: k });
        });
        row.appendChild(b);
      }
      wrap.appendChild(row);

      openModal({
        title: 'Monopoly',
        bodyNode: wrap,
        actions: [{ label: 'Cancel', onClick: closeModal }]
      });
      return;
    }

    // Knight / Road Building / Victory Point: no extra UI
    sendGameAction({ kind: 'play_dev_card', cardId: card.id });

    if (card.type === 'road_building') {
      setMode('place_road');
    }
  }

  function robberVictims(tileId) {
    if (!state) return [];
    const tile = state.geom?.tiles?.[tileId];
    if (!tile) return [];
    const set = new Set();
    for (const nid of (tile.cornerNodeIds || [])) {
      const b = state.geom.nodes?.[nid]?.building;
      if (b && b.owner && b.owner !== myPlayerId) set.add(b.owner);
    }
    return Array.from(set);
  }

  // Click on board
  ui.canvas.addEventListener('click', (e) => {
    // Ignore delayed native click after synthetic mobile tap dispatch.
    if (mobileSyntheticClickSig && e && e.isTrusted) {
      const dt = Date.now() - mobileSyntheticClickSig.t;
      const dx = Math.abs((e.clientX || 0) - mobileSyntheticClickSig.x);
      const dy = Math.abs((e.clientY || 0) - mobileSyntheticClickSig.y);
      if (dt >= 0 && dt < 700 && dx < 18 && dy < 18) return;
    }
    if (!state || !myPlayerId) return;
    if (state.paused) { setError('Game is paused.'); return; }
    hideBuildPopup();
    hideThiefMoveConfirmPopup();
    const rect = ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!screenCache) return;

    // Test Builder (Solo) map painting in lobby (host only)
    if (state && state.phase === 'lobby' && room && room.hostId === myPlayerId) {
      const rr = room.rules || state.rules || {};
      const mm = String(rr.mapMode || 'classic').toLowerCase();
      const scen = String(rr.seafarersScenario || 'four_islands').toLowerCase();
      if (mm === 'seafarers' && scen === 'test_builder') {
        const tid = pickTile(x, y);
        if (tid != null) {
          const tileType = (ui.testBrushSelect && ui.testBrushSelect.value) ? ui.testBrushSelect.value : 'sea';
          const nstr = (ui.testNumberSelect && ui.testNumberSelect.value) ? ui.testNumberSelect.value : '';
          const num = nstr ? parseInt(nstr, 10) : null;
          send({ type: 'edit_preview_tile', tileId: tid, tileType, number: num });
        }
        return;
      }
    }

    const phase = state.phase;
    if (phase === 'cartographer-draft') {
      const myTurnDraft = state.currentPlayerId === myPlayerId;
      if (!myTurnDraft) return;
      const tid = pickTile(x, y);
      if (tid != null) {
        const tile = state.geom?.tiles?.[tid];
        const tileTypeStr = String(tile?.type || '').toLowerCase();
        const isDraftSlot = !!(tile && (tileTypeStr === 'unexplored' || tileTypeStr === '?' || (tile.fog && !tile.revealed)));
        if (isDraftSlot) {
          sendGameAction({ kind: 'cartographer_draft_place', tileId: tid, tileType: cartographerDraftSelection });
        }
      }
      return;
    }

    const myTurn = state.currentPlayerId === myPlayerId;
    if (!myTurn) return;

    // Setup/robber/pirate override modes
    if (phase === 'setup1-settlement' || phase === 'setup2-settlement') {
      const hit = pickNode(x, y);
      if (hit != null) queryNodeBuildConfirm(hit, e.clientX, e.clientY);
      return;
    }
    if (phase === 'setup1-road' || phase === 'setup2-road') {
      const hit = pickEdge(x, y);
      if (hit != null) queryEdgeBuildConfirm(hit, e.clientX, e.clientY);
      return;
    }
    if (phase === 'pirate-or-robber') {
      const tid = pickTile(x, y);
      if (tid != null) {
        const tile = state.geom?.tiles?.[tid];
        const isSea = (tile && tile.type === 'sea');

        if (isSea) {
          if (tile?.pirate) {
            setError('Pirate must move to a different tile.');
            return;
          }
          promptThiefMoveConfirm({ kind: 'move_pirate', tileId: tid }, e.clientX, e.clientY);
        } else {
          if (tile?.robber) {
            setError('Robber must move to a different tile.');
            return;
          }
          promptThiefMoveConfirm({ kind: 'move_robber', tileId: tid }, e.clientX, e.clientY);
        }
      }
      return;
    }
    if (phase === 'robber-move') {
      const tid = pickTile(x, y);
      if (tid != null) {
        if (state.geom?.tiles?.[tid]?.robber) {
          setError('Robber must move to a different tile.');
          return;
        }
        promptThiefMoveConfirm({ kind: 'move_robber', tileId: tid }, e.clientX, e.clientY);
      }
      return;
    }
    if (phase === 'pirate-move') {
      const tid = pickTile(x, y);
      if (tid != null) {
        if (state.geom?.tiles?.[tid]?.pirate) {
          setError('Pirate must move to a different tile.');
          return;
        }
        promptThiefMoveConfirm({ kind: 'move_pirate', tileId: tid }, e.clientX, e.clientY);
      }
      return;
    }

    // Main turn phases (before or after rolling)
    const inMainTurn = (phase === 'main-actions' || phase === 'main-await-roll');
    if (!inMainTurn) return;

    // Clicking one of your placed ships directly enters ship-move selection and shows valid destinations.
    const directShipHit = pickEdge(x, y);
    if (directShipHit != null) {
      const de = state.geom?.edges?.[directShipHit];
      if (de && de.shipOwner === myPlayerId) {
        if (inputMode.kind === 'move_ship' && inputMode.moveShipFrom === directShipHit) {
          clearShipMoveSelection({ keepMode: true });
          render();
          return;
        }
        selectShipForMove(directShipHit);
        return;
      }
    }

    // Ship movement is allowed any time during your turn (once per turn).
    if (inputMode.kind === 'move_ship') {
      const hit = pickEdge(x, y);
      if (hit == null) return;

      // First click selects a ship edge you own.
      if (inputMode.moveShipFrom == null) {
        const e = state.geom?.edges?.[hit];
        if (!e || e.shipOwner !== myPlayerId) {
          setError('Click one of your ships to select it.');
          return;
        }
        if (edgeTouchesPirateClient(hit)) {
          setError('The pirate blocks moving that ship.');
          return;
        }
        inputMode.moveShipFrom = hit;
        inputMode.moveShipTargets = [];
        inputMode.moveShipTargetsLoading = false;
        setMode('move_ship');
        requestShipMoveTargets(hit);
        updateShipMoveCancelPopupPosition();
        render();
        return;
      }

      // Second click chooses a destination edge (clicking the same edge cancels).
      if (hit === inputMode.moveShipFrom) {
        clearShipMoveSelection({ keepMode: true });
        render();
        return;
      }

      const from = inputMode.moveShipFrom;
      clearShipMoveSelection({ keepMode: true });
      sendGameAction({ kind: 'move_ship', fromEdgeId: from, toEdgeId: hit });
      return;
    }

    // Click-to-build menu (after rolling).
    if (phase !== 'main-actions') return;

    // If the player chose a build mode, prefer the matching target type.
    // This makes settlement placement reliable on dense/small-scaled boards (e.g., Through the Desert).
    if (inputMode.kind === 'place_settlement' || inputMode.kind === 'upgrade_city') {
      const hit = pickNode(x, y);
      if (hit != null) {
        queryNodeBuildConfirm(hit, e.clientX, e.clientY);
        return;
      }
    }
    if (inputMode.kind === 'place_road' || inputMode.kind === 'place_ship') {
      const hit = pickEdge(x, y);
      if (hit != null) {
        queryEdgeBuildConfirm(hit, e.clientX, e.clientY);
        return;
      }
    }

    const tgt = pickTarget(x, y);
    if (!tgt) return;
    if (tgt.kind === 'node') {
      queryNodeBuildConfirm(tgt.id, e.clientX, e.clientY);
      return;
    }
    if (tgt.kind === 'edge') {
      queryEdgeBuildConfirm(tgt.id, e.clientX, e.clientY);
      return;
    }
    queryBuildOptions(tgt.kind, tgt.id, e.clientX, e.clientY);
  });

  // Drawing helpers
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function worldToScreen(pt) {
    return {
      x: (pt.x * view.scale) + (ui.canvas.getBoundingClientRect().width / 2) + view.ox,
      y: (pt.y * view.scale) + (ui.canvas.getBoundingClientRect().height / 2) + view.oy,
    };
  }
  function screenToWorld(pt) {
    return {
      x: (pt.x - (ui.canvas.getBoundingClientRect().width / 2) - view.ox) / view.scale,
      y: (pt.y - (ui.canvas.getBoundingClientRect().height / 2) - view.oy) / view.scale,
    };
  }

  function tilePolygonScreen(tile) {
    // use corner nodes for exact polygon
    const ids = tile.cornerNodeIds || [];
    const pts = ids.map(nid => worldToScreen({ x: state.geom.nodes[nid].x, y: state.geom.nodes[nid].y }));
    return pts;
  }

  function pointInPoly(px, py, poly) {
    // ray casting
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - ax, py - ay);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - bx, py - by);
    const t = c1 / c2;
    const ix = ax + t * vx;
    const iy = ay + t * vy;
    return Math.hypot(px - ix, py - iy);
  }

  function pickNode(sx, sy) {
    if (!screenCache) return null;
    // Larger hit radius so settlement/city clicks are easier than edge clicks.
    const rad = 34;
    let best = { id: null, d: 1e9 };
    for (const n of screenCache.nodes) {
      const d = Math.hypot(sx - n.sx, sy - n.sy);
      if (d < rad && d < best.d) best = { id: n.id, d };
    }
    return best.id;
  }

  function pickTarget(sx, sy) {
    if (!screenCache) return null;

    // Find nearest node/edge under thresholds, then choose the closer one.
    const nodeRad = 32;
    let bestNode = { id: null, d: 1e9 };
    for (const n of screenCache.nodes) {
      const d = Math.hypot(sx - n.sx, sy - n.sy);
      if (d < nodeRad && d < bestNode.d) bestNode = { id: n.id, d };
    }

    const edgeThr = 7;
    let bestEdge = { id: null, d: 1e9 };
    for (const e of screenCache.edges) {
      const mx1 = e.ax + (e.bx - e.ax) * 0.25;
      const my1 = e.ay + (e.by - e.ay) * 0.25;
      const mx2 = e.ax + (e.bx - e.ax) * 0.75;
      const my2 = e.ay + (e.by - e.ay) * 0.75;
      const d = distToSeg(sx, sy, mx1, my1, mx2, my2);
      if (d < edgeThr && d < bestEdge.d) bestEdge = { id: e.id, d };
    }

    if (bestNode.id == null && bestEdge.id == null) return null;
    if (bestNode.id != null && bestEdge.id == null) return { kind: 'node', id: bestNode.id };
    if (bestEdge.id != null && bestNode.id == null) return { kind: 'edge', id: bestEdge.id };

    const nd = bestNode.d / nodeRad;
    const ed = bestEdge.d / edgeThr;
    return (nd <= ed) ? { kind: 'node', id: bestNode.id } : { kind: 'edge', id: bestEdge.id };
  }

  function pickEdge(sx, sy) {
    if (!screenCache) return null;
    // Roads are thin lines; use a more forgiving threshold.
    const thr = 7;
    let best = { id: null, d: 1e9 };
    for (const e of screenCache.edges) {
      // Only the middle half of the edge is clickable to avoid stealing settlement clicks near nodes.
      const mx1 = e.ax + (e.bx - e.ax) * 0.25;
      const my1 = e.ay + (e.by - e.ay) * 0.25;
      const mx2 = e.ax + (e.bx - e.ax) * 0.75;
      const my2 = e.ay + (e.by - e.ay) * 0.75;
      const d = distToSeg(sx, sy, mx1, my1, mx2, my2);
      if (d < thr && d < best.d) best = { id: e.id, d };
    }
    return best.id;
  }

  function pickTile(sx, sy) {
    if (!screenCache) return null;
    for (const t of screenCache.tiles) {
      if (pointInPoly(sx, sy, t.poly)) return t.id;
    }
    return null;
  }

  function shouldHideOuterSeaBorderTileClient(t) {
    if (!state || !state.geom || !t) return false;
    const rules = state.rules || {};
    const mm = String(rules.mapMode || '').toLowerCase();
    if (mm !== 'seafarers') return false;
    const scen = String(rules.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g, '_');
    if (scen === 'test_builder' || scen === 'cartographer_4_manual' || scen === 'cartographer_4_random' || scen === 'cartographer_4' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'cartographer_56') return false;
    if (String(t.type || '').toLowerCase() !== 'sea') return false;
    const nbs = (state.geom.tileNeighbors && Array.isArray(state.geom.tileNeighbors[t.id])) ? state.geom.tileNeighbors[t.id] : null;
    if (!nbs) return false;
    return nbs.length < 6;
  }

  function edgeAdjTilesAfterOuterSeaTrimClient(edgeId) {
    const adj = (state && state.geom && state.geom.edgeAdjTiles && Array.isArray(state.geom.edgeAdjTiles[edgeId])) ? state.geom.edgeAdjTiles[edgeId] : [];
    if (!adj.length) return [];
    return adj.filter(tid => !shouldHideOuterSeaBorderTileClient(state.geom.tiles && state.geom.tiles[tid]));
  }

  function edgeIsHiddenByOuterSeaTrimClient(edgeId) {
    return edgeAdjTilesAfterOuterSeaTrimClient(edgeId).length === 0;
  }

  function edgeIsBoundaryAfterOuterSeaTrimClient(edgeId) {
    return edgeAdjTilesAfterOuterSeaTrimClient(edgeId).length === 1;
  }

  function edgeTouchesSeaAfterOuterSeaTrimClient(edgeId) {
    const rawAdj = (state && state.geom && state.geom.edgeAdjTiles && Array.isArray(state.geom.edgeAdjTiles[edgeId])) ? state.geom.edgeAdjTiles[edgeId] : [];
    const adj = edgeAdjTilesAfterOuterSeaTrimClient(edgeId);
    if (!adj.length) return false;
    if (adj.length === 1) {
      if ((state.geom.tiles[adj[0]] && state.geom.tiles[adj[0]].type) === 'sea') return true;
      return rawAdj.some(tid => !adj.includes(tid) && (state.geom.tiles[tid] && state.geom.tiles[tid].type) === 'sea');
    }
    return adj.some(tid => (state.geom.tiles[tid] && state.geom.tiles[tid].type) === 'sea');
  }

  function edgeTouchesLandAfterOuterSeaTrimClient(edgeId) {
    const adj = edgeAdjTilesAfterOuterSeaTrimClient(edgeId);
    if (!adj.length) return false;
    if (adj.length === 1) return (state.geom.tiles[adj[0]] && state.geom.tiles[adj[0]].type) !== 'sea';
    return adj.some(tid => (state.geom.tiles[tid] && state.geom.tiles[tid].type) !== 'sea');
  }

  function nodeIsHiddenByOuterSeaTrimClient(nodeId) {
    if (!state || !state.geom || !Array.isArray(state.geom.edges)) return false;
    let sawIncident = false;
    for (const e of state.geom.edges) {
      if (!e) continue;
      if (e.a !== nodeId && e.b !== nodeId) continue;
      sawIncident = true;
      if (!edgeIsHiddenByOuterSeaTrimClient(e.id)) return false;
    }
    return sawIncident;
  }

  function render() {
    if (!state) hideShipMoveCancelPopup();
    // Clear
    const w = ui.canvas.getBoundingClientRect().width;
    const h = ui.canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    if (!state || !state.geom || !state.geom.tiles) {
      // soft title
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8eef6';
      ctx.font = '600 18px ui-sans-serif, system-ui';
      ctx.fillText('Create or join a lobby to begin.', 18, 34);
      ctx.restore();
      screenCache = null;
      return;
    }

    // Build cache
    screenCache = { nodes: [], edges: [], tiles: [] };

    // Draw tiles
    const activePlayerThiefMove = (state.currentPlayerId === myPlayerId) && (state.phase === 'pirate-or-robber' || state.phase === 'robber-move' || state.phase === 'pirate-move');
    const thiefHighlightPhase = String(state.phase || '');
    const thiefPulse = 0.65 + 0.35 * Math.sin((Date.now() % 1200) / 1200 * Math.PI * 2);

    for (const t of state.geom.tiles) {
      const c = worldToScreen({ x: t.cx, y: t.cy });
      const poly = tilePolygonScreen(t);
      const hideOuterSeaBorderTile = shouldHideOuterSeaBorderTileClient(t);
      if (!hideOuterSeaBorderTile) screenCache.tiles.push({ id: t.id, poly });
      if (hideOuterSeaBorderTile) continue;

      // Clip to hex then draw image
      ctx.save();
      ctx.beginPath();
      poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();

      const fogHidden = !!(t.fog && !t.revealed);
      const imgKey = fogHidden ? 'unexplored' : t.type;
      const img = images[imgKey] || null;
      // world hex bbox for size=1: width sqrt(3), height 2. add slight padding
      const imgW = Math.sqrt(3) * view.scale * 1.06;
      const imgH = 2 * view.scale * 1.06;
      if (img) {
        ctx.drawImage(img, c.x - imgW / 2, c.y - imgH / 2, imgW, imgH);
      } else {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(c.x - imgW / 2, c.y - imgH / 2, imgW, imgH);
      }
      ctx.restore();

      // Outline
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      if (activePlayerThiefMove) {
        const isSeaTile = t.type === 'sea';
        const canRobberHere = (!isSeaTile && !t.robber);
        const canPirateHere = (isSeaTile && !t.pirate);
        let showChoice = false;
        if (thiefHighlightPhase === 'pirate-or-robber') showChoice = (canRobberHere || canPirateHere);
        else if (thiefHighlightPhase === 'robber-move') showChoice = canRobberHere;
        else if (thiefHighlightPhase === 'pirate-move') showChoice = canPirateHere;

        if (showChoice) {
          ctx.save();
          ctx.globalAlpha = 0.14 + 0.10 * thiefPulse;
          ctx.fillStyle = isSeaTile ? 'rgba(110,196,255,0.9)' : 'rgba(255,214,102,0.9)';
          ctx.beginPath();
          poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.55 + 0.20 * thiefPulse;
          ctx.strokeStyle = isSeaTile ? 'rgba(125,215,255,.95)' : 'rgba(255,224,120,.95)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      // Number token
      if (t.number && !(t.fog && !t.revealed)) {
        const numImg = images[`num_${t.number}`] || null;
        // Keep the center number readable at any zoom: never smaller than 1/3 of the hex height.
        const hexH = 2 * view.scale;
        const sz = Math.round(hexH / 3);
        if (numImg) {
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.drawImage(numImg, c.x - sz / 2, c.y - sz / 2, sz, sz);
          ctx.restore();
        } else {
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = 2;
        const r = Math.max(16, Math.round(sz / 2));
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const hot = (t.number === 6 || t.number === 8);
        ctx.fillStyle = hot ? '#b00020' : '#111827';
        const fs = Math.max(14, Math.round(r * 0.9));
        ctx.font = `700 ${fs}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(t.number), c.x, c.y);
        ctx.restore();
        }
      }
      // Robber marker
      if (t.robber) {
        const hexH = 2 * view.scale;
        const tokenSz = Math.round(hexH / 3);
    // Pirate should be ~1/3 the tile height.
    const iconSz = Math.round(hexH / 3);
        const rImg = images['thief_robber'] || null;

        // Place robber next to the number token (top-right of the token).
        const ox = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const oy = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const rx = c.x + ox;
        const ry = c.y - oy;

        if (activePlayerThiefMove && (thiefHighlightPhase === 'pirate-or-robber' || thiefHighlightPhase === 'robber-move')) {
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.25 * thiefPulse;
          ctx.strokeStyle = 'rgba(255,223,128,.98)';
          ctx.lineWidth = Math.max(3, Math.round(iconSz * 0.12));
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(iconSz * 0.62, 14), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (rImg) {
          ctx.drawImage(rImg, rx - iconSz / 2, ry - iconSz / 2, iconSz, iconSz);
        } else {
          // Fallback
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('R', rx, ry);
        }
        ctx.restore();
      }

      // Pirate marker
      if (t.pirate) {
        const hexH = 2 * view.scale;
        const iconSz = Math.round((hexH / 4) * 1.16);
        const pImg = images['thief_pirate'] || null;
        const px = c.x;
        const py = c.y;

        if (activePlayerThiefMove && (thiefHighlightPhase === 'pirate-or-robber' || thiefHighlightPhase === 'pirate-move')) {
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.25 * thiefPulse;
          ctx.strokeStyle = 'rgba(120,220,255,.98)';
          ctx.lineWidth = Math.max(3, Math.round(iconSz * 0.12));
          ctx.beginPath();
          ctx.arc(px, py, Math.max(iconSz * 0.70, 16), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (pImg) {
          ctx.drawImage(pImg, px - iconSz / 2, py - iconSz / 2, iconSz, iconSz);
        } else {
          // Fallback
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P', px, py);
        }
        ctx.restore();
      }

    }

    // Draw ports (harbors) on coastal edges (each port covers two adjacent settlement nodes).
    const ports = state.geom.ports || [];
    if (ports.length) {
      for (const p of ports) {
        const e = state.geom.edges && state.geom.edges[p.edgeId];
        if (!e) continue;
        const na = state.geom.nodes && state.geom.nodes[e.a];
        const nb = state.geom.nodes && state.geom.nodes[e.b];
        if (!na || !nb) continue;

        const mid = { x: (na.x + nb.x) / 2, y: (na.y + nb.y) / 2 };

        // Prefer placing the marker toward the sea-side of the coast edge (land->sea direction).
        let dx = mid.x, dy = mid.y;
        if (p.seaTileId != null && p.landTileId != null) {
          const sea = state.geom.tiles && state.geom.tiles[p.seaTileId];
          const land = state.geom.tiles && state.geom.tiles[p.landTileId];
          if (sea && land) {
            dx = sea.cx - land.cx;
            dy = sea.cy - land.cy;
          }
        }
        const dlen = Math.hypot(dx, dy) || 1;
        dx /= dlen; dy /= dlen;

        const portPos = { x: mid.x + dx * 0.30, y: mid.y + dy * 0.30 };
        const ms = worldToScreen(mid);
        const ps = worldToScreen(portPos);

        // Highlight the exact edge the port applies to and draw a short leader line to the marker.
        const as = worldToScreen({ x: na.x, y: na.y });
        const bs = worldToScreen({ x: nb.x, y: nb.y });
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(as.x, as.y);
        ctx.lineTo(bs.x, bs.y);
        ctx.stroke();

        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ms.x, ms.y);
        ctx.lineTo(ps.x, ps.y);
        ctx.stroke();
        ctx.restore();

        // Port marker (icon)
        const pk = (p.kind === 'generic') ? 'generic' : String(p.kind);
        const portImg = images[`port_${pk}`];

        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.strokeStyle = 'rgba(255,255,255,.65)';
        ctx.lineWidth = 1;
        const hexH2 = 2 * view.scale;
        const pr = Math.max(10, Math.round((hexH2 / 4) * 0.52));
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (portImg) {
          const hexH = 2 * view.scale;
          const sz = Math.round(hexH / 4);
          ctx.globalAlpha = 1;
          ctx.drawImage(portImg, ps.x - sz / 2, ps.y - sz / 2, sz, sz);
        } else {
          // Fallback to text if the asset isn't available
          ctx.fillStyle = 'rgba(255,255,255,.92)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 10px ui-monospace, monospace';
          if (p.kind === 'generic') ctx.fillText('3:1', ps.x, ps.y);
          else ctx.fillText('2:1', ps.x, ps.y);
        }
        ctx.restore();
      }
    }

    // Setup helpers: subtle highlights for valid placements
    const myTurn = (state.currentPlayerId === myPlayerId);
    if (myTurn) {
      const phase = state.phase;

      if (phase === 'setup1-settlement' || phase === 'setup2-settlement') {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 2;
        for (const n of state.geom.nodes) {
          if (nodeIsHiddenByOuterSeaTrimClient(n.id)) continue;
          if (n.building) continue;
          let ok = true;
          for (const nb of n.adj || []) {
            if (state.geom.nodes[nb].building) { ok = false; break; }
          }
          if (!ok) continue;
          const s = worldToScreen({ x: n.x, y: n.y });
          ctx.beginPath();
          ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (phase === 'setup1-road' || phase === 'setup2-road') {
        const awaiting = state.setup && state.setup.awaiting;
        if (awaiting && awaiting.playerId === myPlayerId) {
          const nid = awaiting.nodeId;
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          const seafarers = ((state && state.rules && state.rules.mapMode) || 'classic') === 'seafarers';
          const wantShip = seafarers && inputMode && inputMode.kind === 'place_ship';
          for (const e of state.geom.edges) {
            if (e.roadOwner || e.shipOwner) continue;
            if (e.a !== nid && e.b !== nid) continue;
            if (edgeIsHiddenByOuterSeaTrimClient(e.id)) continue;

            const touchesSea = edgeTouchesSeaAfterOuterSeaTrimClient(e.id);
            const touchesLand = edgeTouchesLandAfterOuterSeaTrimClient(e.id);
            if (wantShip) {
              if (!touchesSea) continue;
            } else {
              if (!touchesLand) continue;
            }

            const a = state.geom.nodes[e.a];
            const b = state.geom.nodes[e.b];
            const as = worldToScreen({ x: a.x, y: a.y });
            const bs = worldToScreen({ x: b.x, y: b.y });
            ctx.beginPath();
            ctx.moveTo(as.x, as.y);
            ctx.lineTo(bs.x, bs.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // Draw roads + ships
    for (const e of state.geom.edges) {
      if (edgeIsHiddenByOuterSeaTrimClient(e.id)) continue;
      const a = state.geom.nodes[e.a];
      const b = state.geom.nodes[e.b];
      const as = worldToScreen({ x: a.x, y: a.y });
      const bs = worldToScreen({ x: b.x, y: b.y });
      screenCache.edges.push({ id: e.id, ax: as.x, ay: as.y, bx: bs.x, by: bs.y });

      if (e.roadOwner) {
        const p = state.players.find(pp => pp.id === e.roadOwner);
        const colIdx = playerColorIndex(p?.color);
        if (!drawEdgeStructureSprite('road', colIdx, as.x, as.y, bs.x, bs.y)) {
          ctx.save();
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(as.x, as.y);
          ctx.lineTo(bs.x, bs.y);
          ctx.stroke();
          ctx.restore();

          if (colorblindMode) {
            const mx = (as.x + bs.x) / 2;
            const my = (as.y + bs.y) / 2;
            const ang = Math.atan2(bs.y - as.y, bs.x - as.x);
            drawColorblindMark(colIdx, mx, my, 18, ang);
          }
        }
      }

      if (e.shipOwner) {
        const p = state.players.find(pp => pp.id === e.shipOwner);
        const colIdx = playerColorIndex(p?.color);
        if (!drawEdgeStructureSprite('ship', colIdx, as.x, as.y, bs.x, bs.y)) {
          ctx.save();
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(as.x, as.y);
          ctx.lineTo(bs.x, bs.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          if (colorblindMode) {
            const mx = (as.x + bs.x) / 2;
            const my = (as.y + bs.y) / 2;
            const ang = Math.atan2(bs.y - as.y, bs.x - as.x);
            drawColorblindMark(colIdx, mx, my, 16, ang);
          }
        }
      }
    }

    // Highlight selected ship and legal destinations when moving ships
    if (inputMode.kind === 'move_ship' && inputMode.moveShipFrom != null) {
      const e = state.geom.edges?.[inputMode.moveShipFrom];
      if (e && !edgeIsHiddenByOuterSeaTrimClient(inputMode.moveShipFrom)) {
        const a = state.geom.nodes[e.a];
        const b = state.geom.nodes[e.b];
        const as = worldToScreen({ x: a.x, y: a.y });
        const bs = worldToScreen({ x: b.x, y: b.y });
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(as.x, as.y);
        ctx.lineTo(bs.x, bs.y);
        ctx.stroke();
        ctx.setLineDash([10, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(as.x, as.y);
        ctx.lineTo(bs.x, bs.y);
        ctx.stroke();
        ctx.restore();
      }

      const targetSet = new Set(Array.isArray(inputMode.moveShipTargets) ? inputMode.moveShipTargets : []);
      if (targetSet.size) {
        for (const tid of targetSet) {
          if (edgeIsHiddenByOuterSeaTrimClient(tid)) continue;
          const te = state.geom.edges?.[tid];
          if (!te) continue;
          const a = state.geom.nodes[te.a];
          const b = state.geom.nodes[te.b];
          if (!a || !b) continue;
          const as = worldToScreen({ x: a.x, y: a.y });
          const bs = worldToScreen({ x: b.x, y: b.y });
          ctx.save();
          ctx.strokeStyle = 'rgba(120,255,180,.9)';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(as.x, as.y);
          ctx.lineTo(bs.x, bs.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw nodes + buildings
    for (const n of state.geom.nodes) {
      if (nodeIsHiddenByOuterSeaTrimClient(n.id)) continue;
      const s = worldToScreen({ x: n.x, y: n.y });
      screenCache.nodes.push({ id: n.id, sx: s.x, sy: s.y });

      // node dot
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!n.building) continue;
      const p = state.players.find(pp => pp.id === n.building.owner);
      const col = p?.color || '#ffffff';

      if (n.building.type === 'settlement') {
        drawSettlement(s.x, s.y, col);
      } else {
        drawCity(s.x, s.y, col);
      }
    }

    // Re-draw robber/pirate above roads/ships/buildings; re-draw colorblind markers after so shapes remain topmost.
    drawThiefMarkersOverlayPass(activePlayerThiefMove, thiefHighlightPhase, thiefPulse);
    drawColorblindPieceMarksOverlayPass();

    // Overlay current selection mode
    if (state.currentPlayerId === myPlayerId) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(10, 10, 260, 40);
      ctx.fillStyle = '#e8eef6';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.fillText(`Mode: ${inputMode.kind ? inputMode.kind.replaceAll('_',' ') : 'view'}`, 20, 34);
      ctx.restore();
    }

    updateShipMoveCancelPopupPosition();
  }

  function drawThiefMarkersOverlayPass(activePlayerThiefMove, thiefHighlightPhase, thiefPulse) {
    if (!state || !state.geom || !Array.isArray(state.geom.tiles)) return;
    for (const t of state.geom.tiles) {
      if (!t || (!t.robber && !t.pirate)) continue;
      if (shouldHideOuterSeaBorderTileClient(t)) continue;
      const c = worldToScreen({ x: t.cx, y: t.cy });

      if (t.robber) {
        const hexH = 2 * view.scale;
        const tokenSz = Math.round(hexH / 3);
        const iconSz = Math.round(hexH / 3);
        const rImg = images['thief_robber'] || null;
        const ox = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const oy = (t.number ? tokenSz * 0.72 : iconSz * 0.65);
        const rx = c.x + ox;
        const ry = c.y - oy;

        if (activePlayerThiefMove && (thiefHighlightPhase === 'pirate-or-robber' || thiefHighlightPhase === 'robber-move')) {
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.25 * thiefPulse;
          ctx.strokeStyle = 'rgba(255,223,128,.98)';
          ctx.lineWidth = Math.max(3, Math.round(iconSz * 0.12));
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(iconSz * 0.62, 14), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (rImg) {
          ctx.drawImage(rImg, rx - iconSz / 2, ry - iconSz / 2, iconSz, iconSz);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(rx, ry, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('R', rx, ry);
        }
        ctx.restore();
      }

      if (t.pirate) {
        const hexH = 2 * view.scale;
        const iconSz = Math.round((hexH / 4) * 1.16);
        const pImg = images['thief_pirate'] || null;
        const px = c.x;
        const py = c.y;

        if (activePlayerThiefMove && (thiefHighlightPhase === 'pirate-or-robber' || thiefHighlightPhase === 'pirate-move')) {
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.25 * thiefPulse;
          ctx.strokeStyle = 'rgba(120,220,255,.98)';
          ctx.lineWidth = Math.max(3, Math.round(iconSz * 0.12));
          ctx.beginPath();
          ctx.arc(px, py, Math.max(iconSz * 0.70, 16), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.98;
        if (pImg) {
          ctx.drawImage(pImg, px - iconSz / 2, py - iconSz / 2, iconSz, iconSz);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(10, Math.round(iconSz * 0.38)), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P', px, py);
        }
        ctx.restore();
      }
    }
  }

  function drawColorblindPieceMarksOverlayPass() {
    if (!colorblindMode || !state || !state.geom) return;

    // Roads / ships
    if (Array.isArray(state.geom.edges)) {
      for (const e of state.geom.edges) {
        if (!e) continue;
        const a = state.geom.nodes?.[e.a];
        const b = state.geom.nodes?.[e.b];
        if (!a || !b) continue;
        const as = worldToScreen({ x: a.x, y: a.y });
        const bs = worldToScreen({ x: b.x, y: b.y });
        const mx = (as.x + bs.x) / 2;
        const my = (as.y + bs.y) / 2;
        const dx = bs.x - as.x;
        const dy = bs.y - as.y;
        const ang = Math.atan2(dy, dx);
        const dist = Math.hypot(dx, dy);
        const hexH = 2 * view.scale;

        if (e.roadOwner) {
          const p = state.players.find(pp => pp.id === e.roadOwner);
          const colIdx = playerColorIndex(p?.color);
          const len = Math.max(16, Math.round(dist * 0.5));
          const thick = Math.max(10, Math.round(hexH * 0.07));
          const base = Math.min(len, Math.max(thick * 2.5, thick + 8));
          const s = Math.max(10, Math.round(base * 0.5));
          drawColorblindMark(colIdx, mx, my, s, ang);
        }
        if (e.shipOwner) {
          const p = state.players.find(pp => pp.id === e.shipOwner);
          const colIdx = playerColorIndex(p?.color);
          const len = Math.max(16, Math.round(dist * 0.5));
          const thick = Math.max(10, Math.round(hexH * 0.08));
          const base = Math.min(len, Math.max(thick * 2.5, thick + 8));
          const s = Math.max(10, Math.round(base * 0.5));
          drawColorblindMark(colIdx, mx, my, s, ang);
        }
      }
    }

    // Settlements / cities
    if (Array.isArray(state.geom.nodes)) {
      for (const n of state.geom.nodes) {
        if (!n || !n.building) continue;
        const p = state.players.find(pp => pp.id === n.building.owner);
        const colIdx = playerColorIndex(p?.color);
        const s = worldToScreen({ x: n.x, y: n.y });
        const hexH = 2 * view.scale;
        const sz = Math.max(22, Math.round(hexH / 3));
        drawColorblindMark(colIdx, s.x, s.y, Math.max(12, Math.round(sz * 0.55)), 0);
      }
    }
  }

  function pickStructImg(colorIdx) {
    const i = (colorIdx == null ? 0 : (colorIdx | 0));
    const cand = STRUCT.imgs[i];
    if (cand && cand.complete && (cand.naturalWidth || cand.width)) return cand;
    for (const im of STRUCT.imgs) {
      if (im && im.complete && (im.naturalWidth || im.width)) return im;
    }
    return null;
  }

  function drawStructureSprite(kind, colorIdx, x, y, w, h, rotRad) {
    if (!STRUCT.ready) return false;
    const img = pickStructImg(colorIdx);
    if (!img) return false;

    const t = structTileSizeForImage(img);
    const cell = STRUCT_CELL[kind] || STRUCT_CELL.settlement;
    const sx = cell.c * t;
    const sy = cell.r * t;

    ctx.save();
    if (rotRad) {
      ctx.translate(x, y);
      ctx.rotate(rotRad);
      ctx.drawImage(img, sx, sy, t, t, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, sx, sy, t, t, x - w / 2, y - h / 2, w, h);
    }
    ctx.restore();
    if (colorblindMode) {
      const base = Math.min(w, Math.max(h * 2.5, h + 8));
      const s = Math.max(10, Math.round(base * 0.5));
      drawColorblindMark(colorIdx, x, y, s, rotRad || 0);
    }
    return true;
  }

  function drawEdgeStructureSprite(kind, colorIdx, ax, ay, bx, by) {
    if (!STRUCT.ready) return false;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const ang = Math.atan2(dy, dx);

    // Size roads/ships relative to the actual edge length so they don't stretch across the whole path.
    // Requested: render at ~half the edge length.
    const dist = Math.hypot(dx, dy);
    const hexH = 2 * view.scale;
    const isShip = kind === 'ship';
    const len = Math.max(16, Math.round(dist * 0.5));
    const thick = Math.max(10, Math.round(hexH * (isShip ? 0.08 : 0.07)));

    return drawStructureSprite(kind, colorIdx, mx, my, len, thick, ang);
  }

  function drawSettlement(x, y, color) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const sz = Math.max(22, Math.round(hexH / 3)); // match number token size
    if (drawStructureSprite('settlement', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x - 10, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (colorblindMode) {
      drawColorblindMark(colIdx, x, y, Math.max(12, Math.round(sz * 0.55)), 0);
    }
  }

  function drawCity(x, y, color) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const sz = Math.max(22, Math.round(hexH / 3)); // match number token size
    if (drawStructureSprite('city', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    const w = 18, h = 14;
    ctx.beginPath();
    ctx.rect(x - w/2, y - h/2, w, h);
    ctx.fill();
    ctx.stroke();
    // little roof
    ctx.beginPath();
    ctx.moveTo(x - w/2, y - h/2);
    ctx.lineTo(x, y - h/2 - 10);
    ctx.lineTo(x + w/2, y - h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (colorblindMode) {
      drawColorblindMark(colIdx, x, y, Math.max(12, Math.round(sz * 0.55)), 0);
    }
  }


  if (ui.texturePackSelect) {
    ui.texturePackSelect.addEventListener('change', () => {
      const targetId = String(ui.texturePackSelect.value || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
      void setActiveTexturePackById(targetId, { announce: true, forcePublish: false }).catch((err) => {
        setError(err && err.message ? err.message : 'Failed to switch texture pack.');
      });
    });
  }

  if (ui.downloadTexturePackBtn) {
    ui.downloadTexturePackBtn.addEventListener('click', () => {
      try {
        const aEl = document.createElement('a');
        aEl.href = TEXTURE_PACK_TEMPLATE_URL;
        aEl.download = 'texture-pack-template.zip';
        document.body.appendChild(aEl);
        aEl.click();
        aEl.remove();
      } catch (_) {
        window.open(TEXTURE_PACK_TEMPLATE_URL, '_blank');
      }
    });
  }

  if (ui.uploadTexturePackBtn && ui.texturePackFileInput) {
    ui.uploadTexturePackBtn.addEventListener('click', () => {
      try { ui.texturePackFileInput.value = ''; } catch (_) {}
      ui.texturePackFileInput.click();
    });
    ui.texturePackFileInput.addEventListener('change', () => {
      const file = (ui.texturePackFileInput.files && ui.texturePackFileInput.files[0]) ? ui.texturePackFileInput.files[0] : null;
      if (!file) return;
      setTexturePackStatus('Importing texture pack ZIP…');
      void importTexturePackZipFile(file).catch((err) => {
        setError(err && err.message ? err.message : 'Failed to import texture pack ZIP.');
        refreshTexturePackUi();
      });
    });
  }

  if (ui.deleteTexturePackBtn) {
    ui.deleteTexturePackBtn.addEventListener('click', () => {
      const active = activeTexturePackMeta();
      if (!active || !active.id || active.id === DEFAULT_TEXTURE_PACK_ID) return;
      void deleteLocalTexturePack(active.id).then((ok) => {
        if (ok) setTexturePackStatus(`Deleted ${active.name}.`);
      }).catch((err) => {
        setError(err && err.message ? err.message : 'Failed to delete texture pack.');
      });
    });
  }


  // initial view centering
  function autoCenterOnce() {
    if (!state) return;
    // put origin near center of board in screen
    view.ox = 0;
    view.oy = 0;
  }
  autoCenterOnce();
  initTabUiScale();

})();
