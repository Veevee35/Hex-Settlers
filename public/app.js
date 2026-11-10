
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ADMIN_PORTAL_HOST = 'admin.hexsettlers.org';
  const IS_ADMIN_PORTAL = window.location.hostname.toLowerCase() === ADMIN_PORTAL_HOST;
  if (IS_ADMIN_PORTAL) {
    document.body.classList.add('admin-portal');
    document.title = 'Hex Settlers | Management';
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = '/admin-portal.css';
    document.head.appendChild(styles);
    const toolbar = document.createElement('header');
    toolbar.id = 'adminPortalBar';
    toolbar.innerHTML = '<span class="adminPortalBrand">HEX SETTLERS <span>Management</span></span><div class="adminPortalTools"><button id="adminPortalDashboardBtn" class="btn" type="button">Dashboard</button><button id="adminPortalMyAccountBtn" class="btn" type="button">My account</button><button id="adminPortalSignOutBtn" class="btn" type="button">Sign out</button></div>';
    document.body.appendChild(toolbar);
    const landingTitle = $('authLanding')?.querySelector('h1');
    if (landingTitle) landingTitle.textContent = 'Management Sign In';
    const landingLead = $('authLanding')?.querySelector('.portalLead');
    if (landingLead) landingLead.textContent = 'Restricted access for authorized Hex Settlers administrators.';
    toolbar.querySelector('#adminPortalDashboardBtn').addEventListener('click', () => {
      if (authUser?.isAdmin) openAdminManagementScreen();
    });
    toolbar.querySelector('#adminPortalMyAccountBtn').addEventListener('click', () => {
      if (authUser?.isAdmin) openUserManagementScreen({ selfOnly: true });
    });
    toolbar.querySelector('#adminPortalSignOutBtn').addEventListener('click', () => {
      $('accountLogoutBtn')?.click();
    });
    const denied = document.createElement('div');
    denied.id = 'adminPortalDenied';
    denied.className = 'hidden';
    denied.innerHTML = '<div class="adminPortalDeniedCard"><h1>Restricted area</h1><p>This account does not have management privileges.</p><button id="adminPortalDeniedSignOut" class="btn primary" type="button">Sign out</button></div>';
    denied.querySelector('button').addEventListener('click', () => $('accountLogoutBtn')?.click());
    document.body.appendChild(denied);
  }
  let adminPortalOpenedFor = '';


  // Local asset cache (PNGs/WAVs): versioned service worker with safe cache rollover.
  const ASSET_CACHE_SW_BUILD = 'release-v1.0.5';
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
  if (!IS_ADMIN_PORTAL) registerAssetCacheServiceWorker();
  window.addEventListener('hexsettlers:languagechange', () => {
    try { if (typeof render === 'function') render(); } catch (_) {}
  });

  const ui = {
    connDot: $('connDot'),
    accountOrb: $('accountOrb'),
    connText: $('connText'),
    nameInput: $('nameInput'),
    codeInput: $('codeInput'),
    usernameInput: $('usernameInput'),
    passwordInput: $('passwordInput'),
    registerBtn: $('registerBtn'),
    loginBtn: $('loginBtn'),
    logoutBtn: $('logoutBtn'),
    forgotPasswordBtn: $('forgotPasswordBtn'),
    userManagementBtn: $('userManagementBtn'),
    authStatus: $('authStatus'),
    authStats: $('authStats'),
    rejoinLastBtn: $('rejoinLastBtn'),
    lastRoomHint: $('lastRoomHint'),
    myAccountLabel: $('myAccountLabel'),
    texturePackSelect: $('texturePackSelect'),
    downloadTexturePackBtn: $('downloadTexturePackBtn'),
    uploadTexturePackBtn: $('uploadTexturePackBtn'),
    deleteTexturePackBtn: $('deleteTexturePackBtn'),
    texturePackFileInput: $('texturePackFileInput'),
    texturePackStatus: $('texturePackStatus'),
    createBtn: $('createBtn'),
    lobbyRulesBtn: $('lobbyRulesBtn'),
    rulesPage: $('rulesPage'),
    rulesPageCloseBtn: $('rulesPageCloseBtn'),
    rulesPageTitle: $('rulesPageTitle'),
    rulesPageSubtitle: $('rulesPageSubtitle'),
    rulesPageNav: $('rulesPageNav'),
    rulesPageCategoryTabs: $('rulesPageCategoryTabs'),
    rulesPageScenarioTabs: $('rulesPageScenarioTabs'),
    rulesPageContent: $('rulesPageContent'),
    joinBtn: $('joinBtn'),
    readyBtn: $('readyBtn'),
    startBtn: $('startBtn'),
    lobbyCard: $('lobbyCard'),
    setupCard: $('setupCard'),
    discardLimitInput: $('discardLimitInput'),
    friendlyRobberToggle: $('friendlyRobberToggle'),
    timerSpeedSelect: $('timerSpeedSelect'),
    diceAlgorithmSelect: $('diceAlgorithmSelect'),
    baseResourceCountSelect: $('baseResourceCountSelect'),
    mapModeSelect: $('mapModeSelect'),
    mapFamilySelect: $('mapFamilySelect'),
    classicCustomMapToggle: $('classicCustomMapToggle'),
    classicCustomMapRow: $('classicCustomMapRow'),
    classic56Note: $('classic56Note'),
    sixIslandsNote: $('sixIslandsNote'),
    scenarioRow: $('scenarioRow'),
    mapScenarioSelect: $('mapScenarioSelect'),
    scenario56Row: $('scenario56Row'),
    scenario78Note: $('scenario78Note'),
    scenario78Row: $('scenario78Row'), mapScenario78Select: $('mapScenario78Select'),
    playerCountSelect: $('playerCountSelect'),
    mapScenario56Select: $('mapScenario56Select'),
    explorationPointsRow: $('explorationPointsRow'),
    explorationPointsToggle: $('explorationPointsToggle'),
    testBuilderRow: $('testBuilderRow'),
    testToolSelect: $('testToolSelect'),
    testBrushSelect: $('testBrushSelect'),
    testNumberSelect: $('testNumberSelect'),
    testPortSelect: $('testPortSelect'),
    testResetBtn: $('testResetBtn'),
    customMapDownloadBtn: $('customMapDownloadBtn'),
    customMapUploadBtn: $('customMapUploadBtn'),
    customMapUploadInput: $('customMapUploadInput'),
    victoryPointsSelect: $('victoryPointsSelect'),
    devDeckModeSelect: $('devDeckModeSelect'),
    randomMapAtStartToggle: $('randomMapAtStartToggle'),
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
    texturePackBtn: $('texturePackBtn'),
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
    playersList: $('playersList'),
    rankedScenarioVote: $('rankedScenarioVote'),
    colorPickerRow: $('colorPickerRow'),
    colorPicker: $('colorPicker'),
    aiFillRow: $('aiFillRow'),
    aiDifficultySelect: $('aiDifficultySelect'),
    aiFillSelect: $('aiFillSelect'),
    aiFillMaxBtn: $('aiFillMaxBtn'),
    aiFillBtn: $('aiFillBtn'),
    aiClearBtn: $('aiClearBtn'),
    errBox: $('errBox'),
    turnInfo: $('turnInfo'),
    timerInfo: $('timerInfo'),
    extraTurnBanner: $('extraTurnBanner'),
    placementTurnBanner: $('placementTurnBanner'),
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
    yourRollBanner: $('yourRollBanner'),
    extraTurnCenterBanner: $('extraTurnCenterBanner'),
    countdownClock: $('countdownClock'),
    pauseBtn: $('pauseBtn'),
    playBtn: $('playBtn'),
    backTurnBtn: $('backTurnBtn'),
    pausedOverlay: $('pausedOverlay'),
    historyReplayBar: $('historyReplayBar'),
    historyReplayExitBtn: $('historyReplayExitBtn'),
    historyReplayPrevBtn: $('historyReplayPrevBtn'),
    historyReplayNextBtn: $('historyReplayNextBtn'),
    historyReplayStep: $('historyReplayStep'),
    historyReplayAction: $('historyReplayAction'),
    historyReplayLogBtn: $('historyReplayLogBtn'),
    historyReplaySlider: $('historyReplaySlider'),
    historyReplayTimelineEnd: $('historyReplayTimelineEnd'),
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
    pgRematchBtn: $('pgRematchBtn'),
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


  // v21 mobile split view: keep the game sidebar visible below the canvas.
  // Save its relative height so it adapts to phone rotation and screen sizes.
  const MOBILE_SPLIT_RATIO_KEY = 'hexsettlers_mobile_game_panel_ratio_v21';
  const MOBILE_LANDSCAPE_RATIO_KEY = 'hexsettlers_mobile_game_landscape_ratio_v23';
  const mobileLandscape = () => window.innerWidth > window.innerHeight && window.innerHeight < 550;
  let lastMobileLandscape = mobileLandscape();
  const MOBILE_SPLITTER_PX = 28;
  const mobilePinnedResources = $('mobilePinnedResources');
  const mobileGameSplitter = $('mobileGameSplitter');
  const gameBoardWrap = document.querySelector('section.boardWrap');
  const isMobileGameSplit = () => window.matchMedia('(max-width:900px), (pointer:coarse) and (max-width:1180px)').matches;
  function savedMobileSplitRatio() {
    try {
      const value = Number(localStorage.getItem(mobileLandscape() ? MOBILE_LANDSCAPE_RATIO_KEY : MOBILE_SPLIT_RATIO_KEY));
      if (Number.isFinite(value) && value >= 0.12 && value <= 0.82) return value;
    } catch (_) {}
    return mobileLandscape() ? .30 : .40;
  }
  let mobileSplitRatio = savedMobileSplitRatio();
  function setMobileSplitRatio(value, { persist = false, redraw = false } = {}) {
    if (!gameBoardWrap || !mobileGameSplitter || !isMobileGameSplit()) return;
    const height = gameBoardWrap.getBoundingClientRect().height;
    if (height < 1) return;
    const landscape = mobileLandscape();
    const clockHeight = document.querySelector('.rightHud')?.getBoundingClientRect().height || 100;
    const topBarHeight = ui.toolsCard?.getBoundingClientRect().bottom || 47;
    const minBoard = landscape
      ? Math.max(155, Math.ceil(clockHeight + topBarHeight + 12))
      : Math.min(290, Math.max(145, Math.round(height * .34)));
    const minPanel = landscape ? 46 : Math.min(150, Math.max(90, Math.round(height * .2)));
    const fixedRows = landscape ? [ui.rollDock, ui.turnCard, mobilePinnedResources, mobileGameSplitter]
      .reduce((total, node) => total + (node?.getBoundingClientRect().height || 0), 0) : MOBILE_SPLITTER_PX;
    const maxPanel = Math.max(minPanel, height - minBoard - fixedRows);
    const orientationChanged = lastMobileLandscape !== landscape;
    if (orientationChanged) { mobileSplitRatio = savedMobileSplitRatio(); lastMobileLandscape = landscape; }
    const requested = orientationChanged ? mobileSplitRatio : (Number.isFinite(Number(value)) ? Number(value) : mobileSplitRatio);
    const pixels = Math.min(maxPanel, Math.max(minPanel, Math.round(height * requested)));
    const actualRatio = pixels / height;
    mobileSplitRatio = actualRatio;
    const newValue = `${pixels}px`;
    if (gameBoardWrap.style.getPropertyValue('--mobile-sidebar-height') !== newValue) {
      gameBoardWrap.style.setProperty('--mobile-sidebar-height', newValue);
      if (redraw) { resizeCanvas(); render(); }
    }
    mobileGameSplitter.setAttribute('aria-valuemin', String(Math.round(minPanel / height * 100)));
    mobileGameSplitter.setAttribute('aria-valuemax', String(Math.round(maxPanel / height * 100)));
    mobileGameSplitter.setAttribute('aria-valuenow', String(Math.round(actualRatio * 100)));
    mobileGameSplitter.setAttribute('aria-valuetext', `${Math.round(actualRatio * 100)} percent for game panels`);
    if (persist) {
      try { localStorage.setItem(landscape ? MOBILE_LANDSCAPE_RATIO_KEY : MOBILE_SPLIT_RATIO_KEY, String(actualRatio)); } catch (_) {}
    }
    return actualRatio;
  }
  function ensureMobileGameSplitter() {
    if (!mobileGameSplitter || mobileGameSplitter.dataset.ready === '1') return;
    mobileGameSplitter.dataset.ready = '1';
    let pointer = null;
    const end = (ev) => {
      if (pointer === null || (ev && ev.pointerId !== pointer)) return;
      try { mobileGameSplitter.releasePointerCapture(pointer); } catch (_) {}
      pointer = null;
      mobileGameSplitter.classList.remove('isDragging');
      setMobileSplitRatio(mobileSplitRatio, { persist: true });
    };
    mobileGameSplitter.addEventListener('pointerdown', (ev) => {
      if (!isMobileGameSplit() || (ev.button != null && ev.button !== 0)) return;
      pointer = ev.pointerId;
      mobileGameSplitter.classList.add('isDragging');
      mobileGameSplitter.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
    });
    mobileGameSplitter.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== pointer || !gameBoardWrap) return;
      const rect = gameBoardWrap.getBoundingClientRect();
      setMobileSplitRatio((rect.bottom - ev.clientY - MOBILE_SPLITTER_PX / 2) / rect.height, { redraw: true });
      ev.preventDefault();
    });
    mobileGameSplitter.addEventListener('pointerup', end);
    mobileGameSplitter.addEventListener('pointercancel', end);
    mobileGameSplitter.addEventListener('lostpointercapture', () => {
      if (pointer !== null) { pointer = null; mobileGameSplitter.classList.remove('isDragging'); setMobileSplitRatio(mobileSplitRatio, { persist: true }); }
    });
    mobileGameSplitter.addEventListener('keydown', (ev) => {
      if (!isMobileGameSplit() || !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(ev.key)) return;
      ev.preventDefault();
      const delta = ev.key === 'ArrowUp' || ev.key === 'PageUp' ? 1 : -1;
      const step = ev.key.startsWith('Page') ? .12 : .04;
      const requested = ev.key === 'Home' ? .12 : ev.key === 'End' ? .82 : mobileSplitRatio + delta * step;
      setMobileSplitRatio(requested, { persist: true, redraw: true });
    });
  }

  const ctx = ui.canvas.getContext('2d');

  const DEFAULT_TEXTURE_PACK_ID = 'default';
  const SIMPLIFIED_TEXTURE_PACK_ID = 'simplified';
  const TEXTURE_PACK_META_KEY = 'hexsettlers_texture_pack_meta_v1';
  const TEXTURE_PACK_BROWSER_CACHE = 'hexsettlers-asset-cache-texturepack-v1';
  const TEXTURE_PACK_TEMPLATE_URL = '/texture-pack-template.zip';
  const DEFAULT_TEXTURE_ASSET_REL = ["gold-resource.png", "Dev Cards/Invention.png", "Dev Cards/Knight.png", "Dev Cards/Monopoly.png", "Dev Cards/RoadBuilding.png", "Dev Cards/VictoryPoint.png", "Numbers/10.png", "Numbers/11.png", "Numbers/12.png", "Numbers/2.png", "Numbers/3.png", "Numbers/4.png", "Numbers/5.png", "Numbers/6.png", "Numbers/8.png", "Numbers/9.png", "Ports/brick.png", "Ports/generic.png", "Ports/grain.png", "Ports/lumber.png", "Ports/ore.png", "Ports/wool.png", "Resource Hexes/Desert.png", "Resource Hexes/Field.png", "Resource Hexes/Forest.png", "Resource Hexes/GoldFields.png", "Resource Hexes/Hills.png", "Resource Hexes/Mountains.png", "Resource Hexes/Pasture.png", "Resource Hexes/Seas.png", "Resource Hexes/Unexplored.png", "Robber Pirate/thief_pirate.png", "Robber Pirate/thief_robber.png", "Tokens/tokens_black.png", "Tokens/tokens_blue.png", "Tokens/tokens_green.png", "Tokens/tokens_orange.png", "Tokens/tokens_pink.png", "Tokens/tokens_purple.png", "Tokens/tokens_red.png", "Tokens/tokens_teal.png", "Tokens/tokens_white.png", "Tokens/tokens_yellow.png"];
  const DEFAULT_TEXTURE_ASSET_SET = new Set(DEFAULT_TEXTURE_ASSET_REL);
  const DEFAULT_TEXTURE_PACK_LABEL = 'Default';
  const BUILTIN_TEXTURE_PACKS = Object.freeze([
    Object.freeze({ id: DEFAULT_TEXTURE_PACK_ID, name: DEFAULT_TEXTURE_PACK_LABEL, assets: DEFAULT_TEXTURE_ASSET_REL.slice(), builtin: true, deletable: false, savedAt: 0 }),
    Object.freeze({ id: SIMPLIFIED_TEXTURE_PACK_ID, name: 'Simplified', assets: DEFAULT_TEXTURE_ASSET_REL.slice(), builtin: true, deletable: false, savedAt: 0 }),
  ]);
  let pendingTexturePackSelectId = null;
  const texturePackRoomPublished = Object.create(null);
  const texturePackRoomPublishPromises = Object.create(null);
  const texturePackSessionUrls = Object.create(null);
  let texturePackAnnounceQueued = false;

  function texturePackMetaDefaults() {
    return { activeId: DEFAULT_TEXTURE_PACK_ID, packs: [] };
  }

  function getBuiltinTexturePackMeta(packId) {
    const id = String(packId || '').trim().toLowerCase();
    return BUILTIN_TEXTURE_PACKS.find((pack) => pack.id === id) || null;
  }

  function isBuiltinTexturePackId(packId) {
    return !!getBuiltinTexturePackMeta(packId);
  }

  function validTexturePackId(packId) {
    const id = String(packId || '').trim();
    return /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id) ? id : '';
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
      if (!id || isBuiltinTexturePackId(id)) continue;
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
    if (!isBuiltinTexturePackId(activeId) && !packs.some(p => p.id === activeId)) activeId = DEFAULT_TEXTURE_PACK_ID;
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
    const rows = BUILTIN_TEXTURE_PACKS.slice();
    for (const p of (texturePackMetaState.packs || [])) rows.push(p);
    return rows;
  }

  function getLocalTexturePackMeta(packId) {
    const id = String(packId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    const builtin = getBuiltinTexturePackMeta(id);
    if (builtin) return builtin;
    return (texturePackMetaState.packs || []).find(p => p && p.id === id) || null;
  }

  function activeTexturePackId() {
    const id = String(texturePackMetaState.activeId || DEFAULT_TEXTURE_PACK_ID).trim();
    if (!id) return DEFAULT_TEXTURE_PACK_ID;
    if (isBuiltinTexturePackId(id)) return id;
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

  function builtinTexturePackUrl(packId, rel) {
    const builtin = getBuiltinTexturePackMeta(packId);
    const norm = normalizeTextureAssetRelPath(rel);
    if (!builtin || !norm) return '';
    if (builtin.id === DEFAULT_TEXTURE_PACK_ID) return defaultTexturePackUrl(norm);
    return `/texture-packs/${encodeURIComponent(builtin.id)}/${norm.split('/').map(seg => encodeURIComponent(seg)).join('/')}`;
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

  function resolveTextureAssetUrl(rel) {
    const norm = normalizeTextureAssetRelPath(rel);
    if (!norm) return '';
    const active = activeTexturePackMeta();
    if (active && active.builtin) return builtinTexturePackUrl(active.id, norm) || defaultTexturePackUrl(norm);
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
    if (!id || isBuiltinTexturePackId(id)) return;
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
    if (!id || isBuiltinTexturePackId(id)) return;
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
    if (!record || !record.id || isBuiltinTexturePackId(record.id)) return null;
    const next = (texturePackMetaState.packs || []).filter(p => p && p.id !== record.id);
    next.push(record);
    next.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')) || String(a.id || '').localeCompare(String(b.id || '')));
    texturePackMetaState.packs = next;
    writeTexturePackMetaState();
    return record;
  }

  async function saveTexturePackBlobsLocally(pack, incomingBlobs, options = {}) {
    const incomingId = validTexturePackId(pack && pack.id);
    const packId = incomingId && !isBuiltinTexturePackId(incomingId) ? incomingId : buildTexturePackId(pack && pack.name);
    const name = String(pack && pack.name || 'Custom Pack').trim().slice(0, 48) || 'Custom Pack';
    const savedAssets = [];
    const blobMap = Object.create(null);

    for (const [rawRel, blob] of Object.entries(incomingBlobs || {})) {
      const rel = normalizeTextureAssetRelPath(rawRel);
      if (!rel || !DEFAULT_TEXTURE_ASSET_SET.has(rel)) continue;
      if (!(blob instanceof Blob)) continue;
      try {
        await storeTexturePackBlob(packId, rel, blob);
        blobMap[rel] = blob;
        savedAssets.push(rel);
      } catch (_) {}
    }

    if (!savedAssets.length) throw new Error('No valid PNGs were imported from that texture pack.');

    const record = packRecordForSave(packId, name, savedAssets);
    upsertLocalTexturePackMeta(record);

    if (options.activate !== false) {
      texturePackMetaState.activeId = record.id;
      writeTexturePackMetaState();
      await setTexturePackSessionUrlsFromBlobs(record.id, blobMap);
    }

    refreshTexturePackUi();
    if (options.activate !== false) {
      reloadAllTextureAssets();
      queueTexturePackAnnounce(!!options.forcePublish);
    }
    return record;
  }

  async function saveTexturePackPayloadLocally(pack, options = {}) {
    const assetsObj = (pack && pack.assets && typeof pack.assets === 'object') ? pack.assets : {};
    const blobs = Object.create(null);
    for (const [rawRel, dataUrl] of Object.entries(assetsObj)) {
      const rel = normalizeTextureAssetRelPath(rawRel);
      const url = String(dataUrl || '').trim();
      if (!rel || !DEFAULT_TEXTURE_ASSET_SET.has(rel) || !/^data:image\/png;base64,/i.test(url)) continue;
      try { blobs[rel] = await (await fetch(url)).blob(); } catch (_) {}
    }
    return await saveTexturePackBlobsLocally(pack, blobs, options);
  }

  async function deleteLocalTexturePack(packId) {
    const id = String(packId || '').trim();
    if (!id || isBuiltinTexturePackId(id)) return false;
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

  function texturePackApiBase(roomCode, packId) {
    return `/api/texture-packs/${encodeURIComponent(String(roomCode || '').trim().toUpperCase())}/${encodeURIComponent(String(packId || '').trim())}`;
  }

  async function texturePackHttpJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload || payload.ok === false) {
      throw new Error(String(payload && payload.error || `Texture-pack request failed (${response.status}).`));
    }
    return payload;
  }

  async function publishTexturePackToRoom(roomCode, packId) {
    const meta = getLocalTexturePackMeta(packId);
    if (!meta || !meta.id || meta.builtin) return true;
    const roomKey = `${String(roomCode || '').trim().toUpperCase()}|${meta.id}`;
    if (texturePackRoomPublishPromises[roomKey]) return await texturePackRoomPublishPromises[roomKey];

    const publishPromise = (async () => {
      const base = texturePackApiBase(roomCode, meta.id);
      const started = await texturePackHttpJson(base, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: meta.name }),
      });
      if (started.alreadyAvailable) return true;

      const cache = await openTexturePackBrowserCache();
      const uploads = [];
      for (const rel of (meta.assets || [])) {
        const response = await cache.match(userTextureCacheUrl(meta.id, rel), { ignoreSearch: true, ignoreVary: true });
        if (!response) continue;
        uploads.push({ rel, blob: await response.blob() });
      }
      if (!uploads.length) throw new Error('No saved PNGs were available to share from this texture pack.');

      let cursor = 0;
      const worker = async () => {
        while (cursor < uploads.length) {
          const item = uploads[cursor++];
          const assetUrl = `${base}/assets/${item.rel.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
          await texturePackHttpJson(assetUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: item.blob,
          });
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, uploads.length) }, () => worker()));
      await texturePackHttpJson(`${base}/complete`, { method: 'POST' });
      return true;
    })();

    texturePackRoomPublishPromises[roomKey] = publishPromise;
    try { return await publishPromise; }
    finally { delete texturePackRoomPublishPromises[roomKey]; }
  }

  async function ensureRoomTexturePackAnnounced(forcePublish = false) {
    texturePackAnnounceQueued = false;
    if (!roomConnectionReady || !room || !room.code || !myPlayerId || !ws || ws.readyState !== 1) return;
    const announcingSocket = ws;
    const announcingRoomCode = String(room.code || '');
    const active = activeTexturePackMeta();
    if (!active) return;
    const me = Array.isArray(room.players) ? room.players.find(p => p && p.id === myPlayerId) : null;
    const roomPackId = String((me && me.texturePackId) || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    const roomPackName = String((me && me.texturePackName) || (roomPackId === DEFAULT_TEXTURE_PACK_ID ? DEFAULT_TEXTURE_PACK_LABEL : 'Custom Pack'));

    if (active.builtin) {
      if (roomPackId !== active.id || roomPackName !== active.name) {
        send({ type: 'set_texture_pack', texturePackId: active.id, texturePackName: active.name });
      }
      texturePackRoomPublished[`${room.code}|${active.id}`] = true;
      return;
    }

    const roomKey = `${room.code}|${active.id}`;
    if (forcePublish || !texturePackRoomPublished[roomKey]) {
      try {
        await publishTexturePackToRoom(announcingRoomCode, active.id);
      } catch (error) {
        setTexturePackStatus(error && error.message ? error.message : 'Texture pack could not be shared.', true);
        return;
      }
      if (!roomConnectionReady || ws !== announcingSocket || !room || String(room.code || '') !== announcingRoomCode) {
        queueTexturePackAnnounce(forcePublish);
        return;
      }
      texturePackRoomPublished[roomKey] = true;
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

  function isCasualTextureMode() {
    // Texture UI initializes before the app's navigation/room variables do.
    // Access them defensively until those later lexical bindings exist.
    let mode = '', currentRoom = null;
    try { mode = selectedPlayMode; } catch (_) {}
    try { currentRoom = room; } catch (_) {}
    return mode === 'casual' || !!currentRoom?.casual;
  }
  function refreshTexturePackUi() {
    const casual = isCasualTextureMode();
    for (const control of [ui.downloadTexturePackBtn, ui.uploadTexturePackBtn, ui.deleteTexturePackBtn]) {
      control?.classList.toggle('hidden', casual);
    }
    if (ui.texturePackFileInput) ui.texturePackFileInput.disabled = casual;
    if (casual && !isBuiltinTexturePackId(activeTexturePackId())) {
      texturePackMetaState.activeId = DEFAULT_TEXTURE_PACK_ID;
      writeTexturePackMetaState();
      reloadAllTextureAssets();
    }
    if (ui.texturePackSelect) {
      const activeId = activeTexturePackId();
      ui.texturePackSelect.innerHTML = '';
      for (const p of listLocalTexturePacks().filter(p => !casual || p.builtin)) {
        const opt = document.createElement('option');
        opt.value = p.id;
        const count = (p.assets || []).length || 0;
        opt.textContent = `${p.name}${p.builtin ? '' : ` (${count}/${DEFAULT_TEXTURE_ASSET_REL.length})`}`;
        ui.texturePackSelect.appendChild(opt);
      }
      ui.texturePackSelect.value = activeId;
    }

    const active = activeTexturePackMeta();
    const count = (active && Array.isArray(active.assets)) ? active.assets.length : DEFAULT_TEXTURE_ASSET_REL.length;
    setTexturePackStatus(
      active && active.builtin
        ? `Active: ${active.name} — built in and available to every player.`
        : `Active: ${active.name} — ${count}/${DEFAULT_TEXTURE_ASSET_REL.length} PNGs saved locally. Missing icons fall back to default.`
    );

    if (ui.deleteTexturePackBtn) {
      const canDelete = !!(active && active.id && !active.builtin);
      ui.deleteTexturePackBtn.disabled = !canDelete;
      ui.deleteTexturePackBtn.title = canDelete ? 'Delete the currently selected custom texture pack from this browser.' : 'Built-in texture packs cannot be deleted.';
    }
  }

  async function setActiveTexturePackById(packId, options = {}) {
    const requested = String(packId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    const target = isCasualTextureMode() && !isBuiltinTexturePackId(requested) ? DEFAULT_TEXTURE_PACK_ID : requested;
    if (target !== DEFAULT_TEXTURE_PACK_ID && !getLocalTexturePackMeta(target)) throw new Error('That texture pack is not saved in this browser.');
    texturePackMetaState.activeId = target;
    writeTexturePackMetaState();
    if (!isBuiltinTexturePackId(target)) {
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

    queueTexturePackAnnounce(true);

    setTexturePackStatus(`Imported ${record.name}. ${rels.length}/${DEFAULT_TEXTURE_ASSET_REL.length} PNGs saved. Missing icons will fall back to default.`);
  }

  async function saveSharedTexturePackFromManifest(pack) {
    const packId = validTexturePackId(pack && pack.id);
    if (!packId) throw new Error('That shared texture pack has an invalid ID.');
    const builtin = getBuiltinTexturePackMeta(packId);
    if (builtin) return builtin;
    if (!roomConnectionReady || !room || !room.code) throw new Error('Reconnect to the lobby before fetching that texture pack.');

    const rels = Array.from(new Set((Array.isArray(pack && pack.assets) ? pack.assets : [])
      .map(normalizeTextureAssetRelPath)
      .filter((rel) => DEFAULT_TEXTURE_ASSET_SET.has(rel))));
    if (!rels.length) throw new Error('That shared texture pack contains no usable PNGs.');

    const base = texturePackApiBase(room.code, packId);
    const blobs = Object.create(null);
    let cursor = 0;
    const worker = async () => {
      while (cursor < rels.length) {
        const rel = rels[cursor++];
        const assetUrl = `${base}/assets/${rel.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
        const response = await fetch(assetUrl, { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) {
          let errorText = '';
          try { errorText = String((await response.json()).error || ''); } catch (_) {}
          throw new Error(errorText || `Could not download ${rel}.`);
        }
        blobs[rel] = await response.blob();
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, rels.length) }, () => worker()));
    return await saveTexturePackBlobsLocally({ id: packId, name: pack && pack.name }, blobs, { activate: false, forcePublish: false });
  }

  async function downloadSharedTexturePack(packId) {
    if (!roomConnectionReady || !room || !room.code) throw new Error('Reconnect to the lobby before fetching that texture pack.');
    const payload = await texturePackHttpJson(texturePackApiBase(room.code, packId));
    return await saveSharedTexturePackFromManifest(payload.pack || null);
  }

  async function handlePlayerTexturePackChoice(player) {
    const targetId = String(player && player.texturePackId || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
    if (isBuiltinTexturePackId(targetId)) {
      await setActiveTexturePackById(targetId, { announce: true, forcePublish: false });
      return;
    }
    if (getLocalTexturePackMeta(targetId)) {
      await setActiveTexturePackById(targetId, { announce: true, forcePublish: false });
      return;
    }
    pendingTexturePackSelectId = targetId;
    setTexturePackStatus(`Fetching ${String(player && player.texturePackName || 'texture pack')} from the lobby…`);
    try {
      const record = await downloadSharedTexturePack(targetId);
      if (!record) throw new Error('Failed to save that texture pack.');
      pendingTexturePackSelectId = null;
      if (room && room.code) texturePackRoomPublished[`${room.code}|${record.id}`] = true;
      await setActiveTexturePackById(record.id, { announce: true, forcePublish: false });
    } catch (error) {
      pendingTexturePackSelectId = null;
      throw error;
    }
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
  if (!isBuiltinTexturePackId(activeTexturePackId())) {
    setTimeout(() => {
      void hydrateTexturePackSessionUrls(activeTexturePackId()).then(() => {
        try { reloadAllTextureAssets(); } catch (_) {}
      }).catch(() => {});
    }, 0);
  }


  // Lobby: track whether the host explicitly changed the VP target so we don't
  // auto-overwrite it when toggling map/scenario.
  let vpTouched = false;
  let baseResourceCountTouched = false;

  const AUTH_TOKEN_KEY = 'hexsettlers_auth_token_v1';
  const LAST_ROOM_KEY = 'hexsettlers_last_room_v1';
  const RECENT_ROOM_KEY = 'hexsettlers_recent_room_v32';
  const RECENT_ROOM_WINDOW_MS = 5 * 60 * 1000;

  // Only a server-confirmed, account-matched room within five minutes can be
  // reopened automatically. The older last-room preference is manual-only.
  function recentRoomSessionForUser(user = authUser, nowMs = Date.now()) {
    if (!user || !user.id) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_ROOM_KEY) || 'null');
      if (!saved || saved.userId !== String(user.id)) return null;
      // An incomplete account may resume only its own tutorial; never an old
      // ordinary room cached before tutorial enforcement was enabled.
      if (user.tutorialCompleted !== true && saved.tutorial !== true) return null;
      const code = String(saved.code || '').trim().toUpperCase();
      const age = nowMs - Number(saved.lastSeenAt);
      if (/^[A-Z0-9]{4,8}$/.test(code) && Number.isFinite(age) && age >= 0 && age <= RECENT_ROOM_WINDOW_MS) {
        return { code, tutorial: saved.tutorial === true };
      }
      localStorage.removeItem(RECENT_ROOM_KEY);
    } catch (_) {}
    return null;
  }

  function recentRoomCodeForUser(user = authUser, nowMs = Date.now()) {
    return recentRoomSessionForUser(user, nowMs)?.code || '';
  }

  function noteRecentRoom(roomSnapshot = room) {
    if (!authUser?.id || !roomSnapshot?.code || !roomConnectionReady) return;
    if (state?.phase === 'game-over') return;
    try {
      localStorage.setItem(RECENT_ROOM_KEY, JSON.stringify({
        userId: String(authUser.id), code: String(roomSnapshot.code).trim().toUpperCase(),
        lastSeenAt: Date.now(), tutorial: !!roomSnapshot.tutorial,
      }));
    } catch (_) {}
  }

  function clearRecentRoom() {
    try { localStorage.removeItem(RECENT_ROOM_KEY); } catch (_) {}
  }

  function clearRoomQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!['room', 'code', 'spectator'].some(key => url.searchParams.has(key))) return;
      for (const key of ['room', 'code', 'spectator']) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
  }

  function prepareUncreatedLobby() {
    // This function is only used when no room is bound. Discard any former
    // game state so the game HUD can never cover the empty-lobby page.
    if (room) return;
    state = null;
    pendingDirectJoinRoomCode = null;
    pendingDirectJoinAsSpectator = false;
    pendingManualRejoinCode = '';
    if (ui.codeInput) ui.codeInput.value = '';
    clearRoomQueryFromUrl();
    renderLobby();
    updateButtons();
  }
  const AUTO_CREATE_ROOM_KEY = 'hexsettlers_auto_create_room_v1';
  const TAB_UI_SCALE_KEY = 'hexsettlers_tab_ui_scale_v1';
  const TAB_UI_SCALE_MIN = 0.8;
  const TAB_UI_SCALE_MAX = 3.0;
  const TAB_UI_SCALE_STEP = 0.1;
  const TOOL_UI_SCALE_PREFIX = 'hexsettlers_tool_ui_scale_v1_';
  const TOOL_UI_SCALE_MIN = 0.8;
  const TOOL_UI_SCALE_MAX = 3.0;
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
    { key: 'dice_roll_self', label: 'Your Dice Roll' },
    { key: 'dice_roll_others', label: "Other Players' Dice Rolls" },
    { key: 'gold_field_production', label: 'Gold Field Production' },
    { key: 'robber_pirate', label: 'Robber / Pirate' },
    { key: 'stolen_from', label: 'Stolen From (Robber / Pirate / Monopoly)' },
    { key: 'structure', label: 'Build / Upgrade' },
    { key: 'end_turn_self', label: 'Your End Turn Warning' },
    { key: 'end_turn_others', label: "Other Players' End Turn Warnings" },
    { key: 'dev_card', label: 'Dev Card' },
    { key: 'trade_proposed', label: 'Trade Proposed' },
    { key: 'trade_success', label: 'Trade Success' },
    { key: 'game_winner', label: 'Winner Sound' },
    { key: 'game_loser', label: 'Loser Sound' },
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
  let selectedPlayMode = (() => { try { return sessionStorage.getItem('hexsettlers_play_mode') || ''; } catch (_) { return ''; } })();
  let journeyView = 'home';
  let weeklyChallengeCatalog = null;
  let selectedChallengePlayerCount = 4;
  let selectedChallengeKind = 'weekly';
  const challengeLeaderboardSort = new Map(); // Preserve sorts when the weekly catalog refreshes.
  let requestedLobbyVisibility = 'private';
  let roomNotFoundVisible = false;
  let roomNotFoundReturnView = ''; // Preserve the discovery hierarchy after a failed lobby join.
  let tutorialContinueToAllGames = false;
  function tutorialUnlocked() { return authUser?.tutorialCompleted === true; }
  function liveTutorialRoom() { return !!(room && room.tutorial && room.tutorial.ownerId === myPlayerId); }
  function beginLiveTutorial() {
    if (!authUser || authUser.needsUsernameSetup) { setError('Log in and select a username first.'); return; }
    if (room) { setError('Leave your current room to replay the tutorial.'); return; }
    if (ws?.readyState !== WebSocket.OPEN || !websocketAuthenticated) {
      setError('Connect to the game server before starting your adventure.');
      websocketReconnectAllowed = true;
      scheduleWebsocketReconnect(0);
      return;
    }
    selectedPlayMode = 'casual';
    try { sessionStorage.setItem('hexsettlers_play_mode', 'casual'); } catch (_) {}
    state = null;
    updateAuthUi();
    send({ type:'create_tutorial_room' });
  }
  function refreshTutorialGuide() {
    const guide = $('tutorialGuide');
    if (!guide) return;
    const active = liveTutorialRoom();
    guide.classList.toggle('hidden', !active);
    document.body.classList.toggle('live-tutorial', active);
    document.querySelectorAll('.tutorialAttention').forEach(node => node.classList.remove('tutorialAttention'));
    if (!active) return;
    const phase = String(state?.phase || 'lobby');
    const progress = state?.tutorial || {};
    const total = Math.min(8, Number(progress.settlements || 0) + Number(progress.roads || 0) + Number(progress.rolls || 0) + Number(progress.endedTurns || 0));
    $('tutorialGuideProgress').textContent = `${total} / 8 actions`;
    const ownTurn = state?.currentPlayerId === myPlayerId;
    let title = '', body = '', hint = '', target = null;
    const primary = $('tutorialGuidePrimary');
    primary.classList.add('hidden');
    $('tutorialGuideExit').textContent = progress.completed ? 'Back to game types' : 'Exit tutorial & unlock';
    if (phase === 'lobby') {
      title = '1. Explore a real game lobby';
      body = 'This is your actual lobby, with the live Classic map preview and normal Game Setup panel. One AI shares a two-player match on the standard four-player 19-hex board.';
      hint = 'Notice the map, player seats, victory point target, dice and timer rules. Settings are locked for consistent practice. Start when you are ready.';
      primary.textContent = 'Begin practice game'; primary.classList.remove('hidden');
      target = 'setupCard';
    } else if (progress.completed || tutorialUnlocked()) {
      title = 'Adventure complete!';
      body = 'You placed two settlements and two roads, rolled the dice twice, and completed two normal turns using the actual game engine.';
      hint = 'All Games, Ranked Play and Casual Play are now unlocked. Your progress is saved to your account.';
      primary.textContent = 'Continue to All Games'; primary.classList.remove('hidden');
    } else if (!ownTurn) {
      if (phase.startsWith('setup')) {
        const isRoad = phase.endsWith('-road');
        const second = phase.startsWith('setup2');
        title = `Watch the AI: ${second ? 'second ' : ''}${isRoad ? 'road' : 'settlement'}`;
        body = isRoad
          ? 'The AI must connect its opening road to the settlement it just placed. Watch which available board edge it chooses.'
          : (second
            ? 'Placement order reverses for the second round. The AI must still respect the two-edge settlement distance rule.'
            : 'The AI goes first. It is choosing a legal corner on the real board, balancing resource types, number tokens, and nearby road routes.');
      } else if (phase === 'main-await-roll') {
        title = 'Watch the AI: roll dice';
        body = 'The AI will roll using the normal game rules. Adjacent settlements collect resources on a matching roll, even when it is not their turn.';
      } else if (phase === 'main-actions') {
        title = 'Watch the AI: actions and end turn';
        body = 'The AI may build, trade or buy development cards according to its resources. It will finish with End Turn, just like you.';
      } else {
        title = 'Watch the AI resolve a game event';
        body = 'The AI is responding to a normal game prompt, such as the robber. Its action uses the same rules you will use.';
      }
      hint = 'Watch the highlighted live board; the AI pauses between actions. There is no turn timer during practice.';
      target = 'board';
    } else if (phase.endsWith('-settlement')) {
      const second = phase.startsWith('setup2');
      title = second ? 'Place your second settlement' : 'Your turn: place a settlement';
      body = second ? 'Pick another legal corner at least two edges from any existing settlement. This second opening settlement grants starting resources from neighboring producing tiles.'
        : 'Tap or click a valid intersection where hex corners meet. Look for useful numbers and several different resources.';
      hint = 'These are real legal intersections on the board. Tap a highlighted corner to confirm your settlement placement.';
      target = 'board';
    } else if (phase.endsWith('-road')) {
      title = phase.startsWith('setup2') ? 'Connect your second road' : 'Build a road from your settlement';
      body = 'Choose an empty edge directly connected to the settlement you just built. This must be a legal opening road on the actual map.';
      hint = 'Roads connect your settlement network. Tap a highlighted board edge to place one.';
      target = 'board';
    } else if (phase === 'main-await-roll') {
      title = `Normal turn ${Math.min(2, (progress.rolls || 0) + 1)}: roll the dice`;
      body = 'Roll the dice. Every matching numbered hex gives a resource to adjacent settlements; cities earn double. A roll of seven opens the robber step.';
      hint = 'Use the highlighted Roll Dice control, then look at your resource icons and the game log.';
      target = $('rollDockBtn') && !$('rollDockBtn').classList.contains('hidden') ? 'rollDockBtn' : 'rollBtn';
    } else if (phase === 'main-actions') {
      title = `Normal turn ${Math.min(2, (progress.endedTurns || 0) + 1)}: explore your actions`;
      body = 'Inspect resources, build costs, and trade options. You can build or trade if you have the resources; use End Turn when you are ready.';
      hint = 'Finish this real turn by selecting End Turn. The AI will take its next turn before your next roll.';
      target = $('endDockBtn') && !$('endDockBtn').classList.contains('hidden') ? 'endDockBtn' : 'endBtn';
    } else if (phase === 'discard' || phase.includes('robber') || phase.includes('pirate')) {
      title = 'A seven: handle the robber';
      body = 'A seven triggers special rules. Follow the game prompt to discard if necessary, move the robber, and choose a valid steal target if one is available.';
      hint = 'Resolve the current action on the actual game board; the walkthrough continues automatically.';
      target = 'board';
    } else {
      title = 'Follow the live game prompt';
      body = state?.message || 'Complete the current game action to continue.';
      hint = 'Use the highlighted legal targets and the game controls to proceed.';
      target = 'board';
    }
    $('tutorialGuideTitle').textContent = title;
    $('tutorialGuideBody').textContent = body;
    $('tutorialGuideHint').textContent = hint;
    if (target) $(target)?.classList.add('tutorialAttention');
  }
  function showRoomNotFound() {
    pendingDirectJoinRoomCode = null; pendingDirectJoinAsSpectator = false;
    pendingRecentRoomRejoinCode = ''; roomNotFoundVisible = true;
    clearRoomRecoveryState();
    updateAuthUi();
  }
  let publicLobbyResults = [];
  let selectedPublicLobbyCode = '';
  function requestPublicLobbies() {
    if (websocketAuthenticated && ws?.readyState === WebSocket.OPEN) send({ type: 'list_public_lobbies' });
  }
  function mapFamilyForPublicLobby(item) {
    return String(item?.mapMode || '').startsWith('seafarers') ? 'seafarers' : 'classic';
  }
  function publicLobbyScenarioName(item) {
    if (mapFamilyForPublicLobby(item) !== 'seafarers') {
      const mode = String(item?.mapMode || 'classic');
      return mode === 'classic' ? 'Classic' : (mode === 'classic56' ? 'Classic 5–6' : 'Classic 7–8');
    }
    return String(item.scenario || 'four_islands').replace(/_(56|78)$/g, (_m, seats) => ` ${seats === '56' ? '5–6' : '7–8'}`).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  }
  function renderPublicLobbies(items) {
    publicLobbyResults = items.filter(item => item && /^[A-Z0-9]{4,8}$/.test(String(item.code || '')));
    renderPublicLobbyList();
    if (journeyView === 'detail') renderPublicLobbyDetail();
  }
  function renderPublicLobbyList() {
    const list = $('publicLobbyList'); if (!list) return;
    const search = String($('publicLobbySearch')?.value || '').trim().toLowerCase();
    const map = $('publicLobbyMapFilter')?.value || 'all';
    const seats = $('publicLobbySeatsFilter')?.value || 'all';
    const timer = $('publicLobbyTimerFilter')?.value || 'all';
    const sorting = $('publicLobbySort')?.value || 'newest';
    const items = publicLobbyResults.filter(item => {
      if (map !== 'all' && mapFamilyForPublicLobby(item) !== map) return false;
      if (seats === 'open' && !(Number(item.openSeats) > 0)) return false;
      if (seats === 'no-ai' && Number(item.aiPlayers) > 0) return false;
      if (timer === 'off' && Number(item.timerSeconds) !== 0) return false;
      if (timer === 'on' && Number(item.timerSeconds) === 0) return false;
      return !search || `${item.code} ${item.host} ${item.mapMode} ${item.scenario} ${publicLobbyScenarioName(item)}`.toLowerCase().includes(search);
    }).sort((a,b) => sorting === 'open' ? Number(b.openSeats || 0) - Number(a.openSeats || 0)
      : sorting === 'players' ? Number(b.players || 0) - Number(a.players || 0)
      : Number(b.createdAt || 0) - Number(a.createdAt || 0));
    $('publicLobbyCount').textContent = `${items.length} of ${publicLobbyResults.length} public lobbies`;
    list.replaceChildren();
    if (!items.length) {
      list.textContent = publicLobbyResults.length ? 'No lobbies match these filters.' : 'No public lobbies available right now. Host one to get started.';
      return;
    }
    for (const item of items) {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'publicLobbyItem'; card.setAttribute('role','listitem');
      card.setAttribute('aria-label', `View ${item.host || 'Host'} lobby ${item.code}`);
      const content = document.createElement('span'); content.className = 'publicLobbyItemText';
      const heading = document.createElement('strong'); heading.textContent = `${item.host || 'Host'} · ${item.code}`;
      const detail = document.createElement('span'); detail.className = 'smallNote';
      detail.textContent = `${publicLobbyScenarioName(item)} · ${Number(item.players || 0)} human + ${Number(item.aiPlayers || 0)} AI / ${Number(item.maxPlayers || 4)} seats`;
      const meta = document.createElement('span'); meta.className = 'smallNote';
      meta.textContent = `${Number(item.openSeats || 0)} open · ${Number(item.victoryPoints || 10)} VP · ${Number(item.timerSeconds) === 0 ? 'No timer' : `${Number(item.timerSeconds || 30)}s turns`}${item.friendsOnly ? ' · Friends only' : ''}`;
      const action = document.createElement('span'); action.className = 'publicLobbyViewAction'; action.textContent = 'Details & map →';
      content.append(heading, detail, meta); card.append(content, action);
      card.addEventListener('click', () => {
        selectedPublicLobbyCode = item.code;
        setJourneyView('detail');
      });
      list.append(card);
    }
  }
  function addPublicLobbyDetailField(grid, labelText, valueText) {
    const cell = document.createElement('div'); cell.className = 'publicLobbyDetailField';
    const label = document.createElement('span'); label.textContent = labelText;
    const value = document.createElement('strong'); value.textContent = valueText;
    cell.append(label, value); grid.appendChild(cell);
  }
  function renderPublicLobbyDetail() {
    const item = publicLobbyResults.find(item => item.code === selectedPublicLobbyCode);
    const join = $('publicLobbyDetailJoinBtn'), map = $('publicLobbyDetailMap'), fields = $('publicLobbyDetailFields');
    if (!join || !map || !fields) return;
    fields.replaceChildren();
    $('publicLobbyDetailTitle').textContent = item ? `${item.host || 'Host'}'s lobby · ${item.code}` : 'Lobby unavailable';
    if (!item) {
      $('publicLobbyDetailMessage').textContent = 'This lobby is no longer publicly available. Return to the list to choose another.';
      join.disabled = true; map.classList.add('hidden'); return;
    }
    $('publicLobbyDetailMessage').textContent = 'Preview of the current lobby map. Open slots and rules update when the host changes settings.';
    join.disabled = Number(item.openSeats) <= 0;
    join.textContent = join.disabled ? 'Lobby is full' : 'Join this lobby';
    map.classList.toggle('hidden', !Array.isArray(item.mapPreview) || !item.mapPreview.length);
    if (Array.isArray(item.mapPreview) && item.mapPreview.length) drawRankedMiniMap(map, item.mapPreview);
    addPublicLobbyDetailField(fields, 'Map', publicLobbyScenarioName(item));
    addPublicLobbyDetailField(fields, 'Players', `${item.players} human, ${item.aiPlayers} AI · ${item.maxPlayers} seats`);
    addPublicLobbyDetailField(fields, 'Open seats', String(item.openSeats ?? 0));
    addPublicLobbyDetailField(fields, 'Ready', `${Number(item.readyPlayers || 0)} / ${Number(item.players || 0)} humans`);
    addPublicLobbyDetailField(fields, 'Victory target', `${Number(item.victoryPoints || 10)} VP`);
    addPublicLobbyDetailField(fields, 'Turn timer', Number(item.timerSeconds) === 0 ? 'Off' : `${Number(item.timerSeconds || 30)} seconds`);
    addPublicLobbyDetailField(fields, 'Dice algorithm', String(item.diceAlgorithm || 'Random').replace(/_/g,' '));
    addPublicLobbyDetailField(fields, 'AI difficulty', Number(item.aiPlayers || 0) ? String(item.aiDifficulty || 'Easy') : 'No AI');
    addPublicLobbyDetailField(fields, 'Access', item.friendsOnly ? 'Friends only' : 'Public');
    addPublicLobbyDetailField(fields, 'Players in lobby', (item.playerNames || []).join(', ') || 'No players');
  }
  function setJourneyView(view) {
    journeyView = view;
    $('journeyScreen')?.classList.toggle('challengeWideLayout', view === 'challenge');
    $('journeyHomeOptions')?.classList.toggle('hidden', view !== 'home');
    $('journeyPublicPanel')?.classList.toggle('hidden', view !== 'public');
    $('journeyLobbyDetailPanel')?.classList.toggle('hidden', view !== 'detail');
    $('journeyPrivatePanel')?.classList.toggle('hidden', view !== 'private');
    $('journeyChallengePanel')?.classList.toggle('hidden', view !== 'challenge');
    $('journeySettingsPanel')?.classList.toggle('hidden', view !== 'settings');
    $('journeyBottomActions')?.classList.toggle('hidden', view !== 'home');
    $('journeyTutorialBtn')?.classList.toggle('hidden', view !== 'home');
    if ($('journeyTitle')) $('journeyTitle').textContent = view === 'public' ? 'Public Lobbies' : view === 'detail' ? 'Public Lobby Details'
      : view === 'private' ? 'Private Lobby' : view === 'challenge' ? 'Challenge Maps' : view === 'settings' ? 'Settings' : 'All Games';
    if ($('journeyLead')) $('journeyLead').textContent = ({
      home: 'Discover a game, gather your friends, or learn to play.',
      public: 'Browse open games or host a public lobby.',
      detail: 'Review the game and its settings before joining.',
      private: 'Host a private game or join with an invitation code.',
      challenge: 'Daily solo challenges and weekly multiplayer maps, with one shared scenario across all five capacities.',
      settings: 'Customize your game layout and sound before playing.',
    })[view] || 'Choose your next adventure.';
    if ($('journeyBackBtn')) $('journeyBackBtn').textContent = view === 'home' ? '← Back to Game Types'
      : view === 'detail' ? '← Back to Public Lobbies' : '← Back to All Games';
    if (view === 'public' || view === 'detail') requestPublicLobbies();
    if (view === 'challenge') requestChallengeMaps();
    if (view === 'detail') renderPublicLobbyDetail();
    if (view === 'settings') syncSettingsSandbox();
  }
  function journeyBack() {
    if (journeyView === 'detail') return setJourneyView('public');
    if (journeyView !== 'home') return setJourneyView('home');
    returnToGameTypeSelection('');
  }
  function requestChallengeMaps() {
    if (!authUser) return;
    send({ type: 'get_challenge_maps' });
  }

  function formatChallengeTime(ms) {
    if (ms == null || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '—';
    const millis = Math.floor(Number(ms));
    const seconds = Math.floor(millis / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours ? `${hours}:${String(minutes % 60).padStart(2, '0')}` : minutes}:${String(seconds % 60).padStart(2, '0')}.${String(millis % 1000).padStart(3, '0')}`;
  }

  function renderChallengeMaps() {
    const host = $('challengeMapsList');
    const tabs = $('challengeMapTabs');
    const spotlight = $('challengeTopPlayer');
    if (!host || !tabs || !spotlight) return;
    host.replaceChildren();
    tabs.replaceChildren();
    spotlight.replaceChildren();
    const catalog = weeklyChallengeCatalog?.[selectedChallengeKind];
    if (!catalog || !Array.isArray(catalog.maps)) {
      host.textContent = 'Loading challenge maps…';
      return;
    }
    const maps = catalog.maps.filter(map => [4, 5, 6, 7, 8].includes(Number(map.playerCount)))
      .sort((a, b) => Number(a.playerCount) - Number(b.playerCount));
    if (!maps.length) {
      host.textContent = 'No challenge maps are available for this period.';
      return;
    }
    const kindLabel = selectedChallengeKind === 'daily' ? 'Daily' : 'Weekly';
    const scenarioName = ({ classic:'Classic', islands:'Islands', desert:'Through the Desert', fog:'Fog Island', scattered:'Scattered Tiles' })[catalog.scenario] || 'Classic';
    if ($('challengeWeekLabel')) $('challengeWeekLabel').textContent =
      `${kindLabel} · ${catalog.periodId} · ${scenarioName} · ${selectedChallengeKind === 'daily' ? 'Resets daily' : 'Resets Mondays'} at 1:00 AM Central · Balanced Bag · Expert AI`;
    const detail = $('challengeRulesNote');
    if (detail) detail.textContent = selectedChallengeKind === 'daily'
      ? 'Solo challenge: one human versus Expert AI in a full lobby. One total attempt per account per day, used when the game starts. No other humans may join. Results count toward Unranked stats.'
      : 'Weekly challenge: share a lobby link or room code. Expert AI fills empty seats until friends join. Results count toward Unranked stats.';

    // A refresh retains the chosen scenario; switching tabs does not alter server scores.
    const map = maps.find(item => Number(item.playerCount) === selectedChallengePlayerCount) || maps[0];
    const count = Number(map.playerCount);
    selectedChallengePlayerCount = count;
    for (const item of maps) {
      const playerCount = Number(item.playerCount);
      const selected = playerCount === count;
      const tab = document.createElement('button');
      tab.id = `challengeMapTab-${playerCount}`;
      tab.type = 'button';
      tab.className = 'challengeMapTab';
      tab.textContent = `${playerCount} Players`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'challengeMapsList');
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('active', selected);
      tab.addEventListener('click', () => {
        if (selectedChallengePlayerCount === playerCount) return;
        selectedChallengePlayerCount = playerCount;
        renderChallengeMaps();
        $(`challengeMapTab-${playerCount}`)?.focus({ preventScroll: true });
      });
      tab.addEventListener('keydown', event => {
        const index = maps.findIndex(option => Number(option.playerCount) === playerCount);
        let next = -1;
        if (event.key === 'ArrowRight') next = (index + 1) % maps.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + maps.length) % maps.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = maps.length - 1;
        if (next < 0) return;
        event.preventDefault();
        selectedChallengePlayerCount = Number(maps[next].playerCount);
        renderChallengeMaps();
        $(`challengeMapTab-${selectedChallengePlayerCount}`)?.focus({ preventScroll: true });
      });
      tabs.appendChild(tab);
    }
    host.setAttribute('aria-labelledby', `challengeMapTab-${count}`);

    // The server's leaderboard order is the permanent official order:
    // fewest turns, then shortest duration, then lowest VP.
    const rows = Array.isArray(map.leaderboard) ? map.leaderboard : [];
    const champion = rows[0];
    const spotlightLabel = document.createElement('div');
    spotlightLabel.className = 'challengeTopPlayerLabel';
    spotlightLabel.textContent = `★ ${kindLabel.toUpperCase()} #1 · ${count}-PLAYER CHALLENGE`;
    spotlight.appendChild(spotlightLabel);
    const championName = document.createElement('strong');
    championName.className = 'challengeTopPlayerName';
    championName.textContent = champion ? String(champion.name || 'Player') : 'The top spot is open';
    spotlight.appendChild(championName);
    if (champion) {
      const stats = document.createElement('div');
      stats.className = 'challengeTopPlayerStats';
      const metrics = [
        { value: champion.lowestTurns == null ? '—' : String(champion.lowestTurns), label: 'Turns to win' },
        { value: formatChallengeTime(champion.lowestTimeMs), label: 'Completion time' },
        { value: champion.totalVP == null ? '—' : String(champion.totalVP), label: 'Total VP' },
      ];
      for (const metric of metrics) {
        const tile = document.createElement('div');
        tile.className = 'challengeTopPlayerMetric';
        const value = document.createElement('b');
        value.textContent = metric.value;
        const label = document.createElement('span');
        label.textContent = metric.label;
        tile.append(value, label);
        stats.appendChild(tile);
      }
      spotlight.appendChild(stats);
    } else {
      const note = document.createElement('p');
      note.className = 'challengeTopPlayerEmpty';
      note.textContent = `Be the first to win this ${selectedChallengeKind} map and claim the leaderboard.`;
      spotlight.appendChild(note);
    }

    const card = document.createElement('article');
    card.className = 'challengeMapCard';
    const head = document.createElement('div');
    head.className = 'challengeMapCardHeading';
    const title = document.createElement('h2');
    title.textContent = `${count}-Player ${scenarioName}`;
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn primary';
    play.textContent = selectedChallengeKind === 'daily' ? 'Start solo Daily Challenge' : `Create ${count}-player lobby`;
    play.disabled = selectedChallengeKind === 'daily' && !!catalog.attempted;
    if (play.disabled) { play.textContent = 'Daily attempt used'; play.title = 'The next Daily resets at 1 AM Central.'; }
    play.addEventListener('click', () => beginChallengeHost(count));
    head.append(title, play);

    const content = document.createElement('div');
    content.className = 'challengeMapContent';
    const mapSection = document.createElement('section');
    mapSection.className = 'challengeMapVisualization';
    const mapLabel = document.createElement('h3');
    mapLabel.textContent = selectedChallengeKind === 'daily' ? 'Today’s fixed map' : 'This week’s fixed map';
    const board = document.createElement('canvas');
    board.className = 'challengeMapPreview';
    board.width = 760; board.height = 450;
    board.setAttribute('role', 'img');
    board.setAttribute('aria-label', `${kindLabel} ${count}-player ${scenarioName} layout`);
    mapSection.append(mapLabel, board);

    const ranking = document.createElement('section');
    ranking.className = 'challengeMapRanking';
    const rankTitle = document.createElement('h3');
    rankTitle.textContent = `${count}-Player Leaderboard`;
    const leaderboard = document.createElement('div');
    leaderboard.className = 'challengeMapLeaderboard';
    const table = document.createElement('table');
    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const body = document.createElement('tbody');
    const sortId = `${selectedChallengeKind}:${catalog.periodId}:${count}`;
    let sorting = challengeLeaderboardSort.get(sortId) || { key: 'lowestTurns', direction: 'asc' };
    const columns = [
      { key: 'name', label: 'Player' },
      { key: 'lowestTimeMs', label: 'Lowest Time' },
      { key: 'lowestTurns', label: 'Lowest Turns to Win' },
      { key: 'totalVP', label: 'Total VP earned' },
    ];
    const headers = new Map();
    const rankedRows = rows.map((entry, index) => ({ entry, rank: index + 1 }));
    const refreshRows = () => {
      const { key, direction } = sorting;
      const sorted = [...rankedRows].sort((a, b) => {
        const va = a.entry[key];
        const vb = b.entry[key];
        let compare = 0;
        if (key === 'name') {
          compare = String(va || '').localeCompare(String(vb || ''));
        } else {
          const aMissing = va == null || !Number.isFinite(Number(va));
          const bMissing = vb == null || !Number.isFinite(Number(vb));
          // Unknown historic durations stay at the bottom in either direction.
          if (aMissing !== bMissing) return aMissing ? 1 : -1;
          if (!aMissing) compare = Number(va) - Number(vb);
        }
        return (direction === 'desc' ? -compare : compare) || a.rank - b.rank;
      });
      body.replaceChildren();
      if (!sorted.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = columns.length;
        cell.className = 'challengeMapNoResults';
        cell.textContent = 'No completed challenge wins yet. Be the first to set a score.';
        row.appendChild(cell);
        body.appendChild(row);
      }
      for (const { entry, rank } of sorted) {
        const line = document.createElement('tr');
        line.classList.toggle('challengeLeaderRow', rank === 1);
        const cells = [
          `#${rank}  ${entry.name || 'Player'}`,
          formatChallengeTime(entry.lowestTimeMs),
          entry.lowestTurns == null ? '—' : String(entry.lowestTurns),
          entry.totalVP == null ? '—' : String(entry.totalVP),
        ];
        for (const cell of cells) {
          const td = document.createElement('td');
          td.textContent = cell;
          line.appendChild(td);
        }
        body.appendChild(line);
      }
      for (const col of columns) {
        const { th, button } = headers.get(col.key);
        const active = col.key === key;
        th.setAttribute('aria-sort', active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none');
        button.textContent = `${col.label} ${active ? (direction === 'asc' ? '▲' : '▼') : '↕'}`;
        button.classList.toggle('challengeSortActive', active);
      }
    };
    for (const col of columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'challengeLeaderboardSort';
      button.addEventListener('click', () => {
        sorting = { key: col.key, direction: sorting.key === col.key && sorting.direction === 'asc' ? 'desc' : 'asc' };
        challengeLeaderboardSort.set(sortId, sorting);
        refreshRows();
      });
      th.appendChild(button);
      headerRow.appendChild(th);
      headers.set(col.key, { th, button });
    }
    header.appendChild(headerRow);
    table.append(header, body);
    leaderboard.appendChild(table);
    ranking.append(rankTitle, leaderboard);
    content.append(mapSection, ranking);
    card.append(head, content);
    host.appendChild(card);
    refreshRows();
    drawRankedMiniMap(board, map.preview);
  }

  function beginChallengeHost(playerCount) {
    if (![4,5,6,7,8].includes(playerCount)) return;
    requestedLobbyVisibility = 'private';
    roomNotFoundReturnView = 'challenge';
    selectedPlayMode = 'unranked';
    roomNotFoundVisible = false;
    try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
    prepareUncreatedLobby(); updateAuthUi();
    send({ type: 'create_challenge_room', playerCount, kind: selectedChallengeKind,
      displayName: authUser?.displayName || authUser?.username || 'Host' });
  }

  function beginJourneyJoin(code) {
    roomNotFoundReturnView = selectedPlayMode === 'journey' ? journeyView : '';
    const c = String(code || '').trim().toUpperCase();
    if (!c || !/^[A-Z0-9]{4,8}$/.test(c)) { showRoomNotFound(); return; }
    selectedPlayMode = 'unranked'; roomNotFoundVisible = false;
    try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
    updateAuthUi();
    send({ type: 'join_room', code:c, displayName: authUser?.displayName || authUser?.username || 'Player' });
  }
  function beginJourneyHost(visibility) {
    requestedLobbyVisibility = visibility === 'public' ? 'public' : 'private';
    selectedPlayMode = 'unranked'; roomNotFoundVisible = false;
    try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
    prepareUncreatedLobby(); updateAuthUi();
    send({ type:'create_room', displayName:authUser?.displayName || authUser?.username || 'Host', visibility:requestedLobbyVisibility });
  }

  let authToken = null;
  let pendingAutoRejoin = false;
  let pendingRecentRoomRejoinCode = '';
  let websocketAuthenticated = false;
  let pendingDirectJoinRoomCode = null;
  let pendingDirectJoinAsSpectator = false;
  let pendingRankedMatchmaking = false;

  // An invitation is an explicit unranked-lobby choice. It takes precedence
  // over an earlier ranked selection, including after a fresh login.
  function selectInvitedLobbyMode() {
    if (!pendingDirectJoinRoomCode) return;
    selectedPlayMode = 'unranked';
    try { sessionStorage.setItem('hexsettlers_play_mode', 'unranked'); } catch (_) {}
  }

  function formatStatsLine(stats) {
    if (!stats) return '';
    const gp = Math.max(0, Number(stats.gamesPlayed || 0));
    const w = Math.max(0, Number(stats.wins || 0));
    const l = Math.max(0, Number(stats.losses || 0));
    const tvp = Math.max(0, Number(stats.totalVP || 0));
    return `Games: ${gp}  Wins: ${w}  Losses: ${l}  Total VP: ${tvp}`;
  }

  function removePersistedAuthToken() {
    authToken = null;
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
  }

  function setAuthState(user, token, { clearToken = false } = {}) {
    authUser = user || null;
    if (clearToken) {
      removePersistedAuthToken();
    } else if (typeof token === 'string' && token.trim()) {
      authToken = token.trim();
      try { localStorage.setItem(AUTH_TOKEN_KEY, authToken); } catch (_) {}
    } else if (!user) {
      removePersistedAuthToken();
    }
    if (authUser && ui.nameInput && ((typeof IS_ADMIN_PORTAL !== 'undefined' && IS_ADMIN_PORTAL) || !String(ui.nameInput.value || '').trim())) {
      ui.nameInput.value = authUser.displayName || authUser.username || '';
    }
    if (authUser && !authUser.needsUsernameSetup) {
      if (authUser.tutorialCompleted !== true && !room) {
        selectedPlayMode = '';
        try { sessionStorage.removeItem('hexsettlers_play_mode'); } catch (_) {}
        // Invitation links cannot bypass the first-time tutorial gate.
        pendingDirectJoinRoomCode = null;
        pendingDirectJoinAsSpectator = false;
      } else {
        selectInvitedLobbyMode();
      }
      // A refresh of an unfinished tutorial returns to the tutorial's own
      // private room, not the All Games screen.
      const recent = recentRoomSessionForUser(authUser);
      if (!pendingDirectJoinRoomCode && recent && selectedPlayMode !== 'ranked' && selectedPlayMode !== 'journey') {
        selectedPlayMode = recent.tutorial ? 'casual' : 'unranked';
        try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
      }
    }
    updateAuthUi();
  }

  const OAUTH_LABELS = { google: 'Google (Gmail)', github: 'GitHub', cloudflare: 'Cloudflare' };
  function startOAuthProvider(provider, intent = 'login') {
    if (!Object.hasOwn(OAUTH_LABELS, provider)) return;
    const returnUrl = window.location.pathname + window.location.search;
    const query = new URLSearchParams({ intent, return: returnUrl });
    window.location.assign(`/api/auth/oauth/${provider}/start?${query.toString()}`);
  }
  async function setupOAuthSignIn() {
    let availability = {};
    try {
      const response = await fetch('/api/auth/oauth/providers', { credentials: 'same-origin', cache: 'no-store' });
      const json = await response.json();
      if (response.ok && json.ok) availability = json.providers || {};
    } catch (_) {}
    for (const button of document.querySelectorAll('[data-oauth-provider]')) {
      button.classList.toggle('hidden', !availability[button.dataset.oauthProvider]);
      button.addEventListener('click', () => startOAuthProvider(button.dataset.oauthProvider, button.dataset.oauthIntent || 'login'));
    }
    for (const id of ['oauthLoginOptions', 'oauthRegisterOptions']) {
      const parent = $(id);
      parent?.classList.toggle('hidden', !Object.values(availability).some(Boolean));
    }
  }
  void setupOAuthSignIn();

  // First-time provider sign-ups must complete this screen before using a
  // lobby. Existing OAuth users with a selected username are unaffected.
  let usernameAvailabilityRequest = 0;
  $('oauthUsernameInput')?.addEventListener('blur', async () => {
    if (!authUser?.needsUsernameSetup) return;
    const username = String($('oauthUsernameInput')?.value || '').trim();
    const status = $('oauthUsernameStatus');
    const requestId = ++usernameAvailabilityRequest;
    if (!username) return;
    try {
      const response = await accountApi('check-username', { username });
      if (requestId !== usernameAvailabilityRequest) return;
      status.className = response.available ? 'userManagementStatus success' : 'userManagementStatus error';
      status.textContent = response.available ? 'Username available!' : (response.error || 'Username unavailable.');
    } catch (_) { /* Final submit also validates on the server. */ }
  });
  $('oauthUsernameForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!authUser?.needsUsernameSetup) return;
    const username = String($('oauthUsernameInput')?.value || '').trim();
    const button = $('oauthUsernameSave');
    const status = $('oauthUsernameStatus');
    button.disabled = true;
    status.className = 'userManagementStatus';
    status.textContent = 'Saving username…';
    try {
      const response = await accountApi('complete-oauth-username', { username });
      status.className = 'userManagementStatus success';
      status.textContent = response.message || 'Username saved.';
      setAuthState(response.user, null, { clearToken: true });
      reconnectForCookieAuth();
    } catch (error) {
      status.className = 'userManagementStatus error';
      status.textContent = error.message || 'Could not save username.';
    } finally {
      button.disabled = false;
    }
  });
  $('oauthUsernameSignOut')?.addEventListener('click', () => ui.logoutBtn?.click());


  function handleOAuthReturnFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('oauth');
    if (!status) return;
    const provider = params.get('provider') || '';
    const message = status === 'connected' ? `${OAUTH_LABELS[provider] || 'Provider'} sign-in connected.` : (params.get('oauth_message') || 'Provider sign-in was not completed.');
    const banner = $('landingError');
    if (banner) {
      banner.textContent = message;
      banner.classList.remove('hidden');
      banner.classList.toggle('oauthSuccess', status === 'connected');
    }
    if (status !== 'connected') setError(message);
    params.delete('oauth'); params.delete('provider'); params.delete('oauth_message');
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
  }

  async function authApi(action, body = {}) {
    const response = await fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Authentication failed.');
    return payload;
  }

  async function adminApi(action, body = {}) {
    const response = await fetch(`/api/admin/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Administrator request failed.');
    return payload;
  }

  async function accountApi(action, body = {}) {
    const response = await fetch(`/api/account/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Account request failed.');
    return payload;
  }

  function scheduleWebsocketReconnect(delayMs) {
    if (websocketReconnectTimer !== null) clearTimeout(websocketReconnectTimer);
    const delay = Math.max(0, Number(delayMs) || 0);
    websocketReconnectTimer = setTimeout(() => {
      websocketReconnectTimer = null;
      connect();
    }, delay);
  }

  function reconnectForCookieAuth() {
    if (IS_ADMIN_PORTAL) return; // management uses HTTP sessions only, never a game WebSocket
    websocketReconnectAllowed = true;
    websocketReconnectDelayMs = 0;
    roomConnectionReady = false;
    const activeSocket = ws;
    // Retire this socket before opening its replacement. Its eventual close
    // event must not schedule a second connection and start a reconnect loop.
    ws = null;
    try {
      if (activeSocket && (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING)) activeSocket.close();
    } catch (_) {}
    scheduleWebsocketReconnect(0);
  }

  async function authenticateInBrowser(action, credentials) {
    const result = await authApi(action, credentials);
    setAuthState(result.user, null, { clearToken: true });
    reconnectForCookieAuth();
  }

  function enforceCasualMapRestrictions() {
    const casual = selectedPlayMode === 'casual' || !!room?.casual;
    for (const option of ui.mapModeSelect?.options || []) {
      if (!['classic78','seafarers78'].includes(option.value)) continue;
      option.hidden = casual; option.disabled = casual;
    }
    if (casual && ['classic78','seafarers78'].includes(ui.mapModeSelect?.value)) {
      ui.mapModeSelect.value = ui.mapFamilySelect?.value === 'seafarers' ? 'seafarers' : 'classic';
    }
    if (ui.mapFamilySelect) ui.mapFamilySelect.value = String(ui.mapModeSelect?.value || '').startsWith('seafarers') ? 'seafarers' : 'classic';
    syncPlayerCountOptions();
    for (const select of [ui.mapScenarioSelect, ui.mapScenario56Select]) {
      for (const option of select?.options || []) {
        if (!option.value.startsWith('test_builder')) continue;
        option.hidden = casual;
        option.disabled = casual;
      }
      if (casual && String(select?.value || '').startsWith('test_builder')) {
        select.value = select === ui.mapScenarioSelect ? 'four_islands' : 'six_islands';
      }
    }
    if (casual && ui.classicCustomMapToggle) ui.classicCustomMapToggle.checked = false;
    if (ui.classicCustomMapRow) ui.classicCustomMapRow.classList.toggle('hidden', casual || !['classic','classic56','classic78'].includes(ui.mapModeSelect?.value));
    if (casual) ui.testBuilderRow?.classList.add('hidden');
  }

  function updateAuthUi() {
    const loggedIn = !!authUser;
    const needsUsername = loggedIn && authUser.needsUsernameSetup === true;
    if (typeof IS_ADMIN_PORTAL !== 'undefined' && IS_ADMIN_PORTAL) {
      const privileged = loggedIn && !!authUser.isAdmin && !needsUsername;
      const denied = $('adminPortalDenied');
      denied?.classList.toggle('hidden', !loggedIn || privileged);
      $('adminPortalBar')?.classList.toggle('signedIn', privileged);
      if (!privileged) {
        adminPortalOpenedFor = '';
        if (ui.modal?.querySelector('.adminDashboard')) forceCloseModal();
      } else if (authUser.id !== adminPortalOpenedFor) {
        adminPortalOpenedFor = authUser.id;
        setTimeout(() => {
          if (IS_ADMIN_PORTAL && authUser?.isAdmin && authUser.id === adminPortalOpenedFor) openAdminManagementScreen();
        }, 0);
      }
    }
    const ready = loggedIn && !needsUsername;
    $('oauthUsernameSetup')?.classList.toggle('hidden', !needsUsername);
    if (needsUsername) {
      const provider = authUser.oauthProviders?.[0]?.provider;
      const providerName = OAUTH_LABELS[provider] || 'OAuth';
      if ($('oauthUsernameProvider')) $('oauthUsernameProvider').textContent = `Signed in with ${providerName}. Your username is not set yet.`;
    }
    const landing = $('authLanding');
    const modeScreen = $('playModeScreen');
    const rankedScreen = $('rankedScreen');
    const appRoot = $('app');
    landing?.classList.toggle('hidden', loggedIn);
    modeScreen?.classList.toggle('hidden', !ready || !!selectedPlayMode || roomNotFoundVisible);
    $('journeyScreen')?.classList.toggle('hidden', !ready || selectedPlayMode !== 'journey' || roomNotFoundVisible);
    $('roomNotFoundScreen')?.classList.toggle('hidden', !ready || !roomNotFoundVisible);
    if (typeof setJourneyView === 'function') setJourneyView(journeyView);
    rankedScreen?.classList.toggle('hidden', !ready || selectedPlayMode !== 'ranked' || roomNotFoundVisible);
    appRoot?.classList.toggle('hidden', !ready || roomNotFoundVisible || !['unranked', 'casual'].includes(selectedPlayMode));
    if (typeof document !== 'undefined') document.body?.classList.toggle('casual-mode', selectedPlayMode === 'casual' || !!room?.casual);
    if (typeof refreshTexturePackUi === 'function') refreshTexturePackUi();
    if ($('uncreatedLobbyIntro')) {
      const eyebrow = $('uncreatedLobbyIntro').querySelector('.uncreatedLobbyEyebrow');
      if (eyebrow) eyebrow.textContent = 'Choose your adventure';
      const title = $('uncreatedLobbyIntro').querySelector('h1');
      if (title) title.textContent = (selectedPlayMode === 'casual' || room?.casual) ? 'Play with friends or AI' : 'Start a new adventure';
      const lead = $('uncreatedLobbyIntro').querySelector('p');
      if (lead) lead.textContent = (selectedPlayMode === 'casual' || room?.casual) ? 'Create a shareable game for up to six players, human or AI. Results never affect stats.' : 'Create a lobby to invite friends, or enter a room code to join an existing game.';
    }
    // This screen is also used after a player leaves a public/private lobby.
    // Its parent is All Games for unranked, but Game Types for Casual.
    const uncreatedLobbyBack = $('uncreatedLobbyBackBtn');
    if (uncreatedLobbyBack) uncreatedLobbyBack.textContent = selectedPlayMode === 'casual'
      ? '← Back to Game Types' : '← Back to All Games';
    $('accountOrb')?.classList.toggle('hidden', !ready);
    // The server, not a browser flag, decides whether the first tutorial is complete.
    const unlocked = authUser?.tutorialCompleted === true;
    const allGames = $('unrankedModeBtn');
    const ranked = $('rankedModeBtn');
    const casual = $('casualModeBtn');
    for (const btn of [allGames, ranked]) {
      if (!btn) continue;
      btn.disabled = ready && !unlocked;
      btn.classList.toggle('lockedMode', ready && !unlocked);
      btn.setAttribute('aria-disabled', ready && !unlocked ? 'true' : 'false');
      btn.title = ready && !unlocked ? 'Complete Start Your Adventure to unlock' : '';
    }
    const allGamesTitle = allGames?.querySelector('strong');
    if (allGamesTitle) allGamesTitle.textContent = 'All Games';
    if (allGames?.querySelector('span')) allGames.querySelector('span').textContent = unlocked
      ? 'Browse public games, host private lobbies, and play Challenge Maps.'
      : 'Locked until you finish Start Your Adventure.';
    if (ranked?.querySelector('span')) ranked.querySelector('span').textContent = unlocked
      ? 'Match automatically with similarly ranked players.'
      : 'Locked until you finish Start Your Adventure.';
    if (casual?.querySelector('strong')) casual.querySelector('strong').textContent = unlocked ? 'Casual Play' : 'Start Your Adventure';
    if (casual?.querySelector('span')) casual.querySelector('span').textContent = unlocked
      ? 'Play with friends or AI, up to 6 players. No stats or ratings are tracked.'
      : 'Learn on a real Classic map against one AI. Place your starting settlements, then play two full turns.';
    if (typeof refreshTutorialGuide === 'function') refreshTutorialGuide();
    if (loggedIn) {
      const label = authUser.displayName || authUser.username || '?';
      if ($('accountOrbInitial')) $('accountOrbInitial').textContent = label.slice(0, 1).toUpperCase();
      if ($('accountMenuName')) $('accountMenuName').textContent = `${label} · ${authUser.username}`;
      if (ui.nameInput) ui.nameInput.value = label;
    }
    if (ui.authStatus) {
      ui.authStatus.textContent = loggedIn
        ? `Logged in as ${authUser.username}`
        : 'Not logged in.';
    }
    if (ui.authStats) {
      ui.authStats.textContent = loggedIn ? formatStatsLine(authUser.stats) : '';
    }
    const rankedSummary = $('rankSummary');
    if (rankedSummary) rankedSummary.textContent = `Ranked rating: ${loggedIn ? (authUser.rankedRating ?? 1000) : 1000}`;
    if (ui.logoutBtn) ui.logoutBtn.classList.toggle('hidden', !loggedIn);
    if (ui.forgotPasswordBtn) ui.forgotPasswordBtn.classList.toggle('hidden', loggedIn);
    if (ui.userManagementBtn) {
      ui.userManagementBtn.classList.toggle('hidden', !loggedIn);
      ui.userManagementBtn.textContent = 'My Account';
    }
    // Management is a separate hostname; public account menus never expose it.
    // Legacy per-feature menu items are now combined in Admin Management.
    $('serverManagementBtn')?.remove();
    $('ratingManagementBtn')?.remove();
    if (ui.loginBtn) ui.loginBtn.disabled = loggedIn;
    if (ui.registerBtn) ui.registerBtn.disabled = loggedIn;
    if (ui.usernameInput) ui.usernameInput.disabled = loggedIn;
    if (ui.passwordInput) ui.passwordInput.disabled = loggedIn;

    if (ui.createBtn) ui.createBtn.disabled = !ready;
    if (ui.joinBtn) ui.joinBtn.disabled = !ready;
    if (ui.rejoinLastBtn) ui.rejoinLastBtn.disabled = !ready;

    const last = (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (ui.lastRoomHint) ui.lastRoomHint.textContent = last ? `Last room: ${last}` : '';
    if (ui.myAccountLabel) ui.myAccountLabel.textContent = loggedIn ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';
  }

  async function refreshDeployedVersion() {
    try {
      const response = await fetch('/api/build-version', { cache:'no-store', credentials:'same-origin' });
      if (!response.ok) return;
      const info = await response.json();
      if (!/^V\d+\.\d+\.\d+$/.test(String(info.version || ''))) return;
      document.querySelectorAll('.appVersion').forEach(node => { node.textContent = info.version; });
    } catch (_) {} // Old servers and offline mode retain the bundled version.
  }
  refreshDeployedVersion();

  function clearAuthLocal() {
    authUser = null;
    selectedPlayMode = '';
    try { sessionStorage.removeItem('hexsettlers_play_mode'); } catch (_) {}
    removePersistedAuthToken();
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
      // Docked resources always occupy the sidebar's full available width;
      // zoom is only for the contents, never the containing card.
      if (wrap.closest && wrap.closest('.rightSidebar')) {
        wrap.style.removeProperty('width');
        wrap.style.removeProperty('max-width');
        return;
      }

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

    // Standalone dice/end-turn actions are visually part of this bar: changing
    // its scale must change those buttons too (not just the bar behind them).
    if (String(scaleId || '') === 'turn_bar') {
      try { document.getElementById('rollDock')?.style.setProperty('--turn-button-scale', String(next)); } catch (_) {}
      try { if (typeof syncTurnBarHeight === 'function') requestAnimationFrame(syncTurnBarHeight); } catch (_) {}
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
    // The entire clock surface is the drag handle. Never reserve space for
    // a small grip icon: it interferes with mobile touch and wastes height.
    for (const oldGrip of topRow.querySelectorAll('.clockDragGrip, .dragGrip')) {
      oldGrip.remove();
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
    return ui.countdownClock;
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
const POSTGAME_RESOURCE_CATEGORIES = Object.freeze([
  { key: 'gain_dice', direction: 'gain', icon: '⚄', label: 'Resources gained from dice rolls', sources: ['production', 'gold_production'] },
  { key: 'gain_steal', direction: 'gain', icon: '♜', label: 'Resources gained from robber and pirate', sources: ['steal'] },
  { key: 'gain_dev', direction: 'gain', icon: '✦', label: 'Resources gained from Monopolies and Years of Plenty', sources: ['dev'] },
  { key: 'gain_trade', direction: 'gain', icon: '⇄', label: 'Resources gained from trading', sources: ['trade'] },
  { key: 'loss_spent', direction: 'loss', icon: '⌂', label: 'Spent resources', sources: ['build'] },
  { key: 'loss_seven', direction: 'loss', icon: '7', label: 'Resources lost to 7 rolls', sources: ['discard'] },
  { key: 'loss_blocked', direction: 'loss', icon: '⊘', label: 'Resources lost to blocked production', sources: ['blocked'] },
  { key: 'loss_trade', direction: 'loss', icon: '⇄', label: 'Resources lost to trading', sources: ['trade'] },
  { key: 'loss_steal', direction: 'loss', icon: '♜', label: 'Resources lost to stealing', sources: ['steal'] },
  { key: 'loss_monopoly', direction: 'loss', icon: 'M', label: 'Resources lost from Monopolies', sources: ['monopoly'], legacySources: ['dev'] },
]);

function defaultPostgameResourceCategories() {
  return Object.fromEntries(POSTGAME_RESOURCE_CATEGORIES.map((category) => [category.key, true]));
}

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
  resourceCategoryEnabled: defaultPostgameResourceCategories(),
  showGoldProductionAsGold: false,
};


// -------------------- History + Player Stats --------------------
let historyState = {
  active: false,
  tab: 'games',
  games: [],
  leaderboard: [],
  leaderboardMode: 'combined',
  gameMode: 'unranked',
  challengeArchive: [], loadingChallenges: false,
  challengeFilters: { games: { count:4, kind:'weekly', search:'', range:'all', from:'', to:'', friendsOnly:false, sortKey:'endedAt', sortDir:'desc' },
    players: { count:4, kind:'weekly', search:'', range:'all', from:'', to:'', friendsOnly:false, sortKey:'lowestTurns', sortDir:'asc' } },
  sortKey: 'rankedRating',
  sortDir: 'desc',
  loadingGames: false,
  loadingBoard: false,
  openMode: 'summary',
  friendsOnly: false, friendIds: new Set(),
  selectedIds: new Set(), savedReplays: [], exporting: null,
};

let historyReplay = {
  active: false,
  entry: null,
  index: 0,
  liveState: null,
  viewPlayerId: null,
};
let historyReplayScrubFrame = null;
let historyReplayScrubIndex = null;

const HISTORY_REPLAY_ALLOWED_MESSAGES = new Set([
  'get_state', 'get_game_history', 'get_game_history_entry',
  'get_player_leaderboard', 'get_challenge_archive', 'get_texture_pack',
  // Leaving a ranked queue must still work while viewing a saved replay.
  'ranked_queue_leave', 'leave_room',
]);

function cloneReplayValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function applyHistoryReplayPatch(frame, operations) {
  let root = cloneReplayValue(frame);
  for (const operation of (operations || [])) {
    const path = Array.isArray(operation.path) ? operation.path : [];
    if (!path.length) {
      root = operation.op === 'delete' ? undefined : cloneReplayValue(operation.value);
      continue;
    }
    let target = root;
    for (let index = 0; index < path.length - 1; index++) target = target[path[index]];
    const key = path[path.length - 1];
    if (operation.op === 'delete') {
      if (Array.isArray(target)) target.splice(Number(key), 1);
      else delete target[key];
    } else target[key] = cloneReplayValue(operation.value);
  }
  return root;
}

function materializeHistoryReplayFrame(entry, frameIndex) {
  const replay = entry && entry.replay;
  if (!replay || !replay.initial) return null;
  let frame = cloneReplayValue(replay.initial);
  const steps = Array.isArray(replay.steps) ? replay.steps : [];
  const patchCount = Math.max(0, Math.min(steps.length, Math.floor(Number(frameIndex || 0))));
  for (let index = 0; index < patchCount; index++) frame = applyHistoryReplayPatch(frame, steps[index].patch);
  const log = Array.isArray(replay.log)
    ? replay.log
    : (Array.isArray(entry.log) ? entry.log : (Array.isArray(entry.snapshot?.log) ? entry.snapshot.log : []));
  const logCount = patchCount
    ? Math.max(0, Number(steps[patchCount - 1]?.logCount || 0))
    : Math.max(0, Number(replay.initialLogCount || 0));
  frame.log = cloneReplayValue(log.slice(0, logCount));
  frame.replayViewing = true;
  return frame;
}

function historyReplayPerspectiveAvailable(player) {
  return !!(player && !player.departed && (state?.turnOrder || []).includes(player.id));
}

function positionHistoryReplayBar() {
  if (!ui.historyReplayBar || !historyReplay.active) return;
  const board = ui.historyReplayBar.closest('.boardWrap');
  const hud = document.querySelector('.hudTopLeft');
  if (!board) return;
  const boardRect = board.getBoundingClientRect();
  const hudRect = hud && !hud.classList.contains('hidden') ? hud.getBoundingClientRect() : null;
  const clearHud = hudRect && hudRect.height > 0 ? hudRect.bottom - boardRect.top + 12 : 72;
  board.style.setProperty('--replay-controls-top', `${Math.max(62, Math.ceil(clearHud))}px`);
}
function refreshHistoryReplayBar() {
  if (!ui.historyReplayBar) return;
  ui.historyReplayBar.classList.toggle('hidden', !historyReplay.active);
  if (!historyReplay.active) return;
  requestAnimationFrame(positionHistoryReplayBar);
  const steps = Array.isArray(historyReplay.entry?.replay?.steps) ? historyReplay.entry.replay.steps : [];
  const frameCount = steps.length + 1;
  if (ui.historyReplayStep) ui.historyReplayStep.textContent = `Step ${historyReplay.index + 1}/${frameCount}`;
  const step = historyReplay.index > 0 ? steps[historyReplay.index - 1] : null;
  const actor = step && (state?.players || []).find((player) => player && player.id === step.actorId);
  const kind = String(step?.action?.kind || 'game_start').replaceAll('_', ' ');
  const latestLog = Array.isArray(state?.log) && state.log.length ? state.log[state.log.length - 1]?.text : '';
  const actionText = latestLog || `${actor ? `${actor.name}: ` : ''}${kind}`;
  if (ui.historyReplayAction) ui.historyReplayAction.textContent = actionText;
  if (ui.historyReplayPrevBtn) ui.historyReplayPrevBtn.disabled = historyReplay.index <= 0;
  if (ui.historyReplayNextBtn) ui.historyReplayNextBtn.disabled = historyReplay.index >= frameCount - 1;
  if (ui.historyReplaySlider) {
    ui.historyReplaySlider.min = '0';
    ui.historyReplaySlider.max = String(steps.length);
    ui.historyReplaySlider.value = String(historyReplay.index);
    ui.historyReplaySlider.disabled = steps.length === 0;
    const position = historyReplay.index === 0 ? 'Game start' : `Action ${historyReplay.index} of ${steps.length}`;
    ui.historyReplaySlider.setAttribute('aria-valuetext', `${position}: ${actionText}`);
  }
  if (ui.historyReplayTimelineEnd) {
    ui.historyReplayTimelineEnd.textContent = `${steps.length} action${steps.length === 1 ? '' : 's'}`;
  }
}

function cancelHistoryReplayScrub() {
  if (historyReplayScrubFrame != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(historyReplayScrubFrame);
  }
  historyReplayScrubFrame = null;
  historyReplayScrubIndex = null;
}

function scheduleHistoryReplayFrame(index) {
  const maxIndex = Array.isArray(historyReplay.entry?.replay?.steps) ? historyReplay.entry.replay.steps.length : 0;
  historyReplayScrubIndex = Math.max(0, Math.min(maxIndex, Math.floor(Number(index || 0))));
  if (historyReplayScrubFrame != null) return;

  const showPendingFrame = () => {
    historyReplayScrubFrame = null;
    const nextIndex = historyReplayScrubIndex;
    historyReplayScrubIndex = null;
    if (nextIndex != null) showHistoryReplayFrame(nextIndex);
  };
  if (typeof requestAnimationFrame === 'function') historyReplayScrubFrame = requestAnimationFrame(showPendingFrame);
  else showPendingFrame();
}

function showHistoryReplayFrame(index) {
  if (!historyReplay.active || !historyReplay.entry) return;
  const steps = Array.isArray(historyReplay.entry.replay?.steps) ? historyReplay.entry.replay.steps : [];
  historyReplay.index = Math.max(0, Math.min(steps.length, Math.floor(Number(index || 0))));
  state = materializeHistoryReplayFrame(historyReplay.entry, historyReplay.index);
  if (!state) return;
  if (!historyReplayPerspectiveAvailable((state.players || []).find((player) => player && player.id === historyReplay.viewPlayerId))) {
    historyReplay.viewPlayerId = (state.players || []).find(historyReplayPerspectiveAvailable)?.id || null;
  }
  state.spectatorViewPlayerId = historyReplay.viewPlayerId;
  state.spectatorMode = true;
  updateButtons();
  renderLobby();
  render();
  if (ui.logList && logPanelOpen) renderLogList(ui.logList);
  refreshHistoryReplayBar();
}

function startHistoryReplay(entry) {
  if (!entry?.replay?.initial || !Array.isArray(entry.replay.steps)) {
    setError('A step-by-step replay is not available for this older game.');
    return;
  }
  clearStructurePlacementEmphasis();
  cancelHistoryReplayScrub();
  historyReplay = { active: true, entry, index: 0, liveState: state, viewPlayerId: null };
  setHistoryVisible(false);
  closePostgameSnapshot();
  showHistoryReplayFrame(0);
}

function stopHistoryReplay() {
  if (!historyReplay.active) return;
  clearStructurePlacementEmphasis();
  cancelHistoryReplayScrub();
  const liveState = historyReplay.liveState;
  historyReplay = { active: false, entry: null, index: 0, liveState: null, viewPlayerId: null };
  state = liveState;
  refreshHistoryReplayBar();
  if (state) {
    updateButtons();
    renderLobby();
    render();
  }
  try { send({ type: 'get_state' }); } catch (_) {}
  setHistoryVisible(true);
}
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
  const RESOURCE_LABEL = { brick:'Brick', lumber:'Wood', wool:'Wool', grain:'Grain', ore:'Ore', gold:'Gold' };
  const POSTGAME_RESOURCE_KEYS = [...RESOURCE_KEYS, 'gold'];

  const sumRes = (m) => {
    if (!m) return 0;
    let t = 0;
    for (const k of POSTGAME_RESOURCE_KEYS) t += Number(m[k] || 0);
    return t;
  };

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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

  const makeOverviewMetric = (metric) => {
    const tile = document.createElement('div');
    tile.className = `pgOverviewMetric${metric.tone ? ` ${metric.tone}` : ''}`;
    if (metric.title) tile.title = metric.title;

    const icon = document.createElement('span');
    icon.className = 'pgOverviewMetricIcon';
    if (metric.piece) {
      icon.classList.add('pieceArt');
      const piece = document.createElement('span');
      piece.className = 'pgOverviewPieceArt';
      const colorIndex = playerColorIndex(metric.color);
      const source = resolveLegacyTextureUrl(STRUCT_IMG_SRC[colorIndex] || STRUCT_IMG_SRC[0]);
      const position = tokenBgPosPct(metric.piece);
      piece.style.backgroundImage = `url('${source}')`;
      piece.style.backgroundPosition = `${position.x}% ${position.y}%`;
      icon.appendChild(piece);
    } else if (metric.asset) {
      const image = document.createElement('img');
      image.src = getTextureAssetUrl(metric.asset);
      image.alt = metric.label || '';
      image.draggable = false;
      icon.appendChild(image);
    } else {
      icon.textContent = metric.icon || '•';
    }

    const copy = document.createElement('span');
    copy.className = 'pgOverviewMetricCopy';
    const label = document.createElement('span');
    label.className = 'pgOverviewMetricLabel';
    label.textContent = metric.label;
    const value = document.createElement('strong');
    value.className = 'pgOverviewMetricValue';
    value.textContent = String(metric.value ?? 0);
    copy.appendChild(label);
    copy.appendChild(value);
    tile.appendChild(icon);
    tile.appendChild(copy);
    return tile;
  };

  const makePlayerOverviewCard = (player, options={}) => {
    const card = document.createElement('article');
    card.className = `pgOverviewPlayerCard${options.winner ? ' winner' : ''}`;
    card.style.setProperty('--pg-player-color', player.color || '#777');

    const head = document.createElement('div');
    head.className = 'pgOverviewCardHead';
    const headline = document.createElement('strong');
    headline.className = 'pgOverviewHeadline';
    headline.textContent = String(options.headline ?? '—');
    const headlineLabel = document.createElement('span');
    headlineLabel.className = 'pgOverviewHeadlineLabel';
    headlineLabel.textContent = options.headlineLabel || '';
    head.appendChild(headline);
    head.appendChild(headlineLabel);
    if (options.ribbon) {
      const ribbon = document.createElement('span');
      ribbon.className = 'pgOverviewRibbon';
      ribbon.textContent = options.ribbon;
      head.appendChild(ribbon);
    }
    card.appendChild(head);

    const metrics = document.createElement('div');
    metrics.className = 'pgOverviewMetricGrid';
    for (const metric of (options.metrics || [])) metrics.appendChild(makeOverviewMetric(metric));
    card.appendChild(metrics);
    if (options.ratingText) {
      const ratingLine = document.createElement('div');
      ratingLine.className = `pgOverviewRatingChange${options.ratingTone ? ` ${options.ratingTone}` : ''}`;
      ratingLine.textContent = options.ratingText;
      card.appendChild(ratingLine);
    }

    const footer = document.createElement('div');
    footer.className = 'pgOverviewPlayerFooter';
    const swatch = document.createElement('span');
    swatch.className = 'pgOverviewPlayerSwatch';
    swatch.style.background = player.color || '#777';
    const name = document.createElement('span');
    name.textContent = `${player.name}${player.id === myPlayerId ? ' (you)' : ''}`;
    footer.appendChild(swatch);
    footer.appendChild(name);
    card.appendChild(footer);
    return card;
  };

  const appendOverviewGrid = (section, cards) => {
    const grid = document.createElement('div');
    grid.className = 'pgOverviewPlayerGrid';
    // Seven and eight-player matches use four cards per row on desktop.
    if (postgameState.tab === 'summary' && cards.length >= 7 && cards.length <= 8) {
      grid.classList.add('pgOverviewEightPlayerGrid');
    }
    for (const card of cards) grid.appendChild(card);
    section.appendChild(grid);
    return grid;
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
    const section = makeSection('Game Overview');
    section.classList.add('pgStyledSection', 'pgGameOverviewSection');
    const devByPlayer = stats?.dev?.byPlayer || {};
    const actionsByPlayer = stats?.actions?.byPlayer || {};
    const thieves = stats?.thieves || null;

    const cards = players.map((p) => {
      const pc = computePieceCounts(st, p.id);
      const dv = devByPlayer[p.id] || {};
      const ac = actionsByPlayer[p.id] || {};
      const settlementVP = safeNum(pc.settlements);
      const cityVP = safeNum(pc.cities) * 2;
      const explorationVP = safeNum(p.newIslandVP) + safeNum(p.ttdFarSideVP);
      const hasKnightBreakdown = dv.playedByType && Object.prototype.hasOwnProperty.call(dv.playedByType, 'knight');
      const knightsPlayed = hasKnightBreakdown ? safeNum(dv.playedByType.knight) : safeNum(p.army);
      const shownVP = safeNum(p.vp);
      const steals = safeNum(ac.robberSteals) + safeNum(ac.pirateSteals);
      const stolenFrom = thieves ? (
        safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) +
        safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])
      ) : 0;
      const ratingResult = st?.ratingChanges?.[p.id] || null;
      const ratingDelta = Number(ratingResult?.delta || 0);
      const unrankedResult = st?.unrankedRatingChanges?.[p.id] || null;
      const unrankedDelta = Number(unrankedResult?.delta || 0);
      const ratingLabel = st?.ranked ? (ratingResult ? `Ranked rating: ${ratingResult.after} (${ratingDelta > 0 ? '+' : ''}${ratingDelta})` : 'Ranked · No rating change')
        : unrankedResult ? `Unranked rating: ${unrankedResult.after} (${unrankedDelta > 0 ? '+' : ''}${unrankedDelta})` : 'Unranked · Rating unavailable for this older result';
      return makePlayerOverviewCard(p, {
        headline: `${shownVP} VP`,
        headlineLabel: p.id === winnerId ? 'Final score · Winner' : 'Final score',
        ribbon: p.id === winnerId ? '★ Winner' : '',
        winner: p.id === winnerId,
        ratingText: ratingLabel,
        ratingTone: st?.ranked && ratingResult ? (ratingDelta > 0 ? 'positive' : ratingDelta < 0 ? 'negative' : '') : unrankedResult ? (unrankedDelta > 0 ? 'positive' : unrankedDelta < 0 ? 'negative' : '') : '',
        metrics: [
          { piece: 'settlement', color: p.color, label: 'Settlement VP', value: settlementVP },
          { piece: 'city', color: p.color, label: 'City VP', value: cityVP },
          { piece: 'road', color: p.color, label: 'Roads', value: safeNum(pc.roads) },
          { piece: 'ship', color: p.color, label: 'Ships', value: safeNum(pc.ships) },
          { icon: '◈', label: 'Exploration VP', value: explorationVP, title: `${safeNum(p.newIslandVP)} island / ${safeNum(p.ttdFarSideVP)} desert` },
          { asset: 'Dev Cards/Knight.png', label: 'Knights Played', value: knightsPlayed },
          { icon: '!', label: 'Stolen From', value: stolenFrom, tone: stolenFrom ? 'negative' : '' },
          { icon: '♜', label: 'Steals', value: steals },
        ],
      });
    });
    appendOverviewGrid(section, cards);
    ui.pgTabBody.appendChild(section);
    addNote(st?.ranked ? 'Ranked match · ranked rating changes are reflected in each player’s final result.' : 'Unranked match · cumulative Unranked Rating changes are shown when available; ranked ratings are unchanged.');

    const highlights = document.createElement('div');
    highlights.className = 'pgMatchHighlights';
    const target = Math.floor(Number(st?.rules?.victoryPointsToWin ?? st?.rules?.victoryTarget ?? st?.rules?.vpToWin) || 10);
    const lr = st.longestRoad?.playerId ? (players.find(p=>p.id===st.longestRoad.playerId)?.name || '—') : '—';
    const la = st.largestArmy?.playerId ? (players.find(p=>p.id===st.largestArmy.playerId)?.name || '—') : '—';
    for (const item of [
      { icon: '★', label: 'Victory target', value: `${target} VP` },
      { icon: '━', label: 'Longest Road', value: `${lr} · ${st.longestRoad?.length ?? 0}` },
      { icon: '♞', label: 'Largest Army', value: `${la} · ${st.largestArmy?.size ?? 0}` },
    ]) {
      const highlight = document.createElement('div');
      highlight.className = 'pgMatchHighlight';
      const icon = document.createElement('span');
      icon.textContent = item.icon;
      const copy = document.createElement('div');
      const label = document.createElement('small');
      label.textContent = item.label;
      const value = document.createElement('strong');
      value.textContent = item.value;
      copy.appendChild(label);
      copy.appendChild(value);
      highlight.appendChild(icon);
      highlight.appendChild(copy);
      highlights.appendChild(highlight);
    }
    ui.pgTabBody.appendChild(highlights);
    return;
  }

  // -------------------- DICE --------------------
  if (postgameState.tab === 'dice') {
    const ctrl = document.createElement('div');
    ctrl.className = 'pgSubTabs';
    const mkBtn = (key, label) => {
      const button = document.createElement('button');
      button.className = 'pgSubTab' + (postgameState.diceView === key ? ' active' : '');
      button.textContent = label;
      button.addEventListener('click', () => {
        postgameState.diceView = key;
        renderPostgameTab('dice');
      });
      return button;
    };
    ctrl.appendChild(mkBtn('totals', 'View Totals'));
    ctrl.appendChild(mkBtn('players', 'View Per Player'));
    ctrl.appendChild(mkBtn('prob', 'View Probability'));

    const viewTitles = {
      totals: 'Dice Rolls',
      players: 'Dice Rolls by Player',
      prob: 'Dice Rolls with Probability Overlay',
    };
    const section = makeSection(viewTitles[postgameState.diceView] || viewTitles.totals, ctrl);
    section.classList.add('pgStyledSection', 'pgDiceSection');
    const byNum = stats?.rolls?.byNumber || st.diceStats || {};
    const total = Number.isFinite(stats?.rolls?.total)
      ? stats.rolls.total
      : Object.values(byNum).reduce((sum, value) => sum + safeNum(value), 0);
    const byPlayer = stats?.rolls?.byPlayer || {};
    const probs = {2:1/36,3:2/36,4:3/36,5:4/36,6:5/36,7:6/36,8:5/36,9:4/36,10:3/36,11:2/36,12:1/36};
    const rolls = [];
    for (let roll = 2; roll <= 12; roll++) {
      let actual = safeNum(byNum[roll]);
      if (!actual) for (const p of players) actual += safeNum((byPlayer[p.id] || {})[roll]);
      rolls.push({ roll, actual, expected: total * (probs[roll] || 0) });
    }

    const largestValue = Math.max(1, ...rolls.map((item) => (
      postgameState.diceView === 'prob' ? Math.max(item.actual, item.expected) : item.actual
    )));
    const axisMax = Math.max(5, Math.ceil(largestValue / 5) * 5);
    const chart = document.createElement('div');
    chart.className = `pgDiceChart ${postgameState.diceView}`;
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', `${viewTitles[postgameState.diceView] || viewTitles.totals}, rolls 2 through 12`);
    const chartArea = document.createElement('div');
    chartArea.className = 'pgDiceChartArea';

    for (let tick = 5; tick <= axisMax; tick += 5) {
      const gridline = document.createElement('div');
      gridline.className = 'pgDiceGridline';
      gridline.style.bottom = `${(tick / axisMax) * 100}%`;
      const tickLabel = document.createElement('span');
      tickLabel.textContent = String(tick);
      gridline.appendChild(tickLabel);
      chartArea.appendChild(gridline);
    }

    const bars = document.createElement('div');
    bars.className = 'pgDiceBars';
    for (const item of rolls) {
      const column = document.createElement('div');
      column.className = 'pgDiceBarColumn';
      const heightValue = postgameState.diceView === 'prob'
        ? Math.max(item.actual, item.expected)
        : item.actual;
      const heightPercent = (heightValue / axisMax) * 100;
      const bar = document.createElement('div');
      bar.className = `pgDiceChartBar ${postgameState.diceView}`;
      if (item.roll === 7) bar.classList.add('seven');
      bar.style.height = `${heightPercent}%`;

      if (postgameState.diceView === 'players') {
        const playerTotal = players.reduce((sum, p) => sum + safeNum((byPlayer[p.id] || {})[item.roll]), 0);
        for (const p of players) {
          const value = safeNum((byPlayer[p.id] || {})[item.roll]);
          if (!value || !heightValue) continue;
          const segment = document.createElement('span');
          segment.className = 'pgDicePlayerSegment';
          segment.style.height = `${(value / heightValue) * 100}%`;
          segment.style.background = p.color || '#777';
          segment.title = `${p.name}: ${value}`;
          bar.appendChild(segment);
        }
        if (item.actual > playerTotal && heightValue) {
          const remainder = document.createElement('span');
          remainder.className = 'pgDicePlayerSegment unattributed';
          remainder.style.height = `${((item.actual - playerTotal) / heightValue) * 100}%`;
          remainder.title = `Unattributed: ${item.actual - playerTotal}`;
          bar.appendChild(remainder);
        }
      } else if (postgameState.diceView === 'prob') {
        const baseValue = Math.min(item.actual, item.expected);
        const base = document.createElement('span');
        base.className = 'pgDiceProbabilityBase';
        base.style.height = `${heightValue ? (baseValue / heightValue) * 100 : 0}%`;
        bar.appendChild(base);
        if (item.actual !== item.expected && heightValue) {
          const overlay = document.createElement('span');
          overlay.className = `pgDiceProbabilityDelta ${item.actual > item.expected ? 'positive' : 'negative'}`;
          overlay.style.height = `${(Math.abs(item.actual - item.expected) / heightValue) * 100}%`;
          bar.appendChild(overlay);
        }
      }

      const valueLabel = document.createElement('strong');
      valueLabel.className = 'pgDiceBarValue';
      valueLabel.style.bottom = `calc(${heightPercent}% + 4px)`;
      if (postgameState.diceView === 'prob') {
        const roundedDiff = Math.round(item.actual - item.expected);
        if (roundedDiff) {
          valueLabel.textContent = `${roundedDiff > 0 ? '+' : ''}${roundedDiff}`;
          valueLabel.classList.add(roundedDiff > 0 ? 'positive' : 'negative');
        } else {
          valueLabel.classList.add('hiddenValue');
        }
      } else {
        valueLabel.textContent = String(item.actual);
      }

      const rollLabel = document.createElement('span');
      rollLabel.className = 'pgDiceBarRoll';
      rollLabel.textContent = String(item.roll);
      column.appendChild(bar);
      column.appendChild(valueLabel);
      column.appendChild(rollLabel);
      bars.appendChild(column);
    }
    chartArea.appendChild(bars);
    chart.appendChild(chartArea);
    section.appendChild(chart);

    if (postgameState.diceView === 'players') {
      const legend = document.createElement('div');
      legend.className = 'pgLegend pgDiceLegend';
      for (const p of players) {
        const item = document.createElement('div');
        item.className = 'pgLegendItem';
        const dot = document.createElement('div');
        dot.className = 'pgLegendDot';
        dot.style.background = p.color || '#777';
        const name = document.createElement('div');
        name.textContent = p.name;
        item.appendChild(dot);
        item.appendChild(name);
        legend.appendChild(item);
      }
      section.appendChild(legend);
    }
    ui.pgTabBody.appendChild(section);
    if (postgameState.diceView === 'prob') addNote('Gray shows the expected 2d6 distribution. Red caps show the signed difference between actual and expected rolls.');
    else if (postgameState.diceView === 'players') addNote(`Total rolls: ${total}. Each bar is stacked by the player who rolled it.`);
    else addNote(`Total rolls: ${total}.`);
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
    replayControls.className = 'pgReplayControls';

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
      replayControls.appendChild(nav);

      const stepText = document.createElement('div');
      stepText.className = 'pgReplayText';
      const t = step && step.ts ? fmtDateTime(step.ts) : '—';
      stepText.textContent = `${t} · ${step && step.text ? step.text : '—'}`;
      replayControls.appendChild(stepText);
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
    replayControls.appendChild(chips);

    const resByPlayer = (stats && stats.resources && stats.resources.byPlayer) ? stats.resources.byPlayer : null;
    if (!postgameState.resourceCategoryEnabled || typeof postgameState.resourceCategoryEnabled !== 'object') {
      postgameState.resourceCategoryEnabled = defaultPostgameResourceCategories();
    }

    const selectedCategories = POSTGAME_RESOURCE_CATEGORIES.filter((category) => postgameState.resourceCategoryEnabled[category.key]);
    const categoryMapFor = (resourceStats, category) => {
      const out = Object.fromEntries(POSTGAME_RESOURCE_KEYS.map((key) => [key, 0]));
      if (!resourceStats) return out;
      const buckets = category.direction === 'gain' ? resourceStats.gainedBySource : resourceStats.lostBySource;
      for (const source of category.sources || []) {
        const map = buckets && buckets[source];
        if (!map) continue;
        if (source === 'gold_production' && postgameState.showGoldProductionAsGold) {
          out.gold += RESOURCE_KEYS.reduce((total, key) => total + safeNum(map[key]), 0);
          continue;
        }
        for (const key of POSTGAME_RESOURCE_KEYS) out[key] += safeNum(map[key]);
      }
      // Older saved matches used "dev" for both card purchases and Monopoly
      // losses. Only use that legacy bucket when no explicit Monopoly data exists.
      if (category.legacySources && sumRes(out) === 0) {
        for (const source of category.legacySources) {
          const map = buckets && buckets[source];
          if (!map) continue;
          for (const key of POSTGAME_RESOURCE_KEYS) out[key] += safeNum(map[key]);
        }
      }
      return out;
    };

    const resourceSummaries = players.map((player) => {
      const resourceStats = resByPlayer ? (resByPlayer[player.id] || null) : null;
      const gained = Object.fromEntries(POSTGAME_RESOURCE_KEYS.map((key) => [key, 0]));
      const lost = Object.fromEntries(POSTGAME_RESOURCE_KEYS.map((key) => [key, 0]));
      for (const category of selectedCategories) {
        const values = categoryMapFor(resourceStats, category);
        const target = category.direction === 'gain' ? gained : lost;
        for (const key of POSTGAME_RESOURCE_KEYS) target[key] += safeNum(values[key]);
      }
      const netByResource = Object.fromEntries(POSTGAME_RESOURCE_KEYS.map((key) => [key, gained[key] - lost[key]]));
      return {
        player,
        gained,
        lost,
        netByResource,
        gainedTotal: sumRes(gained),
        lostTotal: sumRes(lost),
        netTotal: sumRes(netByResource),
      };
    });

    const secTop = makeSection('Resources Overview');
    const categoryPanel = document.createElement('div');
    categoryPanel.className = 'pgResCategoryPanel';

    const categoryHeading = document.createElement('div');
    categoryHeading.className = 'pgResCategoryHeading';
    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'pgResCategoryTitle';
    categoryTitle.textContent = 'Resources Gained & Lost';
    const categoryMeta = document.createElement('div');
    categoryMeta.className = 'pgResCategoryMeta';
    categoryMeta.textContent = `${selectedCategories.length} of ${POSTGAME_RESOURCE_CATEGORIES.length} categories selected`;
    categoryHeading.appendChild(categoryTitle);
    categoryHeading.appendChild(categoryMeta);
    categoryPanel.appendChild(categoryHeading);

    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'pgResCategoryGrid';
    for (const category of POSTGAME_RESOURCE_CATEGORIES) {
      const enabled = !!postgameState.resourceCategoryEnabled[category.key];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `pgResCategoryToggle ${category.direction}${enabled ? ' active' : ''}`;
      button.dataset.resourceCategory = category.key;
      button.setAttribute('aria-label', category.label);
      button.setAttribute('aria-pressed', String(enabled));
      button.title = category.label;

      const icon = document.createElement('span');
      icon.className = 'pgResCategoryIcon';
      icon.textContent = category.icon;
      const label = document.createElement('span');
      label.className = 'pgResCategoryLabel';
      label.textContent = category.label;
      button.appendChild(icon);
      button.appendChild(label);
      button.addEventListener('click', () => {
        postgameState.resourceCategoryEnabled[category.key] = !enabled;
        renderPostgameTab('resources');
      });
      categoryGrid.appendChild(button);
    }
    categoryPanel.appendChild(categoryGrid);

    const goldMode = document.createElement('label');
    goldMode.className = 'pgResGoldMode';
    goldMode.title = 'When enabled, Gold Field dice production is counted as Gold instead of the resource cards players selected.';
    const goldModeCheckbox = document.createElement('input');
    goldModeCheckbox.type = 'checkbox';
    goldModeCheckbox.checked = !!postgameState.showGoldProductionAsGold;
    goldModeCheckbox.setAttribute('aria-label', 'Show Gold Field production as Gold');
    const goldModeIcon = document.createElement('img');
    goldModeIcon.src = getTextureAssetUrl('gold-resource.png');
    goldModeIcon.alt = '';
    goldModeIcon.draggable = false;
    const goldModeText = document.createElement('span');
    goldModeText.innerHTML = '<strong>Show Gold Field production as Gold</strong><small>Turn off to show the resource cards each player selected.</small>';
    goldModeCheckbox.addEventListener('change', () => {
      postgameState.showGoldProductionAsGold = goldModeCheckbox.checked;
      renderPostgameTab('resources');
    });
    goldMode.appendChild(goldModeCheckbox);
    goldMode.appendChild(goldModeIcon);
    goldMode.appendChild(goldModeText);
    categoryPanel.appendChild(goldMode);

    const categoryActions = document.createElement('div');
    categoryActions.className = 'pgResCategoryActions';
    const setAllCategories = (value) => {
      for (const category of POSTGAME_RESOURCE_CATEGORIES) postgameState.resourceCategoryEnabled[category.key] = value;
      renderPostgameTab('resources');
    };
    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = 'pgResCategoryAction';
    allButton.textContent = 'Select all';
    allButton.disabled = selectedCategories.length === POSTGAME_RESOURCE_CATEGORIES.length;
    allButton.addEventListener('click', () => setAllCategories(true));
    const noneButton = document.createElement('button');
    noneButton.type = 'button';
    noneButton.className = 'pgResCategoryAction';
    noneButton.textContent = 'Clear all';
    noneButton.disabled = selectedCategories.length === 0;
    noneButton.addEventListener('click', () => setAllCategories(false));
    categoryActions.appendChild(allButton);
    categoryActions.appendChild(noneButton);
    categoryPanel.appendChild(categoryActions);
    secTop.appendChild(categoryPanel);

    const overview = document.createElement('div');
    overview.className = 'pgResOverviewGrid';
    const maxStackMagnitude = Math.max(1, ...resourceSummaries.flatMap((summary) => (
      [summary.gainedTotal, summary.lostTotal]
    )));
    // Every lane uses the same scale. The richest gained/lost lane reaches the
    // ceiling and all other lanes are a linear fraction of it. Gold mode only
    // redistributes cards between colored sections, so it cannot alter a lane's
    // total visual height.
    const maxVisualStackHeight = Math.max(320, Math.min(560, 240 + Math.round(maxStackMagnitude * 2.6)));
    const minNonZeroStackHeight = 34;
    overview.style.setProperty('--pg-res-stack-ceiling', `${maxVisualStackHeight}px`);
    const resourceOrder = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold'];

    for (const summary of resourceSummaries) {
      const column = document.createElement('article');
      column.className = 'pgResPlayerColumn';
      column.style.setProperty('--pg-player-color', summary.player.color || '#777');

      const total = document.createElement('div');
      total.className = `pgResPlayerNet ${summary.netTotal > 0 ? 'positive' : (summary.netTotal < 0 ? 'negative' : 'zero')}`;
      total.textContent = `Net ${summary.netTotal > 0 ? '+' : ''}${summary.netTotal}`;
      total.title = `Gained ${summary.gainedTotal}; lost ${summary.lostTotal}`;
      column.appendChild(total);

      const lanes = document.createElement('div');
      lanes.className = 'pgResPlayerLanes';
      const laneSpecs = [
        { direction: 'gain', label: 'Gained', values: summary.gained, total: summary.gainedTotal, sign: '+' },
        { direction: 'loss', label: 'Lost', values: summary.lost, total: summary.lostTotal, sign: '−' },
      ];
      for (const laneSpec of laneSpecs) {
        const lane = document.createElement('div');
        lane.className = `pgResPlayerLane ${laneSpec.direction}`;

        const laneHeading = document.createElement('div');
        laneHeading.className = 'pgResPlayerLaneHeading';
        const laneLabel = document.createElement('span');
        laneLabel.textContent = laneSpec.label;
        const laneTotal = document.createElement('strong');
        laneTotal.textContent = `${laneSpec.sign}${laneSpec.total}`;
        laneHeading.appendChild(laneLabel);
        laneHeading.appendChild(laneTotal);
        lane.appendChild(laneHeading);

        const stack = document.createElement('div');
        stack.className = 'pgResPlayerStack';
        const laneEntries = resourceOrder
          .map((key) => ({ key, value: safeNum(laneSpec.values[key]) }))
          .filter((entry) => entry.value > 0);
        const blockCount = laneEntries.length;
        const stackHeight = laneSpec.total > 0
          ? Math.max(minNonZeroStackHeight, Math.round((laneSpec.total / maxStackMagnitude) * maxVisualStackHeight))
          : 0;
        if (blockCount) {
          stack.classList.add('hasValues');
          stack.style.height = `${stackHeight}px`;
          const usableBlockHeight = Math.max(1, stackHeight - Math.max(0, blockCount - 1) * 3);
          for (const { key, value } of laneEntries) {
            const block = document.createElement('div');
            block.className = `pgResStackBlock ${key} ${laneSpec.direction}`;
            block.style.flexGrow = String(value);
            block.style.flexBasis = '0px';
            const estimatedHeight = (value / laneSpec.total) * usableBlockHeight;
            if (estimatedHeight < 34) block.classList.add('compact');
            if (estimatedHeight < 17) block.classList.add('micro');
            block.title = `${laneSpec.label} ${value} ${RESOURCE_LABEL[key]}`;

            const image = document.createElement('img');
            image.src = getTextureAssetUrl(key === 'gold' ? 'gold-resource.png' : `Ports/${key}.png`);
            image.alt = RESOURCE_LABEL[key];
            image.draggable = false;
            const amount = document.createElement('span');
            amount.textContent = `${laneSpec.sign}${value}`;
            block.appendChild(image);
            block.appendChild(amount);
            stack.appendChild(block);
          }
        } else {
          stack.classList.add('empty');
          const empty = document.createElement('div');
          empty.className = 'pgResStackEmpty';
          empty.textContent = selectedCategories.length ? `No ${laneSpec.label.toLowerCase()} resources` : 'Choose categories above';
          stack.appendChild(empty);
        }
        lane.appendChild(stack);
        lanes.appendChild(lane);
      }
      column.appendChild(lanes);

      const player = document.createElement('div');
      player.className = 'pgResPlayerFooter';
      const swatch = document.createElement('span');
      swatch.className = 'pgResPlayerSwatch';
      swatch.style.background = summary.player.color || '#777';
      const name = document.createElement('span');
      name.textContent = summary.player.name;
      player.appendChild(swatch);
      player.appendChild(name);
      column.appendChild(player);
      overview.appendChild(column);
    }

    secTop.appendChild(overview);
    ui.pgTabBody.appendChild(secTop);

    if (!resByPlayer) {
      addNote('Detailed resource breakdown is unavailable for this match.');
      return;
    }

    const secTurn = makeSection('Per Turn Resource Deltas');
    secTurn.appendChild(replayControls);

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
    const section = makeSection('Player Activity');
    section.classList.add('pgStyledSection');
    const turnTimes = stats?.turnTimes?.byPlayer || {};
    const actions = stats?.actions?.byPlayer || {};
    const trades = stats?.trades?.byPlayer || {};
    const dev = stats?.dev?.byPlayer || {};
    const builds = stats?.builds?.byPlayer || {};
    const rolls = stats?.rolls?.byPlayer || {};
    const thieves = stats?.thieves || null;

    const cards = players.map((p) => {
      const tt = turnTimes[p.id] || {};
      const ac = actions[p.id] || {};
      const tr = trades[p.id] || {};
      const dv = dev[p.id] || {};
      const bl = builds[p.id] || {};
      const rl = rolls[p.id] || {};
      const stolenFrom = thieves ? (
        safeNum(thieves.robber?.stolenFromByPlayer?.[p.id]) +
        safeNum(thieves.pirate?.stolenFromByPlayer?.[p.id])
      ) : 0;
      const buildsTotal = safeNum(bl.settlement) + safeNum(bl.city) + safeNum(bl.road) + safeNum(bl.ship);
      return makePlayerOverviewCard(p, {
        headline: fmtMs(safeNum(tt.avgMs)),
        headlineLabel: 'Average turn',
        metrics: [
          { icon: '◷', label: 'Total time', value: fmtMs(safeNum(tt.totalMs)) },
          { icon: '↻', label: 'Turns', value: safeNum(tt.turns) },
          { icon: '⚄', label: 'Dice rolls', value: diceTotalFor(rl) },
          { icon: '⌂', label: 'Total builds', value: buildsTotal },
          { icon: '⌂', label: 'Settlements', value: safeNum(bl.settlement) },
          { icon: '▰', label: 'Cities', value: safeNum(bl.city) },
          { icon: '━', label: 'Roads', value: safeNum(bl.road) },
          { icon: '▲', label: 'Ships', value: safeNum(bl.ship) },
          { icon: '↝', label: 'Ship moves', value: safeNum(bl.ship_move) },
          { asset: 'Dev Cards/Knight.png', label: 'Dev played', value: safeNum(dv.played) },
          { icon: '⇄', label: 'Trades', value: safeNum(tr.bank) + safeNum(tr.player), title: `${safeNum(tr.bank)} bank / ${safeNum(tr.player)} player` },
          { asset: 'Robber Pirate/thief_robber.png', label: 'Robber moves', value: safeNum(ac.robberMoves) },
          { asset: 'Robber Pirate/thief_pirate.png', label: 'Pirate moves', value: safeNum(ac.pirateMoves) },
          { asset: 'Robber Pirate/thief_robber.png', label: 'Robber steals', value: safeNum(ac.robberSteals) },
          { asset: 'Robber Pirate/thief_pirate.png', label: 'Pirate steals', value: safeNum(ac.pirateSteals) },
          { icon: '!', label: 'Stolen from', value: stolenFrom, tone: stolenFrom ? 'negative' : '' },
          { icon: '7', label: 'Discards', value: safeNum(ac.discards), tone: safeNum(ac.discards) ? 'negative' : '' },
        ],
      });
    });
    appendOverviewGrid(section, cards);
    ui.pgTabBody.appendChild(section);
    if (!stats?.turnTimes?.byPlayer) addNote('Turn timing data is unavailable for this match; other activity totals are still shown.');
    else addNote('Trade totals combine bank and player trades. Robber and pirate actions remain separated for direct comparison.');
    return;
  }

  // -------------------- DEV CARDS --------------------
  if (postgameState.tab === 'devcards') {
    const controls = document.createElement('div');
    controls.className = 'pgControls';
    controls.appendChild(makePlayerSelect('Focus player', 'devFocusId', winnerId));

    const section = makeSection('Dev Cards Overview');
    section.classList.add('pgStyledSection');
    const byPlayer = stats?.dev?.byPlayer || null;
    if (!byPlayer) {
      section.appendChild(document.createTextNode('Dev card statistics are unavailable for this match.'));
      ui.pgTabBody.appendChild(section);
      return;
    }

    const types = [
      { keys: ['knight'], label: 'Knight', asset: 'Dev Cards/Knight.png' },
      { keys: ['victory_point'], label: 'Victory Point', asset: 'Dev Cards/VictoryPoint.png' },
      { keys: ['road_building'], label: 'Road Building', asset: 'Dev Cards/RoadBuilding.png' },
      { keys: ['year_of_plenty', 'invention'], label: 'Year of Plenty', asset: 'Dev Cards/Invention.png' },
      { keys: ['monopoly'], label: 'Monopoly', asset: 'Dev Cards/Monopoly.png' },
    ];
    const typeCount = (bucket, type) => type.keys.reduce((sum, key) => sum + safeNum(bucket?.[key]), 0);

    const cards = players.map((p) => {
      const data = byPlayer[p.id] || {};
      const playedByType = data.playedByType || {};
      return makePlayerOverviewCard(p, {
        headline: safeNum(data.bought),
        headlineLabel: 'Cards bought',
        metrics: [
          { icon: '▶', label: 'Total played', value: safeNum(data.played) },
          { icon: '◫', label: 'Unplayed', value: Math.max(0, safeNum(data.bought) - safeNum(data.played)) },
          ...types.map((type) => ({
            asset: type.asset,
            label: `${type.label} played`,
            value: typeCount(playedByType, type),
          })),
        ],
      });
    });
    appendOverviewGrid(section, cards);
    ui.pgTabBody.appendChild(section);

    const pid = postgameState.devFocusId || winnerId;
    const focus = players.find((player) => player.id === pid) || players[0];
    const data = byPlayer[focus?.id] || {};
    const boughtByType = data.boughtByType || {};
    const playedByType = data.playedByType || {};

    const focusSection = makeSection(`${focus?.name || 'Player'} · Card Breakdown`, controls);
    focusSection.classList.add('pgStyledSection', 'pgDevFocusSection');
    focusSection.style.setProperty('--pg-player-color', focus?.color || '#777');
    const typeGrid = document.createElement('div');
    typeGrid.className = 'pgDevTypeGrid';
    for (const type of types) {
      const card = document.createElement('article');
      card.className = 'pgDevTypeCard';
      const image = document.createElement('img');
      image.src = getTextureAssetUrl(type.asset);
      image.alt = type.label;
      image.draggable = false;
      const label = document.createElement('strong');
      label.textContent = type.label;
      const values = document.createElement('div');
      values.className = 'pgDevTypeValues';
      for (const item of [
        ['Bought', typeCount(boughtByType, type)],
        ['Played', typeCount(playedByType, type)],
      ]) {
        const metric = document.createElement('span');
        const metricLabel = document.createElement('small');
        metricLabel.textContent = item[0];
        const metricValue = document.createElement('b');
        metricValue.textContent = String(item[1]);
        metric.appendChild(metricLabel);
        metric.appendChild(metricValue);
        values.appendChild(metric);
      }
      card.appendChild(image);
      card.appendChild(label);
      card.appendChild(values);
      typeGrid.appendChild(card);
    }
    focusSection.appendChild(typeGrid);
    ui.pgTabBody.appendChild(focusSection);

    addNote('Dev stats are derived from purchases and plays tracked by the server.');
    return;
  }
}


function enterPostgame() {
  if (!ui.postgameOverlay) return;
  clearPostgameTimers();

  postgameState.active = true;
  postgameState.hidden = false;
  if (ui.pgMainMenuBtn) { ui.pgMainMenuBtn.disabled = false; ui.pgMainMenuBtn.textContent = 'Main Menu'; }
  if (ui.pgRematchBtn) { ui.pgRematchBtn.disabled = false; ui.pgRematchBtn.textContent = 'Rematch'; }
  postgameState.resourceCategoryEnabled = defaultPostgameResourceCategories();
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
  historyState.loadingChallenges = true;
  setHistoryVisible(true);
  requestHistoryData();
  refreshHistoryFriends();
  refreshSavedReplays();
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
    send({ type: 'get_challenge_archive' });
  } catch(_) {}
}

// Friends are resolved from the authenticated account; this never relies on display names.
async function refreshHistoryFriends() {
  try {
    const result = await accountApi('friends');
    historyState.friendIds = new Set((result.friends || []).map(friend => String(friend.id)));
  } catch (error) {
    historyState.friendIds = new Set();
    if (historyState.friendsOnly) toast('Friends could not be loaded: ' + (error.message || error));
  }
  if (historyState.active) renderHistory();
}

function openReplayLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser does not support saved replay storage.')); return; }
    const request = indexedDB.open('hexsettlers-offline-replays', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('replays')) request.result.createObjectStore('replays', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Replay storage could not open.'));
  });
}
async function replayLibraryOp(kind, value) {
  const db = await openReplayLibrary();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('replays', kind === 'getAll' ? 'readonly' : 'readwrite');
      const request = kind === 'getAll' ? tx.objectStore('replays').getAll()
        : kind === 'put' ? tx.objectStore('replays').put(value)
        : tx.objectStore('replays').delete(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not access saved replays.'));
      tx.onabort = () => reject(tx.error || new Error('Replay storage transaction failed.'));
    });
  } finally { db.close(); }
}
function replayEntryIsUsable(game) {
  return !!(game && typeof game.id === 'string' && game.id.length < 128 &&
    game.replay && game.replay.initial && Array.isArray(game.replay.steps) && game.replay.steps.length < 100000 &&
    Array.isArray(game.players) && game.players.length <= 8 && game.snapshot && typeof game.snapshot === 'object');
}
async function refreshSavedReplays() {
  try {
    historyState.savedReplays = (await replayLibraryOp('getAll')).filter(g => replayEntryIsUsable(g.game));
    historyState.savedReplays.sort((a,b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  } catch(error) { historyState.savedReplays = []; }
  if (historyState.active) renderHistory();
}
function renderSavedReplayList() {
  const saved = historyState.savedReplays.filter(item => !historyState.friendsOnly ||
    (item.game.players || []).some(p => historyState.friendIds.has(String(p.id))));
  if (!saved.length) return;
  const heading = document.createElement('div'); heading.className = 'historySavedSection';
  heading.textContent = `Saved replays on this device (${saved.length})`;
  ui.historyBody.appendChild(heading);
  for (const item of saved) {
    const game = item.game;
    const card = document.createElement('div'); card.className = 'historyCard';
    const label = document.createElement('label'); label.className = 'historyGameSelect';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.checked = historyState.selectedIds.has(item.id);
    checkbox.setAttribute('aria-label', 'Select saved replay for download');
    checkbox.addEventListener('change', () => { if(checkbox.checked) historyState.selectedIds.add(item.id); else historyState.selectedIds.delete(item.id); });
    label.appendChild(checkbox);
    const meta = document.createElement('div'); meta.className = 'historyMeta';
    const title = document.createElement('div'); title.className = 'historyLine1';
    title.textContent = (game.winnerName || 'Completed game') + ' · ' + (game.players || []).map(p => p.name).join(', ');
    const info = document.createElement('div'); info.className = 'historyLine2';
    info.textContent = `${fmtDateTime(game.endedAt)} · Offline replay · ${(game.replay.steps || []).length} steps`;
    meta.append(title,info);
    const actions = document.createElement('div'); actions.className = 'historyActions';
    for (const [name,callback] of [
      ['Replay', () => startHistoryReplay(game)],
      ['View Summary', () => openPostgameSnapshot(cloneReplayValue(game.snapshot), game, {tab:'summary'})],
      ['Remove', async () => { await replayLibraryOp('delete', item.id); historyState.selectedIds.delete(item.id); refreshSavedReplays(); }],
    ]) {
      const button = document.createElement('button'); button.className = 'btn'; button.type = 'button';
      button.textContent = name; button.addEventListener('click', callback); actions.appendChild(button);
    }
    card.append(label,meta,actions); ui.historyBody.appendChild(card);
  }
}
async function importReplayFile(file) {
  if (!file) return;
  if (file.size > 80 * 1024 * 1024) throw new Error('Replay file exceeds 80 MB.');
  const pack = JSON.parse(await file.text());
  if (pack?.format !== 'hex-settlers-replay-pack' || pack.version !== 1 ||
    !Array.isArray(pack.games) || !pack.games.length || pack.games.length > 300) {
    throw new Error('This is not a supported Hex Settlers replay export.');
  }
  for (const game of pack.games) if (!replayEntryIsUsable(game)) throw new Error('Replay file is incomplete or invalid.');
  for (const game of pack.games) await replayLibraryOp('put', { id: 'saved:' + game.id, game, savedAt: Date.now() });
  await refreshSavedReplays();
  return pack.games.length;
}
function downloadChosenReplays() {
  const local = historyState.savedReplays.filter(item => historyState.selectedIds.has(item.id)).map(item => item.game);
  const selectedServer = historyState.games.filter(item => historyState.selectedIds.has(item.id)).map(item => item.id);
  if (!local.length && !selectedServer.length) { toast('Select one or more games from Game History to download.'); return; }
  historyState.exporting = { queue: selectedServer, games: local };
  requestNextReplayExport();
}
function requestNextReplayExport() {
  const task = historyState.exporting; if (!task) return;
  if (task.queue.length) {
    const id = task.queue.shift();
    historyState.openMode = 'download';
    send({ type: 'get_game_history_entry', id });
    return;
  }
  historyState.exporting = null;
  const filename = `hex-settlers-replays-${new Date().toISOString().slice(0,10)}.json`;
  saveBrowserJson(filename, { format: 'hex-settlers-replay-pack', version: 1, exportedAt: new Date().toISOString(), games: task.games });
  historyState.openMode = 'summary';
  toast(`Downloaded ${task.games.length} replay${task.games.length === 1 ? '' : 's'}.`);
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
  const filterBox = $('historyFriendsOnly');
  if (filterBox) filterBox.checked = historyState.friendsOnly;
  const challengeView = historyState.tab === 'games' ? historyState.gameMode === 'challenge' : historyState.leaderboardMode === 'challenge';
  $('historyDownloadSelectedBtn')?.classList.toggle('hidden', historyState.tab !== 'games' || challengeView);
  $('historyUploadReplayBtn')?.classList.toggle('hidden', historyState.tab !== 'games' || challengeView);
  const toolbarFriends = $('historyFriendsOnly')?.closest('label');
  if (toolbarFriends) toolbarFriends.classList.toggle('hidden', challengeView);

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

// Shared challenge archive explorer: identical 4–8 / Weeklys–Dailies / date /
// friends / search controls in Game History and Player Stats.
function renderChallengeExplorer(section) {
  const filters = historyState.challengeFilters[section];
  const root = document.createElement('div');
  root.className = 'challengeExplorer';
  ui.historyBody.appendChild(root);
  const countTabs = document.createElement('div');
  countTabs.className = 'challengeMapTabs';
  countTabs.setAttribute('role', 'tablist');
  countTabs.setAttribute('aria-label', 'Challenge capacity');
  for (const count of [4,5,6,7,8]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `challengeMapTab${filters.count === count ? ' active' : ''}`;
    btn.textContent = `${count} Players`;
    btn.setAttribute('aria-selected', String(filters.count === count));
    btn.addEventListener('click', () => { filters.count = count; renderHistory(); });
    countTabs.appendChild(btn);
  }
  root.appendChild(countTabs);
  const periods = document.createElement('div');
  periods.className = 'leaderboardSubTabs';
  for (const [kind, label] of [['weekly','Weeklys'], ['daily','Dailies']]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hTab${filters.kind === kind ? ' active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => { filters.kind = kind; renderHistory(); });
    periods.appendChild(btn);
  }
  root.appendChild(periods);
  const bar = document.createElement('div');
  bar.className = 'challengeExplorerFilters';
  const friends = document.createElement('label');
  friends.className = 'checkRow';
  const friendCheck = document.createElement('input');
  friendCheck.type = 'checkbox';
  friendCheck.checked = filters.friendsOnly;
  friendCheck.addEventListener('change', () => { filters.friendsOnly = friendCheck.checked; renderHistory(); });
  friends.append(friendCheck, document.createTextNode('Friends only'));
  bar.appendChild(friends);
  function filterControl(label, control) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    wrap.appendChild(control);
    bar.appendChild(wrap);
    return wrap;
  }
  const search = document.createElement('input');
  search.className = 'input';
  search.type = 'search';
  search.placeholder = 'Player or room code';
  search.value = filters.search;
  search.setAttribute('aria-label', 'Search challenge history');
  search.addEventListener('input', () => {
    const cursor = search.selectionStart;
    filters.search = search.value;
    renderHistory();
    const next = ui.historyBody.querySelector('.challengeExplorerFilters input[type="search"]');
    if (next) { next.focus(); try { next.setSelectionRange(cursor, cursor); } catch (_) {} }
  });
  filterControl('Search', search);
  const range = document.createElement('select');
  range.className = 'input';
  for (const [val, label] of [['all','All dates'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['custom','Custom date window']]) {
    const option = document.createElement('option'); option.value = val; option.textContent = label;
    range.appendChild(option);
  }
  range.value = filters.range;
  range.addEventListener('change', () => { filters.range = range.value; renderHistory(); });
  filterControl('Date window', range);
  if (filters.range === 'custom') {
    const dates = document.createElement('div');
    dates.className = 'challengeExplorerDateCustom';
    for (const [key, label] of [['from','From'],['to','Through']]) {
      const date = document.createElement('input'); date.type = 'date'; date.className = 'input';
      date.value = filters[key];
      date.addEventListener('change', () => { filters[key] = date.value; renderHistory(); });
      const pair = document.createElement('label'); pair.textContent = label; pair.appendChild(date);
      dates.appendChild(pair);
    }
    bar.appendChild(dates);
  }
  root.appendChild(bar);
  const result = document.createElement('div');
  result.className = section === 'games' ? 'historyList' : 'challengeExplorerTable';
  root.appendChild(result);
  if (historyState.loadingChallenges) {
    const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Loading challenge archive…'; result.appendChild(p); return;
  }
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(new Date()).map(piece => [piece.type, piece.value]));
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const minDate = ['7','30','90'].includes(filters.range)
    ? new Date(todayMs - (Number(filters.range) - 1) * 86400000).toISOString().slice(0,10)
    : filters.range === 'custom' ? filters.from : '';
  const maxDate = filters.range === 'custom' ? filters.to : '';
  const needle = filters.search.trim().toLowerCase();
  const games = (historyState.challengeArchive || []).filter(game => {
    const ch = game.challenge;
    if (!ch || Number(ch.playerCount) !== filters.count) return false;
    const kind = ch.kind === 'daily' ? 'daily' : 'weekly';
    if (kind !== filters.kind) return false;
    const period = kind === 'daily' ? ch.dayId : ch.weekId;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(period || '')) return false;
    if (minDate && period < minDate) return false;
    if (maxDate && period > maxDate) return false;
    if (filters.friendsOnly && !(game.players || []).some(p => historyState.friendIds.has(String(p.id)))) return false;
    return true;
  });
  if (section === 'games') {
    const matching = games.filter(game => !needle ||
      [game.roomCode, game.winnerName, ...(game.players || []).map(p => p.name)]
        .some(value => String(value || '').toLowerCase().includes(needle)));
    matching.sort((a,b) => Number(b.endedAt || 0) - Number(a.endedAt || 0));
    if (!matching.length) {
      const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No challenge games match these filters.'; result.appendChild(p);
    }
    for (const game of matching) {
      const card = document.createElement('div'); card.className = 'historyCard';
      const meta = document.createElement('div'); meta.className = 'historyMeta';
      const title = document.createElement('div'); title.className = 'historyLine1';
      title.textContent = `${game.winnerName || 'Unknown winner'} won · ${filters.count} Players · ${filters.kind === 'daily' ? 'Daily' : 'Weekly'} ${game.challenge.dayId || game.challenge.weekId}`;
      const detail = document.createElement('div'); detail.className = 'historyLine2';
      detail.textContent = `${fmtDateTime(game.endedAt)} · ${mapLabelFromRules(game.rules)} · Turn ${Number(game.turns || 0) + 1} · ${game.roomCode || '—'} · ${(game.players || []).map(p => `${p.name} (${p.vp})`).join(' • ')}`;
      meta.append(title, detail);
      const actions = document.createElement('div'); actions.className = 'historyActions';
      for (const [label, mode] of [['Replay','replay'],['View Summary','summary']]) {
        const button = document.createElement('button'); button.className = `btn${mode === 'summary' ? ' primary' : ''}`;
        button.textContent = label;
        button.disabled = mode === 'replay' && Number(game.replaySteps || 0) < 1;
        button.addEventListener('click', () => { historyState.openMode = mode; send({type:'get_game_history_entry', id:game.id}); });
        actions.appendChild(button);
      }
      card.append(meta, actions); result.appendChild(card);
    }
    return;
  }
  const best = new Map();
  for (const game of games) {
    const id = String(game.winnerId || '');
    if (!id || id.startsWith('ai_') || game.endedReason === 'vote') continue;
    const winner = (game.players || []).find(p => String(p.id) === id);
    if (!winner || (filters.friendsOnly && !historyState.friendIds.has(id))) continue;
    const totalVP = Number(winner.vp);
    const target = Number(game.rules?.victoryPointsToWin) || (filters.count === 4 ? 12 : 14);
    if (!Number.isFinite(totalVP) || totalVP < target) continue;
    const turns = Math.floor(Number(game.turns));
    if (!Number.isFinite(turns) || turns < 0) continue;
    const started = Number(game.startedAt), ended = Number(game.endedAt);
    const elapsed = Number.isFinite(started) && Number.isFinite(ended) && started > 0 && ended >= started ? ended - started : null;
    const candidate = { id, name:String(game.winnerName || winner.name || 'Player'), lowestTurns:turns+1, lowestTimeMs:elapsed, totalVP,
      period: game.challenge.dayId || game.challenge.weekId };
    if (needle && !candidate.name.toLowerCase().includes(needle)) continue;
    const previous = best.get(id);
    if (!previous || compareChallengeScores(candidate, previous) < 0) best.set(id, candidate);
  }
  const rows = [...best.values()].sort((a,b) => compareChallengeScores(a,b));
  const ranked = new Map(rows.map((row,index) => [row.id,index+1]));
  const key = filters.sortKey, mult = filters.sortDir === 'desc' ? -1 : 1;
  rows.sort((a,b) => {
    const va = a[key], vb = b[key];
    const compare = key === 'name' || key === 'period' ? String(va || '').localeCompare(String(vb || ''))
      : (va == null ? Infinity : Number(va)) - (vb == null ? Infinity : Number(vb));
    return (compare * mult) || (ranked.get(a.id) - ranked.get(b.id));
  });
  const table = document.createElement('table');
  const thead = document.createElement('thead'); const header = document.createElement('tr');
  const tbody = document.createElement('tbody');
  const cols = [['name','Player'],['lowestTimeMs','Lowest Time'],['lowestTurns','Lowest Turns to Win'],['totalVP','Total VP earned'],['period','Period']];
  for (const [col, label] of cols) {
    const th = document.createElement('th');
    th.setAttribute('aria-sort', col === key ? (mult === 1 ? 'ascending' : 'descending') : 'none');
    const button = document.createElement('button');
    button.textContent = `${label} ${col === key ? (mult === 1 ? '▲' : '▼') : '↕'}`;
    button.addEventListener('click', () => {
      filters.sortDir = filters.sortKey === col && filters.sortDir === 'asc' ? 'desc' : 'asc';
      filters.sortKey = col;
      renderHistory();
    });
    th.appendChild(button); header.appendChild(th);
  }
  thead.appendChild(header); table.appendChild(thead);
  for (const item of rows) {
    const tr = document.createElement('tr');
    for (const value of [`#${ranked.get(item.id)}  ${item.name}`, formatChallengeTime(item.lowestTimeMs), item.lowestTurns, item.totalVP, item.period]) {
      const cell = document.createElement('td'); cell.textContent = String(value); tr.appendChild(cell);
    }
    tbody.appendChild(tr);
  }
  if (!rows.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = cols.length; td.className = 'hint'; td.textContent = 'No qualifying challenge wins match these filters.';
    tr.appendChild(td); tbody.appendChild(tr);
  }
  table.appendChild(tbody); result.appendChild(table);
}

function compareChallengeScores(a, b) {
  return (a.lowestTurns - b.lowestTurns)
    || ((a.lowestTimeMs == null ? Infinity : a.lowestTimeMs) - (b.lowestTimeMs == null ? Infinity : b.lowestTimeMs))
    || (a.totalVP - b.totalVP)
    || a.name.localeCompare(b.name);
}

function renderGamesHistoryTab() {
  const subTabs = document.createElement('div');
  subTabs.className = 'leaderboardSubTabs';
  for (const [key, label] of [['challenge','Challenge Maps'], ['ranked','Ranked'], ['unranked','Unranked']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hTab${historyState.gameMode === key ? ' active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => { historyState.gameMode = key; renderHistory(); });
    subTabs.appendChild(button);
  }
  ui.historyBody.appendChild(subTabs);
  if (historyState.gameMode === 'challenge') { renderChallengeExplorer('games'); return; }
  const wrap = document.createElement('div');
  wrap.className = 'historyList';

  const games = (Array.isArray(historyState.games) ? historyState.games : []).filter(g =>
    !g.challenge && (historyState.gameMode === 'ranked' ? !!g.ranked : !g.ranked) &&
    (!historyState.friendsOnly || (g.players || []).some(p => historyState.friendIds.has(String(p.id)))));
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

      const select = document.createElement('label');
      select.className = 'historyGameSelect';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = historyState.selectedIds.has(g.id);
      checkbox.setAttribute('aria-label', 'Select game for replay download');
      checkbox.addEventListener('change', () => { if (checkbox.checked) historyState.selectedIds.add(g.id); else historyState.selectedIds.delete(g.id); });
      select.appendChild(checkbox);
      const meta = document.createElement('div');
      meta.className = 'historyMeta';

      const pLine = (Array.isArray(g.players) ? g.players : []).map(p => `${p.name} (${p.vp})`).join(' • ');
      const line1 = document.createElement('div');
      line1.className = 'historyLine1';
      const w = g.winnerName ? `${g.winnerName} won` : 'Completed game';
      line1.textContent = `${w} — ${pLine || '—'}`;

      const line2 = document.createElement('div');
      line2.className = 'historyLine2';
      line2.textContent = `${fmtDateTime(g.endedAt)}  •  ${g.ranked == null ? 'Unranked · Legacy game' : g.ranked ? 'Ranked' : (g.casual ? 'Casual · vs AI' : 'Unranked')}  •  Turns: ${Number(g.turns || 0)}  •  ${mapLabelFromRules(g.rules)}`;

      meta.appendChild(line1);
      meta.appendChild(line2);

      const actions = document.createElement('div');
      actions.className = 'historyActions';
      const replayBtn = document.createElement('button');
      replayBtn.className = 'btn';
      replayBtn.textContent = 'Replay';
      replayBtn.disabled = Math.max(0, Number(g.replaySteps || 0)) < 1;
      if (replayBtn.disabled) replayBtn.title = 'This older game was saved before step-by-step replays were available.';
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

      card.appendChild(select);
      card.appendChild(meta);
      card.appendChild(actions);
      wrap.appendChild(card);
    }
  }

  ui.historyBody.appendChild(wrap);
  renderSavedReplayList();
}

function sortLeaderboardRows(rows) {
  const key = historyState.sortKey || 'rankedRating';
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

function setLeaderboardMode(mode) {
  historyState.leaderboardMode = ['challenge', 'ranked', 'unranked', 'combined'].includes(mode) ? mode : 'combined';
  historyState.sortKey = historyState.leaderboardMode === 'unranked' ? 'unrankedRating' : 'rankedRating';
  historyState.sortDir = 'desc';
  renderHistory();
}

function renderLeaderboardTab() {
  const rowsRaw = (Array.isArray(historyState.leaderboard) ? historyState.leaderboard : []).filter(r => !historyState.friendsOnly || historyState.friendIds.has(String(r.id)));
  const mode = ['challenge','ranked', 'unranked', 'combined'].includes(historyState.leaderboardMode) ? historyState.leaderboardMode : 'combined';
  const subTabs = document.createElement('div');
  subTabs.className = 'leaderboardSubTabs';
  for (const [key, label] of [['challenge', 'Challenge Maps'], ['ranked', 'Ranked Play'], ['unranked', 'Unranked Play'], ['combined', 'Combined']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hTab${mode === key ? ' active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => setLeaderboardMode(key));
    subTabs.appendChild(button);
  }
  ui.historyBody.appendChild(subTabs);
  if (mode === 'challenge') { renderChallengeExplorer('players'); return; }
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
  }).map((row) => ({
    ...row,
    ...(row && row[mode] && typeof row[mode] === 'object' ? row[mode] : {}),
    rankedRating: row?.rankedRating,
    unrankedRating: row?.unrankedRating,
  }));

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
    h.textContent = 'No player stats are available yet.';
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
  ];
  if (mode !== 'unranked') columns.push({ key: 'rankedRating', label: 'Ranked Rating' });
  if (mode !== 'ranked') columns.push({ key: 'unrankedRating', label: 'Unranked Rating' });

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
    if (mode !== 'unranked') add(Number.isFinite(Number(r.rankedRating)) ? Math.round(Number(r.rankedRating)) : 1000);
    if (mode !== 'ranked') add(Number.isFinite(Number(r.unrankedRating)) ? Math.round(Number(r.unrankedRating)) : 0);

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
  postgameState.resourceCategoryEnabled = defaultPostgameResourceCategories();

  if (ui.pgShowBtn) ui.pgShowBtn.classList.add('hidden');
  if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.textContent = 'Back';
  if (ui.pgRematchBtn) ui.pgRematchBtn.classList.add('hidden');
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
  if (ui.pgRematchBtn) ui.pgRematchBtn.classList.remove('hidden');
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

  function isCustom78Map(rules) {
    return (String(rules?.mapMode || '') === 'classic78' && rules.customMap===true) ||
      String(rules?.mapMode || '') === 'seafarers78' && rules?.seafarersScenario === 'test_builder_78' ||
      (String(rules?.mapMode || '') === 'seafarers' && String(rules?.seafarersScenario || '') === 'test_builder_78');
  }
  function defaultVictoryPointsFor(rules) {
    const mmRaw = String(rules?.mapMode || 'classic').toLowerCase();
    // UI can use a synthetic mapMode 'seafarers56' to represent 5–6 player Seafarers scenarios.
    const mm = (mmRaw === 'seafarers56' || mmRaw === 'seafarers78') ? 'seafarers' : mmRaw;
    const scen = (mmRaw === 'seafarers78') ? String(rules?.seafarersScenario78 || rules?.seafarersScenario || 'eight_islands_78').toLowerCase() : (mmRaw === 'seafarers56')
      ? String(rules?.seafarersScenario56 || rules?.seafarersScenario || 'six_islands').toLowerCase()
      : String(rules?.seafarersScenario || 'four_islands').toLowerCase();
    if (mm !== 'seafarers') return 10;
    if (scen === 'fog_island' || scen === 'fog-island' || scen === 'fog' || scen === 'fog_island_56' || scen === 'fog_island_78') return 12;
    if (scen === 'through_the_desert' || scen === 'through-the-desert' || scen === 'desert' || scen === 'through_the_desert_56' || scen === 'through_the_desert_78' || scen === 'eight_islands_78') return 14;
    if (scen === 'heading_for_new_shores' || scen === 'heading-for-new-shores' || scen === 'new_shores' || scen === 'newshores' || scen === 'heading') return 14;
    if (scen === 'six_islands' || scen === 'six-islands' || scen === 'sixislands' || scen === 'six') return 14;
    // The 5–6 and 7–8 player Cartographer / Scattered Tiles scenarios default to 14 VP.
    if (scen === 'cartographer_78' || scen === 'scattered_tiles_78' || scen === 'cartographer_78_7' || scen === 'cartographer_78_8' || scen === 'scattered_tiles_78_7' || scen === 'scattered_tiles_78_8') return 14;
    if (scen === 'cartographer_56_manual' || scen === 'cartographer-56-manual' || scen === 'cartographer56_manual' || scen === 'cartographer_56_random' || scen === 'cartographer-56-random' || scen === 'cartographer56_random' || scen === 'scattered_tiles_56' || scen === 'scattered_tiles56' || scen === 'scattered_56') return 14;
    if (scen === 'cartographer_4_manual' || scen === 'cartographer-4-manual' || scen === 'cartographer_manual' || scen === 'manual_cartographer') return 12;
    if (scen === 'cartographer_4_random' || scen === 'cartographer-4-random' || scen === 'cartographer_random' || scen === 'random_cartographer' || scen === 'cartographer_4' || scen === 'cartographer-4' || scen === 'cartographer4' || scen === 'cartographer') return 12;
    return 13; // four islands
  }

  function defaultBaseResourcesFor(rules) {
    const mmRaw = String(rules?.mapMode || 'classic').toLowerCase();
    const mm = mmRaw;
    if (mm === 'classic78' || mm === 'seafarers78' || isCustom78Map(rules) || (mm==='seafarers' && /_78(_[78])?$/.test(String(rules?.seafarersScenario||'')))) return 30;
    if (mm === 'classic56' || mm === 'seafarers56') return 24;
    const scen = String(rules?.seafarersScenario56 || rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    if (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'test_builder_56')) return 24;
    return 19;
  }

  function uiMapModeFromRules(rules) {
    const mm = String(rules?.mapMode || 'classic').toLowerCase();
    const scen = String(rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    if (mm === 'seafarers' && (scen === 'test_builder_78' || scen.endsWith('_78') || scen==='cartographer_78_7' || scen==='cartographer_78_8' || scen==='scattered_tiles_78_7' || scen==='scattered_tiles_78_8')) return 'seafarers78';
    if (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'test_builder_56')) return 'seafarers56';
    return rules?.mapMode || 'classic';
  }

  // The visible Map selector describes the map family; the visible player
  // selector describes its board-size range. Existing underlying map modes
  // remain unchanged, preserving server rules and saved scenario templates.
  function mapModeForSetupSelection(family, size) {
    const seafarers = family === 'seafarers';
    const count = Number(size);
    if (count >= 8) return seafarers ? 'seafarers78' : 'classic78';
    if (count >= 6) return seafarers ? 'seafarers56' : 'classic56';
    return seafarers ? 'seafarers' : 'classic';
  }

  function setupSizeForMapMode(mode) {
    const mm = String(mode || 'classic');
    if (mm === 'classic78' || mm === 'seafarers78') return 8;
    if (mm === 'classic56' || mm === 'seafarers56') return 6;
    return 4;
  }

  function syncPlayerCountOptions(requested = null) {
    if (!ui.playerCountSelect) return;
    const casual = selectedPlayMode === 'casual' || !!room?.casual;
    const modeSize = setupSizeForMapMode(ui.mapModeSelect?.value);
    const raw = requested == null ? Number(ui.playerCountSelect.value) : Number(requested);
    const size = raw >= 7 ? 8 : raw >= 5 ? 6 : 4;
    // Map mode determines the active category whenever an older lobby or
    // template contains an exact 2/3/5/7-player setting.
    const chosen = Math.min(casual ? 6 : 8, requested == null && size !== modeSize ? modeSize : size);
    ui.playerCountSelect.replaceChildren();
    const categories = [[4, '4 Player'], [6, '5-6 Player'], ...(casual ? [] : [[8, '7-8 Player']])];
    for (const [count, label] of categories) {
      const opt = document.createElement('option');
      opt.value = String(count);
      opt.textContent = label;
      ui.playerCountSelect.appendChild(opt);
    }
    ui.playerCountSelect.value = String(chosen);
  }

  function uiIsSixIslands(rulesOrSelection) {
    const mm = String(rulesOrSelection?.mapMode || 'classic').toLowerCase();
    if (mm === 'seafarers56') return true;
    const scen = String(rulesOrSelection?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
    return (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'test_builder_56'));
  }

  function uiIsTestBuilderScenario(rulesOrSelection) {
    const scenario = String(rulesOrSelection?.seafarersScenario || rulesOrSelection?.seafarersScenario56 || '').toLowerCase().replace(/-/g, '_');
    return scenario === 'test_builder' || scenario === 'test_builder_56' || scenario === 'test_builder_78';
  }

  function syncTestBuilderToolModeUi() {
    const portMode = String(ui.testToolSelect?.value || 'tile') === 'port';
    ui.testBrushSelect?.classList.toggle('hidden', portMode);
    ui.testNumberSelect?.classList.toggle('hidden', portMode);
    ui.testPortSelect?.classList.toggle('hidden', !portMode);
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

  let gamePanelsExpanded = true;
  let activeMobilePanelTab = 'resources';
  const panelTabs = $('mobilePanelTabs');
  function selectGamePanelTab(name) {
    activeMobilePanelTab = ['resources', 'log', 'dev'].includes(name) ? name : 'resources';
    if (ui.rightSidebar) ui.rightSidebar.dataset.activePanel = activeMobilePanelTab;
    panelTabs?.querySelectorAll('[data-panel]').forEach(button => {
      const selected = button.dataset.panel === activeMobilePanelTab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (activeMobilePanelTab === 'log' && state && ui.logList) renderLogList(ui.logList);
  }
  panelTabs?.addEventListener('click', event => {
    const button = event.target.closest('[data-panel]');
    if (button) selectGamePanelTab(button.dataset.panel);
  });
  panelTabs?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const names = ['resources','log','dev'];
    selectGamePanelTab(names[(names.indexOf(activeMobilePanelTab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3]);
    panelTabs.querySelector(`[data-panel="${activeMobilePanelTab}"]`)?.focus();
  });
  // The same live Resources card and bank/hand dock move into a draggable
  // floating panel when desktop Game Panels are collapsed. Never clone stats:
  // resource updates and spectator selection continue to operate normally.
  let floatingResourcesPanel = null;
  let floatingResourcesDragReady = false;
  function ensureFloatingResourcesPanel() {
    if (floatingResourcesPanel) return floatingResourcesPanel;
    const boardWrap = document.querySelector('section.boardWrap');
    if (!boardWrap) return null;
    const panel = document.createElement('section');
    panel.id = 'floatingResourcesPanel';
    panel.className = 'floatingResourcesPanel hidden';
    panel.setAttribute('aria-label', 'Floating game resources');
    const header = document.createElement('div');
    header.className = 'floatingResourcesHeader';
    header.textContent = 'Resources';
    header.title = 'Drag to move resources';
    panel.appendChild(header);
    const contents = document.createElement('div');
    contents.id = 'floatingResourcesContent';
    contents.className = 'floatingResourcesContent';
    panel.appendChild(contents);
    boardWrap.appendChild(panel);
    floatingResourcesPanel = panel;
    return panel;
  }
  function syncFloatingResourcesPanel(inGame = !!(state && state.phase !== 'lobby')) {
    const panel = floatingResourcesPanel || (inGame && !isMobileGameSplit() && !gamePanelsExpanded
      ? ensureFloatingResourcesPanel() : null);
    if (!panel) return;
    const show = !!(inGame && !isMobileGameSplit() && !gamePanelsExpanded);
    const content = panel.querySelector('.floatingResourcesContent');
    if (show && content) {
      panel.classList.remove('hidden');
      if (ui.resourcesCard && ui.resourcesCard.parentNode !== content) content.appendChild(ui.resourcesCard);
      if (ui.rightSidebarResourcesDock && ui.rightSidebarResourcesDock.parentNode !== content) content.appendChild(ui.rightSidebarResourcesDock);
      if (!floatingResourcesDragReady) {
        const header = panel.querySelector('.floatingResourcesHeader');
        // The drag handler is installed once. It also saves the position for
        // the current user, just like the countdown clock.
        makeDraggablePanel(panel, header, 'hexsettlers_floating_resources_pos_v1');
        floatingResourcesDragReady = true;
      }
      requestAnimationFrame(boundFloatingResourcesToBoard);
    } else {
      panel.classList.add('hidden');
      if (ui.rightSidebarInner) {
        if (ui.resourcesCard && ui.resourcesCard.parentNode === content) {
          ui.rightSidebarInner.insertBefore(ui.resourcesCard, ui.rightSidebarInner.firstChild);
        }
        if (ui.rightSidebarResourcesDock && ui.rightSidebarResourcesDock.parentNode === content) {
          if (inGame && isMobileGameSplit() && mobilePinnedResources) mobilePinnedResources.appendChild(ui.rightSidebarResourcesDock);
          else ui.rightSidebarInner.appendChild(ui.rightSidebarResourcesDock);
        }
      }
    }
  }
  function boundFloatingResourcesToBoard() {
    const panel = floatingResourcesPanel;
    if (!panel || panel.classList.contains('hidden')) return;
    const r = panel.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const b = draggablePanelBounds(panel, r.width, r.height);
    const x = Math.min(b.maxLeft, Math.max(b.minLeft, r.left));
    const y = Math.min(b.maxTop, Math.max(b.minTop, r.top));
    if (Math.abs(x-r.left) < 1 && Math.abs(y-r.top) < 1) return;
    panel.style.position = 'fixed';
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }
  function setGamePanelsExpanded(next) {
    gamePanelsExpanded = !!next;
    document.body.classList.toggle('gamePanelsCollapsed', !gamePanelsExpanded);
    if (ui.logBtn) {
      ui.logBtn.textContent = gamePanelsExpanded ? 'Hide Game Panels' : 'Show Game Panels';
      ui.logBtn.setAttribute('aria-expanded', String(gamePanelsExpanded));
    }
    if (mobilePanelsToggle) {
      mobilePanelsToggle.textContent = gamePanelsExpanded ? 'Hide Game Panels' : 'Show Game Panels';
      mobilePanelsToggle.setAttribute('aria-expanded', String(gamePanelsExpanded));
    }
    syncFloatingResourcesPanel();
    if (state && state.phase !== 'lobby') {
      requestAnimationFrame(() => { resizeCanvas(); render(); syncTurnBarHeight(); });
    }
  }
  selectGamePanelTab('resources');

  // v31: adjustable desktop Game Log / Development Cards height split.
  // Keep the dev header and cost note anchored while the card list clips/scrolls
  // inside the available remainder. Store a fraction, not pixels, for resizes.
  const LOG_DEV_SPLIT_KEY = 'hexsettlers_log_dev_split_v31';
  const LOG_DEV_DEFAULT_SHARE = 0.52;
  let logDevSplitShare = LOG_DEV_DEFAULT_SHARE;
  try {
    const saved = Number(localStorage.getItem(LOG_DEV_SPLIT_KEY));
    if (Number.isFinite(saved) && saved >= 0.05 && saved <= 0.95) logDevSplitShare = saved;
  } catch (_) {}
  let logDevSplitter = null;
  let logDevResizeObserver = null;
  let logDevSplitFrame = 0;

  function isDesktopLogDevSplitActive() {
    return !!(rightSidebarDock.isDocked && !isMobileGameSplit() &&
      !document.body.classList.contains('gamePanelsCollapsed') &&
      ui.rightSidebarInner && ui.logCard && ui.devCard && logDevSplitter);
  }

  function logDevAvailableHeight() {
    const inner = ui.rightSidebarInner;
    if (!inner) return 0;
    const style = window.getComputedStyle(inner);
    const size = (value) => Number.parseFloat(value) || 0;
    const children = [...inner.children].filter(child => window.getComputedStyle(child).display !== 'none');
    const gaps = Math.max(0, children.length - 1) * size(style.rowGap || style.gap);
    const fixed = children.reduce((sum, child) => {
      return sum + ((child === ui.logCard || child === ui.devCard) ? 0 : child.getBoundingClientRect().height);
    }, 0);
    return Math.max(0, inner.clientHeight - size(style.paddingTop) - size(style.paddingBottom) - gaps - fixed);
  }

  function applyLogDevSplit() {
    logDevSplitFrame = 0;
    if (!ui.logCard || !ui.devCard) return;
    if (!isDesktopLogDevSplitActive()) {
      ui.logCard.style.removeProperty('flex');
      ui.devCard.style.removeProperty('flex');
      return;
    }
    const available = logDevAvailableHeight();
    if (available < 30) return;
    // The maximum divider position still leaves the dev header, cost note,
    // and the tops of the cards available below the log.
    const minLog = Math.min(110, available * 0.4);
    const devHeading = ui.devCard.querySelector('.devHeaderRow');
    const devCost = ui.devCard.querySelector('.panelScaleContent > .smallNote');
    const devTopHeight = (devHeading?.getBoundingClientRect().height || 0) +
      (devCost?.getBoundingClientRect().height || 0);
    // At larger text scales, keep the cost visible and reveal the top of the
    // first card instead of allowing the draggable log to cover the entire hand.
    const minDev = Math.min(Math.max(118, devTopHeight + 34), available * 0.55);
    const logHeight = Math.max(minLog, Math.min(available - minDev, available * logDevSplitShare));
    ui.logCard.style.flex = `0 0 ${Math.round(logHeight)}px`;
    ui.devCard.style.flex = '1 1 0px';
    const actualShare = logHeight / available;
    logDevSplitter.setAttribute('aria-valuenow', String(Math.round(actualShare * 100)));
    logDevSplitter.setAttribute('aria-valuetext', `Game Log ${Math.round(actualShare * 100)}%, Development Cards ${Math.round((1 - actualShare) * 100)}%`);
  }

  function scheduleLogDevSplit() {
    if (logDevSplitFrame) return;
    logDevSplitFrame = requestAnimationFrame(applyLogDevSplit);
  }

  function setLogDevSplitShare(next, { persist = false } = {}) {
    if (!Number.isFinite(next)) return;
    logDevSplitShare = Math.max(0.05, Math.min(0.95, next));
    if (persist) {
      try { localStorage.setItem(LOG_DEV_SPLIT_KEY, String(logDevSplitShare)); } catch (_) {}
    }
    scheduleLogDevSplit();
  }

  function ensureLogDevSplitter() {
    if (!ui.rightSidebarInner || !ui.devCard || !ui.logCard) return;
    if (!logDevSplitter) {
      const separator = document.createElement('div');
      separator.id = 'sidebarLogDevSplitter';
      separator.className = 'sidebarLogDevSplitter';
      separator.tabIndex = 0;
      separator.setAttribute('role', 'separator');
      separator.setAttribute('aria-label', 'Resize Game Log and Development Cards');
      separator.setAttribute('aria-orientation', 'horizontal');
      separator.setAttribute('aria-controls', 'logCard devCard');
      separator.setAttribute('aria-valuemin', '5');
      separator.setAttribute('aria-valuemax', '95');
      separator.title = 'Drag to resize Game Log and Development Cards. Use arrow keys for fine adjustments.';
      let activePointer = null;
      let initialY = 0;
      let initialShare = 0;
      let availableOnStart = 0;
      separator.addEventListener('pointerdown', (event) => {
        if (!isDesktopLogDevSplitActive() || (event.button !== undefined && event.button !== 0)) return;
        activePointer = event.pointerId;
        initialY = event.clientY;
        initialShare = logDevSplitShare;
        availableOnStart = logDevAvailableHeight();
        separator.classList.add('dragging');
        separator.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      separator.addEventListener('pointermove', event => {
        if (activePointer !== event.pointerId || !availableOnStart) return;
        setLogDevSplitShare(initialShare + (event.clientY - initialY) / availableOnStart);
      });
      const finish = event => {
        if (activePointer === null || (event.pointerId !== undefined && activePointer !== event.pointerId)) return;
        const pointerId = activePointer;
        activePointer = null;
        separator.classList.remove('dragging');
        try { if (separator.hasPointerCapture?.(pointerId)) separator.releasePointerCapture(pointerId); } catch (_) {}
        setLogDevSplitShare(logDevSplitShare, { persist: true });
      };
      separator.addEventListener('pointerup', finish);
      separator.addEventListener('pointercancel', finish);
      separator.addEventListener('keydown', event => {
        if (!isDesktopLogDevSplitActive()) return;
        let next;
        if (event.key === 'ArrowDown') next = logDevSplitShare + (event.shiftKey ? 0.1 : 0.02);
        else if (event.key === 'ArrowUp') next = logDevSplitShare - (event.shiftKey ? 0.1 : 0.02);
        else if (event.key === 'Home') next = 0.05;
        else if (event.key === 'End') next = 0.95;
        else return;
        event.preventDefault();
        setLogDevSplitShare(next, { persist: true });
      });
      logDevSplitter = separator;
    }
    if (logDevSplitter.parentNode !== ui.rightSidebarInner || logDevSplitter.nextSibling !== ui.devCard) {
      ui.rightSidebarInner.insertBefore(logDevSplitter, ui.devCard);
    }
    if (!logDevResizeObserver && typeof ResizeObserver === 'function') {
      logDevResizeObserver = new ResizeObserver(scheduleLogDevSplit);
      logDevResizeObserver.observe(ui.rightSidebarInner);
      if (ui.resourcesCard) logDevResizeObserver.observe(ui.resourcesCard);
      if (ui.rightSidebarResourcesDock) logDevResizeObserver.observe(ui.rightSidebarResourcesDock);
    }
    scheduleLogDevSplit();
  }
  window.addEventListener('resize', scheduleLogDevSplit);

  function syncRightSidebarDock(inGame) {
    const boardWrap = document.querySelector('section.boardWrap');
    if (!boardWrap || !ui.rightSidebar || !ui.rightSidebarInner) return;

    if (inGame && !rightSidebarDock.isDocked) {
      rightSidebarDock.isDocked = true;
      rightSidebarDock.originals = {
        log: ui.logCard ? rememberOriginal(ui.logCard) : null,
        dev: ui.devCard ? rememberOriginal(ui.devCard) : null,
        resources: ui.resourcesCard ? rememberOriginal(ui.resourcesCard) : null,
      };
    }

    if (inGame) {
      setRightSidebarWidth(getSavedRightSidebarWidth());
      ensureRightSidebarResizeHandle();
      ui.rightSidebar.classList.remove('hidden');
      if (ui.rightSidebar.parentNode !== boardWrap) boardWrap.appendChild(ui.rightSidebar);
      if (isMobileGameSplit()) { ensureMobileGameSplitter(); setMobileSplitRatio(mobileSplitRatio); }

      // Ensure the bottom resources dock uses the same scale as the Dev panel.
      try {
        if (ui.rightSidebarResourcesDock && ui.rightSidebarResourcesDock.style) {
          ui.rightSidebarResourcesDock.style.setProperty('--tool-ui-scale', String(getToolUiScale('dev_panel')));
        }
      } catch (_) {}

      const anchor = ui.rightSidebarResourcesDock || null;
      if (anchor) {
        // On touch layouts the resources are an independent, permanently
        // visible strip between the action controls and the resize handle.
        // Game Panels only collapses the tabbed details below this strip.
        if (isMobileGameSplit() && mobilePinnedResources) {
          if (anchor.parentNode !== mobilePinnedResources) mobilePinnedResources.appendChild(anchor);
        } else if (anchor.parentNode !== ui.rightSidebarInner &&
                   !(floatingResourcesPanel && anchor.parentNode === floatingResourcesPanel.querySelector('.floatingResourcesContent'))) {
          ui.rightSidebarInner.appendChild(anchor);
        }
      }
      selectGamePanelTab(activeMobilePanelTab);
      if (ui.resourcesCard) {
        ui.resourcesCard.dataset.dragDisabled = '1';
        if (!floatingResourcesPanel || ui.resourcesCard.parentNode !== floatingResourcesPanel.querySelector('.floatingResourcesContent')) {
          clearDockedPanelPosition(ui.resourcesCard);
          if (ui.resourcesCard.parentNode !== ui.rightSidebarInner) {
            ui.rightSidebarInner.insertBefore(ui.resourcesCard, ui.rightSidebarInner.firstChild);
          }
        }
      }
      if (ui.logCard) {
        ui.logCard.dataset.dragDisabled = '1';
        ui.logCard.classList.add('rightSidebarDocked');
        clearDockedPanelPosition(ui.logCard);
        if (ui.logCard.parentNode !== ui.rightSidebarInner) {
          if (anchor && anchor.parentNode === ui.rightSidebarInner) ui.rightSidebarInner.insertBefore(ui.logCard, anchor);
          else ui.rightSidebarInner.appendChild(ui.logCard);
        }
      }
      if (ui.devCard) {
        ui.devCard.dataset.dragDisabled = '1';
        ui.devCard.classList.add('rightSidebarDocked');
        ui.devCard.classList.remove('hudDevOverlay');
        clearDockedPanelPosition(ui.devCard);
        if (ui.devCard.parentNode !== ui.rightSidebarInner) {
          if (anchor && anchor.parentNode === ui.rightSidebarInner) ui.rightSidebarInner.insertBefore(ui.devCard, anchor);
          else ui.rightSidebarInner.appendChild(ui.devCard);
        }
      }
      ensureLogDevSplitter();
      scheduleLogDevSplit();
      syncFloatingResourcesPanel(true);
      return;
    }

    if (logDevSplitter) logDevSplitter.remove();
    scheduleLogDevSplit();
    syncFloatingResourcesPanel(false);
    ui.rightSidebar.classList.add('hidden');
    if (ui.rightSidebarResourcesDock && ui.rightSidebarResourcesDock.parentNode !== ui.rightSidebarInner) ui.rightSidebarInner.appendChild(ui.rightSidebarResourcesDock);
    if (!rightSidebarDock.isDocked) return;
    rightSidebarDock.isDocked = false;

    if (ui.resourcesCard && ui.resourcesCard.parentNode === ui.rightSidebarInner) {
      delete ui.resourcesCard.dataset.dragDisabled;
      clearDockedPanelPosition(ui.resourcesCard);
      restoreOriginal(ui.resourcesCard, rightSidebarDock.originals.resources);
    }

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
    for (const b of [ui.logBtn, ui.rulesBtn, ui.diceBtn, ui.texturePackBtn, ui.chatBtn, ui.audioBtn, ui.colorblindBtn, ui.leaveGameBtn, ui.endGameVoteBtn, ui.idsBtn]) {
      if (!b) continue;
      b.classList.add('btnTiny');
      btns.appendChild(b);
    }
    row.appendChild(btns);
    if (ui.accountOrb) {
      ui.accountOrb.classList.add('inGameOrb');
      row.appendChild(ui.accountOrb);
    }
    // Placement is handled directly on board nodes/edges. The legacy mobile
    // Build dropdown duplicated those controls and served no useful purpose.
    card.appendChild(row);
    ensureInGamePanelScaleControls();
  }

  function buildTurnHudOnce() {
    if (!ui.turnCard || hudDock.builtTurnHud) return;
    hudDock.builtTurnHud = true;

    const card = ui.turnCard;
    card.innerHTML = '';

    // Turn badges attach to the roll dock, not the action bar or its buttons.
    if (ui.extraTurnBanner) card.appendChild(ui.extraTurnBanner);
    if (ui.placementTurnBanner) card.appendChild(ui.placementTurnBanner);

    const row = document.createElement('div');
    row.className = 'hudBarRow';

    const grip = document.createElement('div');
    grip.className = 'dragGrip';
    grip.textContent = '⋮⋮';
    row.appendChild(grip);

    const actions = document.createElement('div');
    actions.className = 'hudBtns';
    const order = [
      ui.buildRoadBtn,
      ui.buildShipBtn,
      ui.moveShipBtn,
      ui.buildSettlementBtn,
      ui.buildCityBtn,
      ui.buyDevBtn,
      ui.bankTradeBtn,
      ui.playerTradeBtn,
      ui.backTurnBtn,
      ui.pauseBtn,
      ui.playBtn,
    ];
    for (const b of order) {
      if (!b) continue;
      b.classList.add('btnTiny');
      actions.appendChild(b);
    }
    row.appendChild(actions);
    // The action text belongs in the clock now, where it stays visible even
    // when the bottom action row needs to scroll or wrap on smaller displays.
    if (ui.countdownClock) {
      let message = $('clockActionInfo');
      if (!message) {
        message = document.createElement('div');
        message.id = 'clockActionInfo'; message.className = 'clockActionInfo';
        ui.countdownClock.appendChild(message);
      }
      if (ui.turnInfo) message.appendChild(ui.turnInfo);
      if (ui.timerInfo) message.appendChild(ui.timerInfo);
    }
    card.appendChild(row);
    ensureInGamePanelScaleControls();
  }

  const mobileActionsToggle = $('mobileActionsToggle');
  const mobilePanelsToggle = $('mobilePanelsToggle');
  function setMobileActionsOpen(open) {
    document.body.classList.toggle('mobileActionsOpen', !!open);
    mobileActionsToggle?.setAttribute('aria-expanded', String(!!open));
  }
  function setMobilePanelsOpen(open) {
    document.body.classList.toggle('mobilePanelsOpen', !!open);
    mobilePanelsToggle?.setAttribute('aria-expanded', String(!!open));
    if (open) setMobileActionsOpen(false);
  }
  mobileActionsToggle?.addEventListener('click', () => {
    const open = !document.body.classList.contains('mobileActionsOpen');
    if (!isMobileGameSplit()) setMobilePanelsOpen(false);
    setMobileActionsOpen(open);
  });
  mobilePanelsToggle?.addEventListener('click', () => setGamePanelsExpanded(!gamePanelsExpanded));
  if (mobilePanelsToggle) mobilePanelsToggle.textContent = 'Hide Game Panels';
  $('mobilePanelsClose')?.addEventListener('click', () => setMobilePanelsOpen(false));
  $('mobileFitBoard')?.addEventListener('click', () => { view.autoFit = true; resizeCanvas(); render(); });
  function setMobileLobbyMapOpen(open) {
    const next = !!open && !document.body.classList.contains('in-game') && !document.body.classList.contains('ranked-lobby');
    document.body.classList.toggle('mobileLobbyMapOpen', next);
    $('mobileLobbyMapToggle')?.setAttribute('aria-expanded', String(next));
    if (next) requestAnimationFrame(() => { view.autoFit = true; resizeCanvas(); render(); });
  }
  $('mobileLobbyMapToggle')?.addEventListener('click', () => setMobileLobbyMapOpen(!document.body.classList.contains('mobileLobbyMapOpen')));
  $('mobileLobbyMapClose')?.addEventListener('click', () => setMobileLobbyMapOpen(false));

  // Desktop lobby preview uses its own preference; mobile retains the map drawer.
  const DESKTOP_LOBBY_MAP_KEY = 'hexsettlers_desktop_lobby_map_visible_v51';
  let desktopLobbyMapVisible = true;
  try { desktopLobbyMapVisible = localStorage.getItem(DESKTOP_LOBBY_MAP_KEY) !== 'false'; } catch (_) {}
  function syncDesktopLobbyMap() {
    document.body.classList.toggle('desktopLobbyMapHidden', !desktopLobbyMapVisible);
    const button = $('desktopLobbyMapToggle');
    if (button) {
      button.textContent = desktopLobbyMapVisible ? 'Hide Map' : 'Show Map';
      button.setAttribute('aria-pressed', String(desktopLobbyMapVisible));
      button.setAttribute('aria-label', desktopLobbyMapVisible ? 'Hide Map' : 'Show Map');
      button.title = desktopLobbyMapVisible ? 'Hide Map' : 'Show Map';
    }
  }
  syncDesktopLobbyMap();
  $('desktopLobbyMapToggle')?.addEventListener('click', () => {
    desktopLobbyMapVisible = !desktopLobbyMapVisible;
    try { localStorage.setItem(DESKTOP_LOBBY_MAP_KEY, String(desktopLobbyMapVisible)); } catch (_) {}
    syncDesktopLobbyMap();
    // Visibility changes resize the canvas; repaint after the layout settles.
    requestAnimationFrame(() => { view.autoFit = true; resizeCanvas(); render(); });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('mobileLobbyMapOpen')) setMobileLobbyMapOpen(false);
  });

  function dockHudToBoard(inGame) {
    const panel = document.querySelector('section.panel');
    const boardWrap = document.querySelector('section.boardWrap');
    if (!panel || !boardWrap) return;

    if (inGame && !hudDock.isDocked) {
      hudDock.isDocked = true;
      hudDock.originals = {
        tools: ui.toolsCard ? rememberOriginal(ui.toolsCard) : null,
        orb: ui.accountOrb ? rememberOriginal(ui.accountOrb) : null,
        turn: ui.turnCard ? rememberOriginal(ui.turnCard) : null,
        dev: ui.devCard ? rememberOriginal(ui.devCard) : null,
        dock: ui.rollDock ? rememberOriginal(ui.rollDock) : null,
        error: ui.errBox ? rememberOriginal(ui.errBox) : null,
      };

      buildToolsHudOnce();
      buildTurnHudOnce();
      if (ui.errBox) boardWrap.appendChild(ui.errBox);

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
        syncTurnHudIndicatorPlacement();
      }
      ensureInGamePanelScaleControls();
      if (ui.rollDock) {
        ui.rollDock.classList.add('hudRollDock');
        boardWrap.appendChild(ui.rollDock);
        const dockRow = ui.rollDock.querySelector('.rollDockInner');
        if (dockRow && ui.rollDockBtn) {
          let badges = dockRow.querySelector('.rollDockTurnBadges');
          if (!badges) {
            badges = document.createElement('div');
            badges.className = 'rollDockTurnBadges';
            ui.rollDockBtn.insertAdjacentElement('afterend', badges);
          }
          if (ui.placementTurnBanner) badges.appendChild(ui.placementTurnBanner);
          if (ui.extraTurnBanner) badges.appendChild(ui.extraTurnBanner);
        }
      }
      requestAnimationFrame(syncTurnBarHeight);
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
      if (ui.accountOrb) { ui.accountOrb.classList.remove('inGameOrb'); restoreOriginal(ui.accountOrb, hudDock.originals?.orb); }
      if (ui.extraTurnBanner) ui.turnCard?.appendChild(ui.extraTurnBanner);
      if (ui.placementTurnBanner) ui.turnCard?.appendChild(ui.placementTurnBanner);
      restoreOriginal(ui.turnCard, hudDock.originals?.turn);
      restoreOriginal(ui.devCard, hudDock.originals?.dev);
      restoreOriginal(ui.rollDock, hudDock.originals?.dock);
      restoreOriginal(ui.errBox, hudDock.originals?.error);
    }
  }

  const draggablePanelLayoutRegistry = new Set();

  function syncTurnHudIndicatorPlacement() {
    const card = ui.turnCard;
    if (!card || !card.classList) return;
    if (!card.classList.contains('hudBar') || card.classList.contains('hidden')) {
      card.classList.remove('turnIndicatorBelow');
      return;
    }
    try {
      const rect = card.getBoundingClientRect();
      const bannerHeight = Math.max(42, Number(ui.extraTurnBanner?.offsetHeight || 0));
      card.classList.toggle('turnIndicatorBelow', rect.top < bannerHeight + 16);
    } catch (_) {}
  }

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

  // Compute the current playable rectangle, not the full browser viewport.
  // The clock must stay below the tools bar and above Roll Dice / End Turn.
  function draggablePanelBounds(panelEl, width, height) {
    const pad = 6;
    if (panelEl?.classList?.contains('floatingResourcesPanel') && document.body.classList.contains('in-game')) {
      const area = document.querySelector('section.boardWrap')?.getBoundingClientRect();
      if (area) {
        const toolsBottom = ui.toolsCard?.getBoundingClientRect().bottom || area.top;
        const bottomTop = ui.rollDock?.getBoundingClientRect().top || area.bottom;
        const turnTop = ui.turnCard?.getBoundingClientRect().top || area.bottom;
        const minLeft = Math.max(pad, area.left + pad);
        const minTop = Math.max(pad, area.top + pad, toolsBottom + pad);
        return {
          minLeft,
          maxLeft: Math.max(minLeft, Math.min(window.innerWidth-pad, area.right-pad) - width),
          minTop,
          maxTop: Math.max(minTop, Math.min(area.bottom-pad, bottomTop-pad, turnTop-pad) - height),
        };
      }
    }
    if (panelEl?.classList?.contains('rightHud') && document.body.classList.contains('in-game')) {
      const boardWrap = document.querySelector('section.boardWrap');
      const board = document.getElementById('board');
      const tools = ui.toolsCard;
      const dock = ui.rollDock;
      if (boardWrap) {
        const area = boardWrap.getBoundingClientRect();
        const boardRect = board?.getBoundingClientRect();
        const topBar = tools?.getBoundingClientRect();
        const dockRect = dock && !dock.classList.contains('hidden') ? dock.getBoundingClientRect() : null;
        const turnBar = ui.turnCard?.getBoundingClientRect();
        const sidebar = ui.rightSidebar?.getBoundingClientRect();
        const leftEdge = Math.max(pad, area.left + pad);
        const topEdge = Math.max(pad, area.top + pad, topBar ? topBar.bottom + pad : 0);
        let rightEdge = Math.min(window.innerWidth - pad, area.right - pad);
        const mobile = isMobileGameSplit();
        if (!mobile && sidebar && !document.body.classList.contains('gamePanelsCollapsed')) {
          rightEdge = Math.min(rightEdge, sidebar.left - pad);
        }
        // On mobile the dock is a real row after the canvas. On desktop the
        // dock floats above the action bar. Both define the bottom boundary.
        const bottomCandidates = [window.innerHeight - pad, area.bottom - pad];
        if (boardRect) bottomCandidates.push(boardRect.bottom - pad);
        if (dockRect) bottomCandidates.push(dockRect.top - pad);
        else if (turnBar && !mobile) bottomCandidates.push(turnBar.top - pad);
        const bottomEdge = Math.min(...bottomCandidates);
        return {
          minLeft: leftEdge,
          maxLeft: Math.max(leftEdge, rightEdge - width),
          minTop: topEdge,
          maxTop: Math.max(topEdge, bottomEdge - height),
        };
      }
    }
    return {
      minLeft: pad, maxLeft: Math.max(pad, window.innerWidth - width - pad),
      minTop: pad, maxTop: Math.max(pad, window.innerHeight - height - pad),
    };
  }

  function boundDraggedClockToBoard() {
    const el = document.querySelector('.rightHud');
    if (!el || !document.body.classList.contains('in-game')) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const limits = draggablePanelBounds(el, rect.width, rect.height);
    const left = Math.max(limits.minLeft, Math.min(rect.left, limits.maxLeft));
    const top = Math.max(limits.minTop, Math.min(rect.top, limits.maxTop));
    // Don't convert the default anchored clock into a fixed/dragged clock
    // unless its initial position is outside the playable area.
    if (Math.abs(rect.left - left) < 1 && Math.abs(rect.top - top) < 1 && el.dataset.popupDragged !== '1') return;
    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('left', `${left}px`, 'important');
    el.style.setProperty('top', `${top}px`, 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
  }

  // Measure the action bar instead of guessing its height. When the player
  // scales the bar, standalone turn buttons remain immediately above it.
  let lastTurnBarHeight = -1;
  let lastTopBarHeight = -1;
  function syncTurnBarHeight() {
    if (!document.body.classList.contains('in-game')) return;
    const boardWrap = document.querySelector('section.boardWrap');
    // The profile orb is positioned inside the HUD rather than at a fixed
    // viewport coordinate. Keep its diameter below the measured HUD height;
    // desktop toolbar scaling and short mobile layouts can change that height.
    const topHeight = Math.ceil(ui.toolsCard?.getBoundingClientRect().height || 0);
    if (topHeight > 0 && topHeight !== lastTopBarHeight) {
      lastTopBarHeight = topHeight;
      boardWrap?.style.setProperty('--hud-top-bar-height', `${topHeight}px`);
    }
    const height = Math.ceil(ui.turnCard ? ui.turnCard.getBoundingClientRect().height : 0);
    if (height > 0 && height !== lastTurnBarHeight) {
      lastTurnBarHeight = height;
      boardWrap?.style.setProperty('--hud-bottom-bar-height', `${height}px`);
    }
    boundDraggedClockToBoard();
    boundFloatingResourcesToBoard();
  }
  if (typeof ResizeObserver !== 'undefined') {
    const hudResize = new ResizeObserver(() => {
      if (!document.body.classList.contains('in-game')) return;
      requestAnimationFrame(syncTurnBarHeight);
    });
    if (ui.turnCard) hudResize.observe(ui.turnCard);
    if (ui.toolsCard) hudResize.observe(ui.toolsCard);
    if (ui.rollDock) hudResize.observe(ui.rollDock);
    const boardCanvas = document.getElementById('board');
    if (boardCanvas) hudResize.observe(boardCanvas);
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
        const limits = draggablePanelBounds(panelEl, w, h);
        if (w > 0) left = Math.max(limits.minLeft, Math.min(left, limits.maxLeft));
        if (h > 0) top = Math.max(limits.minTop, Math.min(top, limits.maxTop));
      } catch (_) {}
      panelEl.style.position = 'fixed';
      panelEl.style.left = left + 'px';
      panelEl.style.top = top + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      if (panelEl.classList && panelEl.classList.contains('rightHud')) {
        panelEl.style.setProperty('position', 'fixed', 'important');
        panelEl.style.setProperty('left', left + 'px', 'important');
        panelEl.style.setProperty('position', 'fixed', 'important');
        panelEl.style.setProperty('left', left + 'px', 'important');
        panelEl.style.setProperty('top', top + 'px', 'important');
        panelEl.style.setProperty('right', 'auto', 'important');
      }
      if (panelEl === ui.turnCard) syncTurnHudIndicatorPlacement();
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
      if (panelEl.classList && panelEl.classList.contains('rightHud')) {
        panelEl.style.setProperty('position', 'fixed', 'important');
        panelEl.style.setProperty('left', r.left + 'px', 'important');
        panelEl.style.setProperty('left', r.left + 'px', 'important');
        panelEl.style.setProperty('top', r.top + 'px', 'important');
        panelEl.style.setProperty('right', 'auto', 'important');
      }
      if (panelEl === ui.turnCard) syncTurnHudIndicatorPlacement();
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
      const limits = draggablePanelBounds(panelEl, r.width, r.height);
      const left = clamp(startLeft + dx, limits.minLeft, limits.maxLeft);
      const top = clamp(startTop + dy, limits.minTop, limits.maxTop);
      panelEl.style.left = left + 'px';
      panelEl.style.top = top + 'px';
      if (panelEl.classList && panelEl.classList.contains('rightHud')) {
        panelEl.style.setProperty('left', left + 'px', 'important');
        panelEl.style.setProperty('top', top + 'px', 'important');
        panelEl.style.setProperty('right', 'auto', 'important');
      }
      if (panelEl === ui.turnCard) syncTurnHudIndicatorPlacement();
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
      if (panelEl === ui.turnCard) syncTurnHudIndicatorPlacement();
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
  window.addEventListener('resize', () => {
    try {
      setRightSidebarWidth(getSavedRightSidebarWidth());
      syncRightSidebarDock(!!state && state.phase !== 'lobby');
      if (document.body.classList.contains('in-game')) setMobileSplitRatio(mobileSplitRatio);
    } catch (_) {}
    resizeCanvas();
    render();
  });
  try {
    if (window.visualViewport) {
      const onVvResize = () => { if (document.body.classList.contains('in-game')) setMobileSplitRatio(mobileSplitRatio); resizeCanvas(); render(); requestAnimationFrame(syncTurnBarHeight); };
      window.visualViewport.addEventListener('resize', onVvResize);
      window.visualViewport.addEventListener('scroll', onVvResize);
    }
  } catch (_) {}
  resizeCanvas();
  // A sidebar/lobby splitter can change the canvas box without resizing the
  // browser window. Render() synchronizes its backing store and paints once.
  if (typeof ResizeObserver === 'function') {
    const boardSizeObserver = new ResizeObserver(() => {
      if (ui.canvas.getBoundingClientRect().width > 0) render();
      if (historyReplay.active) requestAnimationFrame(positionHistoryReplayBar);
    });
    const boardContainer = ui.canvas.closest('.boardWrap');
    if (boardContainer) boardSizeObserver.observe(boardContainer);
    const topHud = document.querySelector('.hudTopLeft');
    if (topHud) boardSizeObserver.observe(topHud);
  }

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

  // Drag the timer by touching anywhere on its non-interactive surface.
  // The clock is the complete drag handle; the existing bounds keep it
  // between the tools bar and the Roll Dice / End Turn controls.
  try {
    const rh = document.querySelector('.rightHud');
    ensureTimerBoxControls();
    const clockHandle = ui.countdownClock;
    if (rh && clockHandle && !rh.dataset.dragReady) {
      makeDraggablePanel(rh, clockHandle, 'hexsettlers_rightHud_pos_v2');
      rh.dataset.dragReady = '1';
    }
  } catch (_) {}

  // Pan/zoom
  const view = { scale: 150, ox: 0, oy: 0, autoFit: true, dragging: false, lastX: 0, lastY: 0 };
  let boardRenderFrame = null;
  let boardRenderRect = null;
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
    view.autoFit = false;
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
    if (dx || dy) view.autoFit = false;
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
          view.autoFit = false;
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
      view.autoFit = false;
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
  let websocketReconnectDelayMs = 1200;
  let websocketReconnectTimer = null;
  let websocketReconnectAllowed = true;
  let websocketHeartbeatTimer = null;
  let websocketLastMessageAt = 0;
  let websocketLastPongAt = 0;
  let websocketHeartbeatRttMs = null;
  let websocketConnectionId = null;
  let pendingManualRejoinCode = '';
  let roomConnectionReady = false;
  let roomRecoveryInFlight = false;
  let roomRecoveryStartedAt = 0;
  let roomRecoveryTimer = null;
  let pendingReconnectRoomMessages = [];
  const RECONNECT_SAFE_ROOM_MESSAGE_TYPES = new Set([
    'chat', 'clear_ai', 'download_custom_map', 'upload_custom_map', 'edit_preview_port', 'edit_preview_tile', 'fill_ai', 'generate_map',
    'get_state', 'get_texture_pack', 'kick_player', 'leave_room', 'pause_game', 'request_leave_game',
    'ranked_scenario_vote', 'respond_leave_game', 'set_ai_difficulty', 'set_expert_ai_tuning', 'set_player_color', 'set_rules',
    'set_ready', 'set_spectator_mode', 'set_spectator_view', 'set_texture_pack', 'start_game', 'texture_pack_publish',
  ]);
  const ROOM_SCOPED_MESSAGE_TYPES = new Set([
    ...RECONNECT_SAFE_ROOM_MESSAGE_TYPES,
    'game_action', 'query_build_options', 'query_ship_move_targets',
  ]);
  const ROOM_RECOVERY_WINDOW_MS = 60_000;
  const CLIENT_HEARTBEAT_MS = 20_000;
  let myPlayerId = null;
  let room = null;
  let state = null;
  let returnToUnrankedAfterLeave = false;
  let returnToModeSelectionAfterLeave = false;
  let pendingPlayModeSwitch = null;
  let rankedQueueActive = false;

  const STRUCTURE_PLACEMENT_EMPHASIS_MS = 2_000;
  const STRUCTURE_PLACEMENT_SCALE = 1.5;
  const structurePlacementEmphasis = new Map();
  let structurePlacementEmphasisTimer = null;

  function structurePlacementKey(kind, targetId) {
    return `${String(kind || '')}:${Number(targetId)}`;
  }

  function clearStructurePlacementEmphasis() {
    structurePlacementEmphasis.clear();
    if (structurePlacementEmphasisTimer !== null) clearTimeout(structurePlacementEmphasisTimer);
    structurePlacementEmphasisTimer = null;
  }

  function pruneStructurePlacementEmphasis(now = Date.now()) {
    for (const [key, entry] of structurePlacementEmphasis.entries()) {
      if (!entry || Number(entry.expiresAt || 0) <= now) structurePlacementEmphasis.delete(key);
    }
  }

  function scheduleStructurePlacementEmphasisExpiry() {
    if (structurePlacementEmphasisTimer !== null) clearTimeout(structurePlacementEmphasisTimer);
    structurePlacementEmphasisTimer = null;
    pruneStructurePlacementEmphasis();
    if (!structurePlacementEmphasis.size) return;
    let nextExpiry = Infinity;
    for (const entry of structurePlacementEmphasis.values()) {
      nextExpiry = Math.min(nextExpiry, Number(entry && entry.expiresAt || Infinity));
    }
    if (!Number.isFinite(nextExpiry)) return;
    structurePlacementEmphasisTimer = setTimeout(() => {
      structurePlacementEmphasisTimer = null;
      pruneStructurePlacementEmphasis();
      try { render(); } catch (_) {}
      scheduleStructurePlacementEmphasisExpiry();
    }, Math.max(0, nextExpiry - Date.now()) + 16);
  }

  function emphasizePlacedStructure(kind, targetId, ownerId, now = Date.now()) {
    const id = Number(targetId);
    if (!kind || !Number.isFinite(id) || !ownerId) return;
    structurePlacementEmphasis.set(structurePlacementKey(kind, id), {
      kind,
      targetId: id,
      ownerId,
      expiresAt: now + STRUCTURE_PLACEMENT_EMPHASIS_MS,
    });
  }

  function structurePlacementScale(kind, targetId, ownerId) {
    const entry = structurePlacementEmphasis.get(structurePlacementKey(kind, targetId));
    if (!entry || entry.ownerId !== ownerId || Number(entry.expiresAt || 0) <= Date.now()) return 1;
    return STRUCTURE_PLACEMENT_SCALE;
  }

  function objectsByNumericId(items) {
    const out = new Map();
    for (const item of (Array.isArray(items) ? items : [])) {
      const id = Number(item && item.id);
      if (Number.isFinite(id)) out.set(id, item);
    }
    return out;
  }

  function trackNewStructurePlacements(previousState, nextState) {
    if (!previousState || !nextState || !previousState.geom || !nextState.geom || String(nextState.phase || '') === 'lobby') {
      clearStructurePlacementEmphasis();
      return;
    }

    const previousEdges = objectsByNumericId(previousState.geom.edges);
    const nextEdges = objectsByNumericId(nextState.geom.edges);
    const removedShipsByOwner = new Map();
    const addedShips = [];
    const now = Date.now();

    for (const [edgeId, previousEdge] of previousEdges.entries()) {
      const nextEdge = nextEdges.get(edgeId);
      const oldOwner = previousEdge && previousEdge.shipOwner;
      if (oldOwner && (!nextEdge || nextEdge.shipOwner !== oldOwner)) {
        removedShipsByOwner.set(oldOwner, Number(removedShipsByOwner.get(oldOwner) || 0) + 1);
      }
    }

    for (const [edgeId, nextEdge] of nextEdges.entries()) {
      const previousEdge = previousEdges.get(edgeId);
      if (!previousEdge) continue;
      if (!previousEdge.roadOwner && nextEdge.roadOwner) {
        emphasizePlacedStructure('road', edgeId, nextEdge.roadOwner, now);
      }
      if (nextEdge.shipOwner && previousEdge.shipOwner !== nextEdge.shipOwner) {
        addedShips.push({ edgeId, ownerId: nextEdge.shipOwner });
      }
    }

    // A ship move removes one ship and adds one ship for the same owner in the same
    // state transition. Pair those changes so only newly purchased/placed ships pulse.
    for (const added of addedShips) {
      const removedCount = Number(removedShipsByOwner.get(added.ownerId) || 0);
      if (removedCount > 0) {
        removedShipsByOwner.set(added.ownerId, removedCount - 1);
        continue;
      }
      emphasizePlacedStructure('ship', added.edgeId, added.ownerId, now);
    }

    const previousNodes = objectsByNumericId(previousState.geom.nodes);
    const nextNodes = objectsByNumericId(nextState.geom.nodes);
    for (const [nodeId, nextNode] of nextNodes.entries()) {
      const previousNode = previousNodes.get(nodeId);
      if (!previousNode || !nextNode || !nextNode.building) continue;
      const oldBuilding = previousNode.building || null;
      const newBuilding = nextNode.building;
      const isNewBuilding = !oldBuilding || oldBuilding.owner !== newBuilding.owner;
      const isCityUpgrade = !!oldBuilding && oldBuilding.owner === newBuilding.owner && oldBuilding.type !== 'city' && newBuilding.type === 'city';
      if (isNewBuilding || isCityUpgrade) {
        const kind = newBuilding.type === 'city' ? 'city' : 'settlement';
        emphasizePlacedStructure(kind, nodeId, newBuilding.owner, now);
      }
    }

    scheduleStructurePlacementEmphasisExpiry();
  }

  function roomPlayersList() {
    return (room && Array.isArray(room.players)) ? room.players : [];
  }

  function roomSpectatorsList() {
    return (room && Array.isArray(room.spectators)) ? room.spectators : [];
  }

  function currentRoomPhase() {
    const phase = String(((room && room.gamePhase) || (state && state.phase) || 'lobby') || 'lobby');
    return phase || 'lobby';
  }

  function amRoomSpectator() {
    if (!room || !myPlayerId) return false;
    return roomSpectatorsList().some(p => p && p.id === myPlayerId);
  }

  function resetViewportForRoomChange() {
    try {
      view.autoFit = true;
      lastTileCountForView = 0;
      view.scale = 150;
      view.ox = 0;
      view.oy = 0;
    } catch (_) {}
  }

  function stopWebsocketHeartbeat() {
    if (websocketHeartbeatTimer !== null) clearInterval(websocketHeartbeatTimer);
    websocketHeartbeatTimer = null;
  }

  function startWebsocketHeartbeat(socket) {
    stopWebsocketHeartbeat();
    websocketLastMessageAt = Date.now();
    websocketLastPongAt = Date.now();
    websocketHeartbeatRttMs = null;
    websocketHeartbeatTimer = setInterval(() => {
      if (ws !== socket || !socket || socket.readyState !== WebSocket.OPEN) return;
      if (websocketAuthenticated && roomConnectionReady) noteRecentRoom(room);
      try {
        socket.send(JSON.stringify({ type: 'client_ping', clientTime: Date.now() }));
      } catch (_) {
        try { socket.close(); } catch (_) {}
      }
      // A dead proxy can leave a browser WebSocket looking open. Force a clean
      // reconnect if the server has been silent through several heartbeats.
      if (Date.now() - websocketLastPongAt > CLIENT_HEARTBEAT_MS * 3) {
        try { socket.close(4000, 'Heartbeat timeout'); } catch (_) {}
      }
    }, CLIENT_HEARTBEAT_MS);
  }

  function clearRoomRecoveryState() {
    roomRecoveryInFlight = false;
    roomRecoveryStartedAt = 0;
    if (roomRecoveryTimer !== null) clearTimeout(roomRecoveryTimer);
    roomRecoveryTimer = null;
  }

  function beginRoomRecovery(reason) {
    if (!authUser || !room || !room.code) {
      handleLocalRoomExit(reason || 'Room connection was lost.', { preserveLastRoom: true });
      return;
    }
    const started = roomRecoveryStartedAt || Date.now();
    roomRecoveryStartedAt = started;
    if (Date.now() - started > ROOM_RECOVERY_WINDOW_MS) {
      const code = String((room && room.code) || '').trim().toUpperCase();
      clearRoomRecoveryState();
      roomConnectionReady = false;
      pendingManualRejoinCode = code;
      // Keep the lobby and its selected setup visible. A temporary Railway
      // outage must not erase the host's map/rule work or masquerade as leaving.
      setError('The server is still reconnecting. Your lobby setup remains here; click Rejoin Last Room to retry now.');
      updateButtons();
      renderLobby();
      return;
    }
    roomConnectionReady = false;
    roomRecoveryInFlight = true;
    setError('Reconnecting to the room…');
    if (roomRecoveryTimer !== null) clearTimeout(roomRecoveryTimer);
    roomRecoveryTimer = setTimeout(() => {
      roomRecoveryTimer = null;
      if (!roomRecoveryInFlight || !room || !room.code) return;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        websocketReconnectAllowed = true;
        scheduleWebsocketReconnect(0);
        beginRoomRecovery(reason);
        return;
      }
      send({ type: 'rejoin_room', code: room.code, displayName: (ui.nameInput?.value || '').trim() });
      // Retry until the bounded recovery window expires. A Railway restart or
      // instance handoff may need more than one round trip before persistence is visible.
      beginRoomRecovery(reason);
    }, 650);
  }

  function handleLocalRoomExit(reason, options = {}) {
    const preservedRoomCode = options.preserveLastRoom && room && room.code ? String(room.code) : '';
    try {
      if (postgameState && postgameState.historyMode) closePostgameSnapshot();
      else if (postgameState && postgameState.active) exitPostgame();
    } catch (_) {}
    try { forceCloseModal(); } catch (_) {}
    lastEndVotePromptIdSeen = 0;
    lastEndVotePromptRoomCode = '';
    pendingEndVotePromptId = 0;
    pendingAutoRejoin = false;
    roomConnectionReady = false;
    clearRoomRecoveryState();
    pendingReconnectRoomMessages = [];
    if (!options.preserveLastRoom) clearRecentRoom();
    room = null;
    state = null;
    clearStructurePlacementEmphasis();
    resetViewportForRoomChange();
    isHost = false;
    myPlayerId = null;
    try { setLocalPanelLayoutOwnerKey(null); } catch (_) {}
    try {
      if (preservedRoomCode) localStorage.setItem(LAST_ROOM_KEY, preservedRoomCode);
      else localStorage.removeItem(LAST_ROOM_KEY);
    } catch (_) {}
    if (ui.codeInput) ui.codeInput.value = '';
    clearRoomQueryFromUrl();
    if (ui.roomCode) ui.roomCode.textContent = '----';
    if (ui.roomJoinLinkInput) ui.roomJoinLinkInput.value = '';
    if (ui.roomJoinLinkInput) ui.roomJoinLinkInput.disabled = true;
    if (ui.roomCode) ui.roomCode.disabled = true;
    if (ui.playersList) ui.playersList.innerHTML = '';
    if (ui.readyBtn) ui.readyBtn.classList.add('hidden');
    if (ui.startBtn) ui.startBtn.classList.add('hidden');
    if (ui.roomBox) ui.roomBox.classList.add('hidden');
    refreshLobbyJoinLinkUi();
    updateAuthUi();
    updateButtons();
    renderLobby();
    render();
    setError(reason || 'You left the room.');
  }

  // Once a player has left a public or private room, the empty lobby entry
  // page's parent is All Games. Do not replay the first-launch tutorial here.
  function returnToAllGamesAfterExit() {
    if (room) return; // Never navigate away while still occupying a lobby.
    roomNotFoundVisible = false;
    roomNotFoundReturnView = '';
    pendingRecentRoomRejoinCode = '';
    pendingDirectJoinRoomCode = null;
    pendingDirectJoinAsSpectator = false;
    selectedPlayMode = 'journey';
    journeyView = 'home';
    try { sessionStorage.setItem('hexsettlers_play_mode', 'journey'); } catch (_) {}
    clearRoomQueryFromUrl();
    setError(null);
    updateAuthUi();
  }

  // The game-type selection is the single Main Menu destination, including
  // administrator room closures and postgame Main Menu. Never leave players
  // stranded looking at a blank board or auto-rejoining a deleted room.
  function returnToGameTypeSelection(reason = '') {
    pendingRankedMatchmaking = false;
    if (rankedQueueActive && ws?.readyState === WebSocket.OPEN) send({ type: 'ranked_queue_leave' });
    rankedQueueActive = false;
    pendingPlayModeSwitch = null;
    returnToUnrankedAfterLeave = false;
    returnToModeSelectionAfterLeave = false;
    selectedPlayMode = ''; roomNotFoundVisible = false;
    try { sessionStorage.removeItem('hexsettlers_play_mode'); } catch (_) {}
    try { sessionStorage.removeItem(AUTO_CREATE_ROOM_KEY); } catch (_) {}
    try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
    clearRecentRoom();
    clearRoomQueryFromUrl();
    $('rankedReadyBtn')?.classList.remove('hidden');
    $('rankedCancelBtn')?.classList.add('hidden');
    const status = $('rankedStatus');
    if (status) status.textContent = 'Ready to start matchmaking.';
    if (room || state) handleLocalRoomExit('');
    else updateAuthUi();
    setError(null);
    const notice = $('playModeNotice');
    if (notice) {
      notice.textContent = reason;
      notice.classList.toggle('hidden', !reason);
    }
  }

  function returnToRankedReadyScreen() {
    pendingRankedMatchmaking = false;
    selectedPlayMode = 'ranked';
    try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
    $('rankedReadyBtn')?.classList.remove('hidden');
    $('rankedCancelBtn')?.classList.add('hidden');
    const status = $('rankedStatus');
    if (status) status.textContent = 'Ready for another ranked match. Press Start Matchmaking when you want to queue.';
    setError(null);
    updateAuthUi();
  }

  let isHost = false;
  let lastEventIdSeen = 0;
  let serverTimeOffsetMs = 0;
  let timerUiInterval = null;
  let modalLocked = false;
  let modalType = null;
  let activeToolModal = null; // 'log' | 'rules' | 'dice' | 'texture-pack' | 'chat'
  let chatRefs = null;
  let lastDiscardPromptId = 0;
  let lastStealPromptId = 0;
  let lastPirateStealPromptId = 0;
  let lastPirateChoicePromptId = 0;
  let turnUndoResponsePendingVoteId = 0;
  let extraTurnAnnouncementKey = '';
  let extraTurnAnnouncementAcknowledged = false;

  function acknowledgeCenteredExtraTurn() {
    if (!extraTurnAnnouncementKey || extraTurnAnnouncementAcknowledged) return;
    extraTurnAnnouncementAcknowledged = true;
    updateButtons();
  }
  document.addEventListener('pointerdown', acknowledgeCenteredExtraTurn, { capture: true, passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return;
    acknowledgeCenteredExtraTurn();
  }, { capture: true });
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
  let logPanelOpen = true; // Permanently available while playing; tabbed on mobile.

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
    dice_roll_self: makeSfxPool('assets/sfx/dice_roll.wav', 0.9, 2),
    dice_roll_others: makeSfxPool('assets/sfx/dice_roll.wav', 0.9, 4),
    gold_field_production: makeSfxPool('assets/sfx/gold_field_production.wav', 0.9, 2),
    robber_pirate: makeSfxPool('assets/sfx/robber_pirate.wav', 0.9, 3),
    stolen_from: makeSfxPool('assets/sfx/stolen_from.wav', 0.9, 2),
    structure: makeSfxPool('assets/sfx/structure.wav', 0.85, 4),
    end_turn_self: makeSfxPool('assets/sfx/end_turn.wav', 0.9, 2),
    end_turn_others: makeSfxPool('assets/sfx/end_turn.wav', 0.9, 2),
    dev_card: makeSfxPool('assets/sfx/dev_card.wav', 0.9, 2),
    trade_proposed: makeSfxPool('assets/sfx/trade_proposed.wav', 0.9, 1),
    trade_success: makeSfxPool('assets/sfx/trade_success.wav', 0.9, 1),
    paired_turn: makeSfxPool('assets/sfx/paired_turn.wav', 0.85, 1),
    game_winner: makeSfxPool('assets/sfx/game_winner.wav', 0.9, 1),
    game_loser: makeSfxPool('assets/sfx/game_loser.wav', 0.9, 1),
  };

  function applyAudioSfxLevels(levels, opts = {}) {
    const merged = defaultAudioSfxLevels();
    const src = (levels && typeof levels === 'object') ? levels : {};
    for (const def of AUDIO_SFX_DEFS) {
      const hasSavedLevel = Object.prototype.hasOwnProperty.call(src, def.key);
      const isSplitDiceLevel = def.key === 'dice_roll_self' || def.key === 'dice_roll_others';
      const isSplitEndTurnLevel = def.key === 'end_turn_self' || def.key === 'end_turn_others';
      const savedLevel = hasSavedLevel
        ? src[def.key]
        : (isSplitDiceLevel && src.dice_roll != null ? src.dice_roll : (isSplitEndTurnLevel && src.end_turn != null ? src.end_turn : AUDIO_SFX_DEFAULT_PCT));
      merged[def.key] = normalizeAudioSfxPercent(savedLevel);
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

  function playSfx(name, metadata = null) {
    let key = String(name || '').toLowerCase();
    if (key === 'dice_roll') {
      const announcedRollerId = String(metadata?.rollerId || '');
      const inferredRollerId = String(state?.currentPlayerId || '');
      const rollerId = announcedRollerId || inferredRollerId;
      const localPlayerId = String(myPlayerId || '');
      key = rollerId && localPlayerId && rollerId === localPlayerId
        ? 'dice_roll_self'
        : 'dice_roll_others';
    }
    if (key === 'end_turn') {
      const warnedPlayerId = String(metadata?.playerId || metadata?.timedPlayerId || timedPlayerIdForState(state) || '');
      const localPlayerId = String(myPlayerId || '');
      key = warnedPlayerId && localPlayerId && warnedPlayerId === localPlayerId
        ? 'end_turn_self'
        : 'end_turn_others';
    }
    const snd = sfx[key];
    if (!snd) return;
    snd.play();
  }

  function stopEndTurnWarnAudio() {
    try {
      for (const key of ['end_turn_self', 'end_turn_others']) {
        if (sfx && sfx[key] && typeof sfx[key].stopAll === 'function') sfx[key].stopAll();
      }
    } catch (_) {}
  }
  function timedPlayerIdForState(st) {
    if (!st) return '';
    if ((st.phase === 'production-gold' || st.special?.kind === 'discovery_gold') && st.special?.forPlayerId) {
      return String(st.special.forPlayerId);
    }
    return String(st.currentPlayerId || '');
  }
  function endTurnWarnStateKey(st) {
    try {
      if (!st || st.paused) return '';
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
          playSfx('end_turn', { timedPlayerId: timedPlayerIdForState(state) });
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
      const raw = params.has('room') ? params.get('room') : params.has('code') ? params.get('code') : null;
      if (raw === null) return null;
      const code = String(raw).trim().toUpperCase();
      // Invalid invite URLs must reach the same indistinguishable 404 flow as
      // nonexistent and restricted lobbies, not silently open a blank lobby.
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return 'INVALID-CODE';
      if (ui.codeInput && !ui.codeInput.value) ui.codeInput.value = code;
      return code;
    } catch (_) {
      return null;
    }
  }

  function parseDirectJoinSpectatorFromUrl() {
    try {
      const value = String(new URLSearchParams(window.location.search || '').get('spectator') || '').trim().toLowerCase();
      return value === '1' || value === 'true' || value === 'yes';
    } catch (_) {
      return false;
    }
  }

function buildDirectJoinUrl(roomCode, options = {}) {
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) return '';
  const spectator = !!(options && options.spectator);
  try {
    // Use the address that actually serves this game, including LAN hosts and
    // custom ports. Link rendering must never depend on a network lookup.
    const u = (typeof IS_ADMIN_PORTAL !== 'undefined' && IS_ADMIN_PORTAL) ? new URL('https://hexsettlers.org/') : new URL(window.location.pathname || '/', window.location.origin);
    u.searchParams.set('room', code);
    if (spectator) u.searchParams.set('spectator', '1');
    else u.searchParams.delete('spectator');
    return u.toString();
  } catch (_) {
    const origin = (window.location && window.location.origin) || '';
    return `${origin}${(window.location && window.location.pathname) || '/'}?room=${encodeURIComponent(code)}${spectator ? '&spectator=1' : ''}`;
  }
}

function buildSpectatorJoinUrl(roomCode) {
  return buildDirectJoinUrl(roomCode, { spectator: true });
}

function refreshLobbyJoinLinkUi() {

    const code = String((room && room.code) || '').trim().toUpperCase();
    const link = code ? (room?.ranked ? buildSpectatorJoinUrl(code) : buildDirectJoinUrl(code)) : '';
    if (ui.roomJoinLinkInput) {
      ui.roomJoinLinkInput.value = link; // preserve compatibility with existing invite-link helpers
      ui.roomJoinLinkInput.textContent = link || 'Direct join link';
      ui.roomJoinLinkInput.disabled = !link;
      ui.roomJoinLinkInput.title = link ? 'Click to copy direct join link' : 'Join a room first';
    }
    if (ui.roomCode) ui.roomCode.disabled = !code;
  }


  function connect() {
    if (!websocketReconnectAllowed) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    if (websocketReconnectTimer !== null) {
      clearTimeout(websocketReconnectTimer);
      websocketReconnectTimer = null;
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws`;
    const socket = new WebSocket(url);
    ws = socket;
    roomConnectionReady = false;

    socket.addEventListener('open', () => {
      if (ws !== socket) {
        try { socket.close(); } catch (_) {}
        return;
      }
      websocketReconnectDelayMs = 1200;
      websocketAuthenticated = false;
      startWebsocketHeartbeat(socket);
      setConn(true, 'Connected');
      setError(null);
      // Migrate older localStorage sessions into an HTTP-only cookie. The
      // WebSocket token path remains as a fallback for older deployed servers.
      pendingAutoRejoin = true;
      let t = null;
      try { t = localStorage.getItem(AUTH_TOKEN_KEY); } catch (_) { t = null; }
      if (t) {
        authApi('token', { token: t }).then(() => {
          removePersistedAuthToken();
          reconnectForCookieAuth();
        }).catch(() => {
          send({ type: 'auth_token', token: t });
        });
      } else {
        updateAuthUi();
      }
      setTimeout(() => {
        if (ws !== socket || !pendingAutoRejoin || roomConnectionReady || !room || !authUser) return;
        setError('The connection handshake stalled. Retrying without discarding the lobby…');
        try { socket.close(4000, 'Handshake retry'); } catch (_) {}
      }, 10_000);
    });

    socket.addEventListener('close', (event) => {
      if (ws !== socket) return;
      stopWebsocketHeartbeat();
      websocketConnectionId = null;
      ws = null;
      roomConnectionReady = false;
      setConn(false, 'Disconnected');
      if ((event && Number(event.code) === 4001) || !websocketReconnectAllowed) {
        setError('This room session is active in another browser or tab. Click Rejoin Last Room here to take it back.');
        return;
      }
      if (room && authUser) setError('Connection interrupted. Reconnecting to the room…');
      const delay = websocketReconnectDelayMs;
      websocketReconnectDelayMs = Math.min(10_000, Math.max(1200, Math.round(websocketReconnectDelayMs * 1.6)));
      scheduleWebsocketReconnect(delay);
    });

    socket.addEventListener('message', (ev) => {
      if (ws !== socket) return;
      websocketLastMessageAt = Date.now();
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg || !msg.type) return;
      if (msg.type === 'server_pong') {
        websocketLastPongAt = Date.now();
        const sentAt = Number(msg.clientTime);
        websocketHeartbeatRttMs = Number.isFinite(sentAt) && sentAt > 0
          ? Math.max(0, Date.now() - sentAt) : null;
        if (ui.connDot) ui.connDot.title = `Server heartbeat OK${websocketHeartbeatRttMs == null ? '' : ` · ${websocketHeartbeatRttMs} ms`}`;
        if (websocketConnectionId && msg.connectionId && msg.connectionId !== websocketConnectionId) {
          try { socket.close(4000, 'Connection identity changed'); } catch (_) {}
        }
        if (roomConnectionReady && room?.code && msg.roomCode && msg.roomCode !== room.code) {
          try { socket.close(4000, 'Room binding changed'); } catch (_) {}
        }
        return;
      }

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
        playSfx(msg.name, msg);
        return;
      }

      if (msg.type === 'error') {
        const e = msg.error || 'Error';
        if (pendingPlayModeSwitch) {
          pendingPlayModeSwitch = null;
          selectedPlayMode = room?.casual ? 'casual' : room?.ranked ? 'ranked' : 'unranked';
          try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
          updateAuthUi();
        }
        if (pendingRecentRoomRejoinCode) {
          // The server rejected a recent-room recovery (closed/deleted room,
          // expired membership, etc). Don't keep trying or leave an empty map.
          pendingRecentRoomRejoinCode = '';
          pendingAutoRejoin = false;
          clearRecentRoom();
          try { localStorage.removeItem(LAST_ROOM_KEY); } catch (_) {}
          if (!room) {
            showRoomNotFound();
            return;
          }
        }
        if (selectedPlayMode === 'ranked') {
          pendingRankedMatchmaking = false;
          const status = $('rankedStatus');
          if (status) status.textContent = `Matchmaking could not start: ${e}`;
          $('rankedReadyBtn')?.classList.remove('hidden');
          $('rankedCancelBtn')?.classList.add('hidden');
        }
        if (msg.reconnectBlocked || /room session (moved|is active)|another browser or tab/i.test(e)) {
          websocketReconnectAllowed = false;
          roomConnectionReady = false;
          clearRoomRecoveryState();
          setError('This room session is active in another browser or tab. Click Rejoin Last Room here to take it back.');
          return;
        }
        if (/room (not found|expired)|^not in a room\.?$|not a member of this room/i.test(String(e).trim())) {
          if (/room (not found|expired)/i.test(String(e).trim())) { showRoomNotFound(); return; }
          beginRoomRecovery(e);
          return;
        }
        clearRoomRecoveryState();
        setError(e);
        // If a rematch attempt failed, re-enable the postgame Main Menu button.
        try {
          if (ui.pgMainMenuBtn) {
            ui.pgMainMenuBtn.disabled = false;
            ui.pgMainMenuBtn.textContent = postgameState.historyMode ? 'Back' : 'Main Menu';
          }
          if (ui.pgRematchBtn) { ui.pgRematchBtn.disabled = false; ui.pgRematchBtn.textContent = 'Rematch'; }
        } catch (_) {}
        updateAuthUi();
        return;
      }


      if (msg.type === 'public_lobbies') {
        renderPublicLobbies(Array.isArray(msg.rooms) ? msg.rooms : []);
        return;
      }
      if (msg.type === 'custom_map_file') {
        const label = String(msg.map?.mapKind || 'custom').replace(/[^a-z0-9_-]/gi, '-');
        saveBrowserJson(`hex-settlers-${label}-map.json`, msg.map); return;
      }
      if (msg.type === 'custom_map_loaded') { toast(msg.message || 'Custom map loaded.'); return; }

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
          snap.ranked = (snap.ranked == null && g.ranked == null) ? null : !!(snap.ranked || g.ranked);
          if (!snap.ratingChanges) snap.ratingChanges = g.ratingChanges || {};
          if (!snap.unrankedRatingChanges) snap.unrankedRatingChanges = g.unrankedRatingChanges || {};
          if (!snap.winnerName && g.winnerName) snap.winnerName = g.winnerName;
          if (snap.stats && !snap.stats.endedAt && g.endedAt) snap.stats.endedAt = g.endedAt;
          if (snap.stats && !snap.stats.startedAt && g.startedAt) snap.stats.startedAt = g.startedAt;
        }
        const openMode = historyState.openMode || 'summary';
        if (openMode === 'download') {
          if (replayEntryIsUsable(g) && historyState.exporting) historyState.exporting.games.push(g);
          requestNextReplayExport();
          return;
        }
        if (openMode === 'replay') startHistoryReplay(g);
        else openPostgameSnapshot(snap, g, { tab: 'summary' });
        historyState.openMode = 'summary';
        return;
      }

      if (msg.type === 'challenge_maps') {
        weeklyChallengeCatalog = msg;
        if (journeyView === 'challenge') renderChallengeMaps();
        return;
      }

      if (msg.type === 'challenge_archive') {
        historyState.challengeArchive = Array.isArray(msg.games) ? msg.games : [];
        historyState.loadingChallenges = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'player_leaderboard') {
        historyState.leaderboard = Array.isArray(msg.rows) ? msg.rows : [];
        historyState.loadingBoard = false;
        if (historyState.active) renderHistory();
        return;
      }

      if (msg.type === 'hello') {
        websocketConnectionId = String(msg.connectionId || '');
        const st = Number(msg.serverTime || 0);
        if (st) serverTimeOffsetMs = st - Date.now();
        return;
      }


      if (msg.type === 'auth_ok') {
        websocketAuthenticated = !!msg.user || !!authUser;
        if (msg.user) {
          // Keep prior token if server didn't send one (e.g., display-name update)
          setAuthState(
            msg.user,
            (typeof msg.token === 'string' && msg.token.trim()) ? msg.token : authToken,
            { clearToken: !!msg.cookieAuth },
          );
        } else {
          updateAuthUi();
        }

        if (authUser?.needsUsernameSetup) {
          // Do not consume an invite link or auto-rejoin while the account
          // still has only a provisional username.
          pendingAutoRejoin = false;
          return;
        }

        if (pendingRankedMatchmaking && authUser) {
          startRankedMatchmaking();
        }

        if (pendingManualRejoinCode && authUser) {
          const targetCode = String(pendingManualRejoinCode || '').trim().toUpperCase();
          pendingManualRejoinCode = '';
          if (targetCode) {
            send({ type: 'rejoin_room', code: targetCode, displayName: (ui.nameInput?.value || '').trim() });
            return;
          }
        }

        if (pendingDirectJoinRoomCode && authUser) {
          // Never rejoin an unrelated room from localStorage when an invite is open.
          pendingAutoRejoin = false;
          selectInvitedLobbyMode();
          updateAuthUi();
          const targetCode = String(pendingDirectJoinRoomCode || '').trim().toUpperCase();
          const joinAsSpectator = !!pendingDirectJoinAsSpectator;
          const alreadyThere = !!(roomConnectionReady && room && String(room.code || '').trim().toUpperCase() === targetCode);
          if (targetCode && !alreadyThere) {
            pendingDirectJoinRoomCode = null; // one-shot
            pendingDirectJoinAsSpectator = false;
            const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || authUser.username || 'Player';
            send({ type: 'join_room', code: targetCode, displayName, spectator: joinAsSpectator });
            return;
          }
          if (alreadyThere) {
            pendingDirectJoinRoomCode = null;
            pendingDirectJoinAsSpectator = false;
          }
        }

        if (pendingAutoRejoin) {
          pendingAutoRejoin = false;
          // Preserve socket recovery for a room already held in memory, but
          // never restore a stale localStorage code on a fresh page load.
          const existingRoom = room?.code ? String(room.code).trim().toUpperCase() : '';
          const recent = recentRoomSessionForUser(authUser);
          const code = existingRoom || (['ranked','journey'].includes(selectedPlayMode) ? '' : recent?.code || '');
          if (code) {
            pendingRecentRoomRejoinCode = existingRoom ? '' : code;
            selectedPlayMode = (room?.tutorial || (!existingRoom && recent?.tutorial)) ? 'casual' : 'unranked';
            try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
            updateAuthUi();
            send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
          } else if (selectedPlayMode === 'unranked' && !room) {
            selectedPlayMode = 'journey'; journeyView = 'home';
            try { sessionStorage.setItem('hexsettlers_play_mode', 'journey'); } catch (_) {}
            updateAuthUi();
          }
        }
        return;
      }

      if (msg.type === 'lobby_invite') {
        const code = String(msg.roomCode || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4,8}$/.test(code)) return;
        const notice = document.createElement('div');
        notice.className = 'friendRequestToast lobbyInviteToast';
        const message = document.createElement('div');
        const from = msg.from || {};
        message.textContent = `${from.displayName || from.username || 'A friend'} invited you to ${msg.spectator ? 'watch a ranked match' : 'their lobby'}.`;
        const controls = document.createElement('div');
        controls.className = 'lobbyInviteActions';
        const join = document.createElement('button');
        join.className = 'btn primary';
        join.textContent = msg.spectator ? 'Watch' : 'Join Lobby';
        join.addEventListener('click', () => {
          window.location.assign(buildDirectJoinUrl(code, { spectator: !!msg.spectator }));
        });
        const dismiss = document.createElement('button');
        dismiss.className = 'btn';
        dismiss.textContent = 'Dismiss';
        dismiss.addEventListener('click', () => notice.remove());
        controls.append(join, dismiss);
        notice.append(message, controls);
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 30000);
        return;
      }

      if (msg.type === 'friend_request') {
        const from = msg.from || {};
        const notice = document.createElement('div');
        notice.className = 'friendRequestToast';
        notice.textContent = `${from.displayName || from.username || 'A player'} sent you a friend request.`;
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 7000);
        const badge = $('friendBadge');
        if (badge) { badge.textContent = String(Number(badge.textContent || 0) + 1); badge.classList.remove('hidden'); }
        return;
      }

      if (msg.type === 'ranked_queue_status') {
        pendingRankedMatchmaking = false;
        if (selectedPlayMode !== 'ranked') {
          // A queued status can be in flight when Change Game Type cancels.
          if (msg.queued) send({ type: 'ranked_queue_leave' });
          return;
        }
        rankedQueueActive = !!msg.queued;
        const status = $('rankedStatus');
        if (status) status.textContent = msg.queued ? `Searching near rating ${msg.rating || 1000} (±${msg.ratingRange || 100}) · ${msg.waiting || 1}/${msg.needed || 4} players ready` : 'Matchmaking cancelled.';
        $('rankedReadyBtn')?.classList.toggle('hidden', !!msg.queued);
        $('rankedCancelBtn')?.classList.toggle('hidden', !msg.queued);
        return;
      }
      if (msg.type === 'ranked_match_found') {
        rankedQueueActive = false;
        pendingRankedMatchmaking = false;
        // A match takes priority over Friends, Player Stats, and Game Log.
        // Close whichever tool the player was viewing before showing the
        // server-owned four-player ranked lobby and map ballot.
        if (historyReplay.active) { stopHistoryReplay(); }
        closeHistoryOverlay();
        $('friendsOverlay')?.classList.add('hidden');
        $('accountMenu')?.classList.add('hidden');
        try { setLogPanelVisible(false); } catch (_) {}
        try { forceCloseModal(); } catch (_) {}
        selectedPlayMode = 'unranked';
        try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
        updateAuthUi();
        toast('Ranked match found!');
        return;
      }

      if (msg.type === 'auth_required') {
        clearAuthLocal();
        pendingAutoRejoin = false;
        roomConnectionReady = false;
        clearRoomRecoveryState();
        if (room) handleLocalRoomExit('Your session expired. Log in, then rejoin the room.', { preserveLastRoom: true });
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

      if (msg.type === 'tutorial_complete') {
        if (msg.user && authUser?.id === msg.user.id) authUser = msg.user;
        updateAuthUi();
        refreshTutorialGuide();
        return;
      }

      if (msg.type === 'joined') {
        if (msg.room?.ranked) {
          rankedQueueActive = false;
          pendingRankedMatchmaking = false;
          if (historyReplay.active) stopHistoryReplay();
          closeHistoryOverlay();
          $('friendsOverlay')?.classList.add('hidden');
          $('accountMenu')?.classList.add('hidden');
        }
        if (ui.pgRematchBtn) { ui.pgRematchBtn.disabled = false; ui.pgRematchBtn.textContent = 'Rematch'; }
        // Room membership always displays the lobby, even after a saved
        // ranked preference or a reconnect before the user chose a mode.
        if (msg.room?.casual) {
          selectedPlayMode = 'casual';
          try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
        } else if (selectedPlayMode !== 'unranked') {
          selectedPlayMode = 'unranked';
          try { sessionStorage.setItem('hexsettlers_play_mode', selectedPlayMode); } catch (_) {}
        }
        roomNotFoundVisible = false;
        roomConnectionReady = true;
        pendingRecentRoomRejoinCode = '';
        clearRoomRecoveryState();
        myPlayerId = msg.playerId;
        try { setLocalPanelLayoutOwnerKey(myPlayerId || null); } catch (_) {}
        room = msg.room;
        state = null; // The previous room's game-over state must never hide a new ranked ballot.
        resetViewportForRoomChange();
        ensureStructureSpritesReady();
        isHost = !!msg.isHost;
        if (ui.codeInput && room?.code) ui.codeInput.value = room.code;
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        refreshLobbyJoinLinkUi();
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        if (!room?.tutorial) noteRecentRoom(room);
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !isHost);
        setError(null);
        renderLobby();
        updateButtons();
        queueTexturePackAnnounce(false);
        send({ type: 'get_state' });
        const queuedRoomMessages = pendingReconnectRoomMessages.splice(0);
        for (const queuedMessage of queuedRoomMessages) send(queuedMessage);
        return;
      }

      if (msg.type === 'room') {
        room = msg.room;
        ensureStructureSpritesReady();
        isHost = !!(myPlayerId && room && !room.ranked && room.hostId === myPlayerId);
        ui.roomBox.classList.remove('hidden');
        ui.roomCode.textContent = room.code;
        refreshLobbyJoinLinkUi();
        try { localStorage.setItem(LAST_ROOM_KEY, room.code); } catch (_) {}
        if (!room?.tutorial) noteRecentRoom(room);
        updateAuthUi();
        ui.startBtn.classList.toggle('hidden', !(myPlayerId && room.hostId === myPlayerId));
        renderLobby();
        updateButtons();
        queueTexturePackAnnounce(false);
        return;
      }

      if (msg.type === 'left_room') {
        const switchedTo = pendingPlayModeSwitch && msg.switchMode === pendingPlayModeSwitch ? pendingPlayModeSwitch : null;
        pendingPlayModeSwitch = null;
        if (switchedTo) {
          returnToUnrankedAfterLeave = false;
          returnToModeSelectionAfterLeave = false;
          handleLocalRoomExit('');
          activatePlayMode(switchedTo, { skipRecentRoom: true });
          return;
        }
        const returnToModeSelection = returnToModeSelectionAfterLeave || returnToUnrankedAfterLeave || !!msg.rankedMenu || !!msg.kicked;
        const returnToRankedReady = !!msg.rankedReady;
        returnToUnrankedAfterLeave = false;
        returnToModeSelectionAfterLeave = false;
        roomConnectionReady = false;
        if (ui.pgMainMenuBtn) { ui.pgMainMenuBtn.disabled = false; ui.pgMainMenuBtn.textContent = 'Main Menu'; }
        if (ui.pgRematchBtn) { ui.pgRematchBtn.disabled = false; ui.pgRematchBtn.textContent = 'Rematch'; }
        if (returnToModeSelection) {
          returnToGameTypeSelection(msg.kicked ? (msg.reason || 'You were removed from the room.') : '');
          if (tutorialContinueToAllGames) { tutorialContinueToAllGames = false; returnToAllGamesAfterExit(); }
        } else if (returnToRankedReady) {
          handleLocalRoomExit('');
          returnToRankedReadyScreen();
        } else {
          handleLocalRoomExit(msg.reason || 'You left the room.');
        }
        return;
      }

      if (msg.type === 'room_closed_by_admin') {
        returnToGameTypeSelection(msg.reason || 'This room has been closed.');
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

      if (msg.type === 'texture_pack_manifest') {
        const pack = msg.pack || null;
        const packId = validTexturePackId(pack && pack.id);
        if (!packId) {
          setError('Texture pack manifest was empty.');
          return;
        }
        if (isBuiltinTexturePackId(packId)) {
          pendingTexturePackSelectId = null;
          void setActiveTexturePackById(packId, { announce: true, forcePublish: false }).catch((err) => {
            setError(err && err.message ? err.message : 'Failed to switch texture pack.');
          });
          return;
        }
        void saveSharedTexturePackFromManifest(pack).then((record) => {
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

      if (msg.type === 'texture_pack_payload') {
        const pack = msg.pack || null;
        if (!pack) {
          setError('Texture pack payload was empty.');
          return;
        }
        if (isBuiltinTexturePackId(pack.id)) {
          pendingTexturePackSelectId = null;
          void setActiveTexturePackById(pack.id, { announce: true, forcePublish: false }).catch((err) => {
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
        if (historyReplay.active) {
          historyReplay.liveState = msg.state;
          return;
        }
        const prevState = state;
        trackNewStructurePlacements(prevState, msg.state);
        state = msg.state;
        syncEndTurnWarnAudioState(prevState, state);
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
        // Fit each new board to the available canvas, then preserve manual zoom/pan.
        const tc = (state && state.geom && state.geom.tiles) ? state.geom.tiles.length : 0;
        if (tc && tc !== lastTileCountForView) {
          lastTileCountForView = tc;
          view.autoFit = true;
        }
        maybePlayTurnBell();
        maybePlayPairedTurnSfx();
        scheduleEndTurnWarn();
        handleLastEvent();
        handlePendingTradePrompt();
        handleEndGameVotePrompt();
        handleTurnUndoVotePrompt();
        handleDiscardPrompt();
        handleRobberStealPrompt();
        handlePirateChoicePrompt();
        handlePirateStealPrompt();
        handleDiscoveryGoldPrompt();
        handleProductionGoldPrompt();
        refreshToolModals();
        if (state?.phase === 'game-over') clearRecentRoom();
        else noteRecentRoom(room);
        if (state && state.phase && state.phase !== 'lobby') ensureStructureSpritesReady();

        // Keep the draggable Game Log overlay in sync while it's open.
        try {
          const inGame = !!(state && state.phase && state.phase !== 'lobby');
          if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame);
          if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
        } catch (_) {}

        updateButtons();
        updateCartographerDraftPanel();
        // Room packets handle membership/settings changes. Gameplay actions do
        // not need to rebuild the hidden lobby and texture controls every time.
        if (!prevState || prevState.phase !== state.phase || state.phase === 'lobby') renderLobby();
        render();
        refreshTutorialGuide();
        syncPostgameToState();
        return;
      }
    });
  }

  function send(obj) {
    if (!ws || ws.readyState !== 1) return;
    if (historyReplay.active && !HISTORY_REPLAY_ALLOWED_MESSAGES.has(obj && obj.type)) {
      setError('Exit the replay before changing the live game.');
      return;
    }
    const type = String(obj && obj.type || '');
    const payload = (room && room.code && ROOM_SCOPED_MESSAGE_TYPES.has(type) && !obj.roomCode)
      ? { ...obj, roomCode: String(room.code).trim().toUpperCase() }
      : obj;
    if (room && myPlayerId && !roomConnectionReady && RECONNECT_SAFE_ROOM_MESSAGE_TYPES.has(type)) {
      pendingReconnectRoomMessages = pendingReconnectRoomMessages.filter((message) => String(message && message.type || '') !== type);
      pendingReconnectRoomMessages.push(payload);
      setError('Reconnecting to the room…');
      return;
    }
    try { ws.send(JSON.stringify(payload)); }
    catch (_) {
      try { ws.close(); } catch (_) {}
    }
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

  try { sessionStorage.removeItem(AUTO_CREATE_ROOM_KEY); } catch (_) {}
  pendingDirectJoinRoomCode = parseDirectJoinCodeFromUrl();
  pendingDirectJoinAsSpectator = parseDirectJoinSpectatorFromUrl();
  selectInvitedLobbyMode();
  updateAuthUi();
  if (IS_ADMIN_PORTAL) {
    void authApi('session').then(result => {
      if (result.user) setAuthState(result.user, null, { clearToken: true });
    }).catch(() => { /* No management session yet; show sign-in. */ });
  } else {
    connect();
  }
  handleOAuthReturnFromUrl();
  setTimeout(handleAccountActionLinkFromUrl, 0);
  // Keep the countdown clock ticking even when no state messages arrive.
  if (!IS_ADMIN_PORTAL) ensureTimerUiInterval();

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
  if (!IS_ADMIN_PORTAL) loadImages().then(render);

  // Texture-pack port images do not all use the same transparent padding.
  // Cache visible pixel bounds and center the artwork, not the PNG canvas.
  const visibleImageBoundsCache = new WeakMap();
  function visibleImageBounds(image) {
    if (!image) return null;
    const cached = visibleImageBoundsCache.get(image);
    if (cached) return cached;
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    const fallback = { x: 0, y: 0, width, height };
    if (!width || !height) return fallback;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = width; let minY = height; let maxX = -1; let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pixels[((y * width + x) * 4) + 3] <= 8) continue;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      const bounds = maxX >= minX && maxY >= minY
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : fallback;
      visibleImageBoundsCache.set(image, bounds);
      return bounds;
    } catch (_) {
      visibleImageBoundsCache.set(image, fallback);
      return fallback;
    }
  }

  function drawVisibleImageCentered(context, image, centerX, centerY, boxSize) {
    const bounds = visibleImageBounds(image);
    if (!bounds || !bounds.width || !bounds.height) return;
    const scale = Math.min(boxSize / bounds.width, boxSize / bounds.height);
    const drawWidth = bounds.width * scale;
    const drawHeight = bounds.height * scale;
    context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height,
      centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
  }

  // Modal helpers
  function closeModal() {
    if (modalLocked) return;

    // Dismiss only this player's popup. Their response and the offer stay intact.
    if (modalType === 'pendingTrade') {
      lastTradePromptKeySeen = pendingTradeKey();
      pendingTradePromptId = 0;
      pendingTradeModalKey = '';
    }

    // Closing a vote panel is not the same as rejecting or withdrawing a vote.
    // Votes change only through the explicit voting controls.
    try {
      if (modalType === 'turnUndoVote' && state && state.turnUndoVote && myPlayerId) {
        sendGameAction({ kind: 'respond_turn_undo', voteId: state.turnUndoVote.id, accept: false });
      }
    } catch (_) {}

    ui.modal.classList.add('hidden');
    ui.modalTitle.textContent = '';
    ui.modalBody.innerHTML = '';
    ui.modalActions.innerHTML = '';
    ui.modalActions.classList.remove('bossProfileActions');
    modalType = null;
    activeToolModal = null;
    chatRefs = null;

    // If a shared prompt was deferred because another modal was open, try it
    // immediately after the current modal closes.
    try {
      if (pendingTradePromptId && state && state.pendingTrade && Number(state.pendingTrade.id || 0) === Number(pendingTradePromptId || 0)) {
        setTimeout(() => {
          try { handlePendingTradePrompt(); } catch (_) {}
        }, 0);
      }
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
    ui.modalActions.classList.remove('bossProfileActions');
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

  function formatUserManagementDate(timestamp) {
    const value = Number(timestamp || 0);
    if (!value) return 'Never';
    try { return new Date(value).toLocaleString(); } catch (_) { return 'Unknown'; }
  }

  function openPlayerProfile(profile) {
    if (!profile) return;
    const stats = profile.stats || {};
    const games = Math.max(0, Number(stats.gamesPlayed || 0));
    const wins = Math.max(0, Number(stats.wins || 0));
    const losses = Math.max(0, Number(stats.losses || 0));
    const totalVP = Math.max(0, Number(stats.totalVP || 0));
    const winRate = games ? Math.round((wins / games) * 100) : 0;
    const averageVP = games ? (totalVP / games).toFixed(1) : '0.0';
    const rating = Number.isFinite(Number(profile.rankedRating)) && profile.rankedRating != null ? Math.round(Number(profile.rankedRating)) : 1000;
    const unranked = Number.isFinite(Number(profile.unrankedRating)) && profile.unrankedRating != null ? Math.round(Number(profile.unrankedRating)) : 0;
    const body = document.createElement('div');
    body.className = 'playerProfileCard';
    const hero = document.createElement('div');
    hero.className = 'playerProfileHero';
    const avatar = document.createElement('div');
    avatar.className = 'playerProfileAvatar';
    avatar.textContent = String(profile.displayName || profile.username || '?').slice(0, 1).toUpperCase();
    const identity = document.createElement('div');
    const displayName = document.createElement('div');
    displayName.className = 'playerProfileName';
    displayName.textContent = profile.displayName || profile.username || 'Player';
    const username = document.createElement('div');
    username.className = 'playerProfileUsername';
    username.textContent = profile.username ? `@${profile.username}` : 'Hex Settlers player';
    identity.append(displayName, username);
    const ratingGroup = document.createElement('div');
    ratingGroup.className = 'playerProfileRatings';
    for (const [label, value] of [['RANKED RATING', rating], ['UNRANKED RATING', unranked]]) {
      const ratingBadge = document.createElement('div');
      ratingBadge.className = 'playerProfileRating';
      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      const valueElement = document.createElement('strong');
      valueElement.textContent = String(value);
      ratingBadge.append(labelElement, valueElement);
      ratingGroup.appendChild(ratingBadge);
    }
    hero.append(avatar, identity, ratingGroup);
    body.appendChild(hero);
    const grid = document.createElement('div');
    grid.className = 'playerProfileStats';
    for (const [label, value] of [['Games', games], ['Wins', wins], ['Losses', losses], ['Win Rate', `${winRate}%`], ['Total VP', totalVP], ['Average VP', averageVP]]) {
      const item = document.createElement('div');
      item.className = 'playerProfileStat';
      const valueNode = document.createElement('strong');
      valueNode.textContent = String(value);
      const labelNode = document.createElement('span');
      labelNode.textContent = label;
      item.append(valueNode, labelNode);
      grid.appendChild(item);
    }
    body.appendChild(grid);
    const footer = document.createElement('div');
    footer.className = 'playerProfileFooter';
    const memberSince = Number(profile.createdAt || 0);
    const lastGame = Number(stats.lastGameAt || 0);
    footer.textContent = `${memberSince ? `Settler since ${new Date(memberSince).toLocaleDateString()}` : 'Hex Settlers player'}${lastGame ? ` · Last game ${new Date(lastGame).toLocaleDateString()}` : ''}`;
    body.appendChild(footer);
    const mayAppoint = !!room && !room.ranked && room.gamePhase === 'lobby' && room.hostId === myPlayerId
      && (room.players || []).some(player => player.id === profile.id && !player.isAI) && profile.id !== myPlayerId;
    const alreadyBoss = !!room?.bossIds?.includes(profile.id);
    const actions = [];
    if (mayAppoint) actions.push({ label: alreadyBoss ? 'Remove Boss' : 'Make Boss', onClick: () => {
      send({ type: 'set_room_boss', userId: profile.id, enabled: !alreadyBoss }); closeModal();
    }});
    actions.push({ label: 'Close', primary: true, onClick: closeModal });
    openModal({ title: 'Player Profile', bodyNode: body, actions });
    ui.modalActions?.classList.toggle('bossProfileActions', mayAppoint);
  }

  async function openPlayerProfileById(userId) {
    const id = String(userId || '').trim();
    if (!id) return;
    try {
      const result = await accountApi('profile', { userId: id });
      openPlayerProfile(result.profile);
    } catch (error) {
      setError(error.message || 'Could not load that player profile.');
    }
  }

  async function openRatingManagementScreen(container = null) {
    if (!authUser?.isAdmin) { setError('Administrator access required.'); return; }
    const body = document.createElement('div');
    body.className = 'ratingManagementPanel';
    const message = document.createElement('p');
    message.className = 'smallNote';
    message.textContent = 'Loading rating policy…';
    body.appendChild(message);
    if (container) container.replaceChildren(body);
    else openModal({ title: 'Rating Management', bodyNode: body, actions: [{ label: 'Close', onClick: closeModal }] });
    try {
      const response = await adminApi('rating-policy');
      const policy = JSON.parse(JSON.stringify(response.policy));
      let previewToken = '';
      body.replaceChildren();
      const intro = document.createElement('p');
      intro.className = 'userManagementNotice';
      intro.textContent = `Adjust how ranked rating is earned or lost. Bonuses are rating points per recorded event, applied after multiplayer Elo. Positive weights reward, negative weights penalize. Zero disables a metric. ${response.archivedRankedGames} ranked games are in the retained ${response.archivedGames}-game archive (maximum ${response.historyLimit}); older missing records cannot be reconstructed.`;
      body.appendChild(intro);
      const form = document.createElement('div');
      form.className = 'ratingManagementFields';
      const inputs = {};
      const addSetting = (label, key, min, max, step, value, parent = form) => {
        const row = document.createElement('label');
        row.className = 'ratingManagementField';
        const caption = document.createElement('span');
        caption.textContent = label;
        const input = document.createElement('input');
        input.className = 'input'; input.type = 'number';
        input.min = String(min); input.max = String(max); input.step = String(step);
        input.value = String(value); input.setAttribute('aria-label', label);
        input.addEventListener('input', () => { previewToken = ''; applyBtn.disabled = true; results.replaceChildren(); status.textContent = 'Unsaved edits — preview again to apply a rebuild.'; });
        row.append(caption, input); parent.appendChild(row); inputs[key] = input;
      };
      addSetting('Elo K-factor (0–128)', 'kFactor', 0, 128, 1, policy.kFactor);
      addSetting('Elo scale (100–2000)', 'eloScale', 100, 2000, 1, policy.eloScale);
      addSetting('Max bonus / penalty per game (0–256)', 'maxPerformanceAdjustment', 0, 256, 1, policy.maxPerformanceAdjustment);
      addSetting('Winner bonus', 'winBonus', -100, 100, .5, policy.winBonus);
      addSetting('Non-winner bonus', 'lossBonus', -100, 100, .5, policy.lossBonus);
      body.appendChild(form);
      const heading = document.createElement('h3');
      heading.textContent = 'Per-event performance weights';
      body.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'ratingManagementFields ratingWeights';
      for (const metric of response.metrics) addSetting(metric.label, metric.key, -25, 25, .25, policy.weights?.[metric.key] ?? 0, grid);
      body.appendChild(grid);
      const resultHeader = document.createElement('h3'); resultHeader.textContent = 'Historical impact preview';
      body.appendChild(resultHeader);
      const status = document.createElement('p'); status.className = 'smallNote';
      status.textContent = 'Preview is read-only. Apply Rebuild changes saved historical rating deltas and account ratings.';
      body.appendChild(status);
      const results = document.createElement('div'); results.className = 'ratingPreviewResults'; body.appendChild(results);
      const controls = document.createElement('div'); controls.className = 'ratingManagementActions';
      const saveBtn = document.createElement('button'); saveBtn.className = 'btn'; saveBtn.textContent = 'Save Weights for Future Games';
      const previewBtn = document.createElement('button'); previewBtn.className = 'btn primary'; previewBtn.textContent = 'Preview Past Ranked Games';
      const applyBtn = document.createElement('button'); applyBtn.className = 'btn danger'; applyBtn.textContent = 'Apply Historical Rebuild'; applyBtn.disabled = true;
      const confirmLabel = document.createElement('label'); confirmLabel.className = 'ratingConfirm';
      confirmLabel.textContent = 'To rebuild, type RECALCULATE: ';
      const confirm = document.createElement('input'); confirm.className = 'input'; confirm.placeholder = 'RECALCULATE';
      confirm.autocomplete = 'off'; confirmLabel.appendChild(confirm);
      const getPolicy = () => {
        const out = { weights: {} };
        for (const key of ['kFactor', 'eloScale', 'maxPerformanceAdjustment', 'winBonus', 'lossBonus']) out[key] = Number(inputs[key].value);
        for (const metric of response.metrics) out.weights[metric.key] = Number(inputs[metric.key].value);
        if (Object.values(inputs).some(input => !input.value.trim() || !input.checkValidity())) throw new Error('Please correct highlighted settings and their allowed ranges.');
        return out;
      };
      function setBusy(busy) { saveBtn.disabled = busy; previewBtn.disabled = busy; applyBtn.disabled = busy || !previewToken; }
      saveBtn.addEventListener('click', async () => {
        try { setBusy(true); const result = await adminApi('rating-policy-save', { policy: getPolicy() });
          status.textContent = result.message; previewToken = ''; results.replaceChildren(); }
        catch (error) { status.textContent = error.message; } finally { setBusy(false); }
      });
      previewBtn.addEventListener('click', async () => {
        try {
          previewToken = ''; setBusy(true); results.replaceChildren();
          const result = await adminApi('rating-policy-preview', { policy: getPolicy() });
          previewToken = result.token;
          status.textContent = `${result.applied} ranked games replayed, ${result.skipped} skipped, ${result.archivedCount} total archived. This preview has not changed any ratings.`;
          const table = document.createElement('table'); table.className = 'ratingPreviewTable';
          const head = document.createElement('tr');
          for (const label of ['Player', 'Current', 'Projected', 'Difference']) { const cell = document.createElement('th'); cell.textContent = label; head.appendChild(cell); }
          table.appendChild(head);
          for (const player of result.leaderboard) {
            const tr = document.createElement('tr'); const diff = player.projected - player.current;
            for (const label of [player.name, player.current, player.projected, `${diff > 0 ? '+' : ''}${diff}`]) {
              const td = document.createElement('td'); td.textContent = String(label); tr.appendChild(td);
            } table.appendChild(tr);
          }
          results.appendChild(table);
        } catch (error) { status.textContent = error.message; }
        finally { setBusy(false); }
      });
      applyBtn.addEventListener('click', async () => {
        if (!previewToken || confirm.value.trim() !== 'RECALCULATE') {
          status.textContent = 'Preview again and type RECALCULATE to confirm.'; return;
        }
        try {
          setBusy(true);
          const result = await adminApi('rating-policy-rebuild', { policy: getPolicy(), token: previewToken, confirm: 'RECALCULATE' });
          status.textContent = result.message;
          previewToken = ''; confirm.value = ''; results.replaceChildren();
          authUser.rankedRating = result.myRating ?? authUser.rankedRating;
        } catch (error) { status.textContent = error.message; }
        finally { setBusy(false); }
      });
      controls.append(saveBtn, previewBtn, applyBtn);
      body.append(confirmLabel, controls);
    } catch (error) { message.textContent = error.message || 'Could not load rating policy.'; }
  }

  async function openServerManagementConsole(container = null) {
    if (!authUser?.isAdmin) {
      setError('Administrator access is required.');
      return;
    }
    const body = document.createElement('div');
    body.className = 'modalText serverManagementPanel';
    const status = document.createElement('div');
    status.className = 'smallNote';
    status.textContent = 'Loading active rooms…';
    body.appendChild(status);

    const selectedCodes = () => Array.from(body.querySelectorAll('input[data-room-code]:checked')).map((input) => input.dataset.roomCode);
    const render = async () => {
      body.replaceChildren(status);
      status.textContent = 'Loading active rooms…';
      try {
        const result = await adminApi('rooms');
        const rooms = Array.isArray(result.rooms) ? result.rooms : [];
        body.replaceChildren();
        if (!rooms.length) {
          status.textContent = 'No active rooms.';
          body.appendChild(status);
          return;
        }
        for (const managed of rooms) {
          const card = document.createElement('section');
          card.className = 'card';
          card.style.marginBottom = '10px';
          const heading = document.createElement('label');
          heading.style.display = 'flex';
          heading.style.gap = '9px';
          heading.style.alignItems = 'center';
          const check = document.createElement('input');
          check.type = 'checkbox';
          check.dataset.roomCode = managed.code;
          const title = document.createElement('strong');
          title.textContent = `${managed.code} · ${managed.phase}${managed.ranked ? ' · Ranked' : ''}`;
          heading.append(check, title);
          card.appendChild(heading);
          const meta = document.createElement('div');
          meta.className = 'smallNote';
          meta.textContent = `${managed.mapMode}${managed.scenario ? ` / ${managed.scenario}` : ''} · ${(managed.players || []).length} player(s) · ${(managed.spectators || []).length} spectator(s)`;
          card.appendChild(meta);
          const memberList = document.createElement('div');
          memberList.style.marginTop = '8px';
          for (const member of [...(managed.players || []), ...(managed.spectators || [])]) {
            const row = document.createElement('div');
            row.className = 'serverManagementMember';
            const label = document.createElement('span');
            label.className = 'serverManagementMemberName';
            label.textContent = `${member.name}${member.id === managed.hostId ? ' (host)' : ''} · ${member.role}${member.isAI ? ' · AI' : ''}${member.connected ? ' · online' : ' · disconnected'}`;
            const kick = document.createElement('button');
            kick.className = 'btn subtle';
            kick.textContent = 'Kick';
            kick.addEventListener('click', async () => {
              if (!window.confirm(`Remove ${member.name} from room ${managed.code}?`)) return;
              kick.disabled = true;
              try {
                const response = await adminApi('kick-room-member', { code: managed.code, userId: member.id });
                setError(response.message || 'Member removed.');
                await render();
              } catch (error) {
                kick.disabled = false;
                setError(error.message || 'Could not remove that member.');
              }
            });
            row.append(label, kick);
            memberList.appendChild(row);
          }
          card.appendChild(memberList);
          body.appendChild(card);
        }
      } catch (error) {
        body.replaceChildren(status);
        status.textContent = error.message || 'Could not load active rooms.';
      }
    };

    const serverManagementActions = [
        { label: 'Refresh', onClick: render },
        { label: 'Spectate Selected', onClick: () => {
          const codes = selectedCodes();
          if (!codes.length) { setError('Select at least one room.'); return; }
          for (const code of codes) window.open(buildSpectatorJoinUrl(code), '_blank', 'noopener');
        } },
        { label: 'Close Selected', onClick: async () => {
          const codes = selectedCodes();
          if (!codes.length) { setError('Select at least one room.'); return; }
          if (!window.confirm(`Close ${codes.length} selected room${codes.length === 1 ? '' : 's'}? Active games will end immediately.`)) return;
          try {
            const response = await adminApi('close-rooms', { codes });
            setError(response.message || 'Selected rooms closed.');
            await render();
          } catch (error) { setError(error.message || 'Could not close selected rooms.'); }
        } },
        { label: 'Close Console', primary: true, onClick: closeModal },
      ];
    if (container) {
      const toolbar = document.createElement('div');
      toolbar.className = 'adminActionBar';
      serverManagementActions.filter(action => action.label !== 'Close Console').forEach(action => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn'; button.textContent = action.label;
        button.addEventListener('click', () => action.onClick());
        toolbar.appendChild(button);
      });
      container.replaceChildren(toolbar, body);
    } else openModal({ title: 'Server Management', bodyNode: body, actions: serverManagementActions });
    await render();
  }

  async function openUserManagementScreen({ container = null, selfOnly = false, adminOnly = false, mergeOnly = false } = {}) {
    if (!authUser) {
      setError('Log in first.');
      return;
    }

    const shell = document.createElement('div');
    shell.className = 'userManagementPanel';
    const loading = document.createElement('div');
    loading.className = 'hint';
    loading.textContent = 'Loading account information…';
    shell.appendChild(loading);
    if (container) container.replaceChildren(shell);
    else openModal({
      title: adminOnly ? (mergeOnly ? 'Merge Accounts' : 'User Account Management') : 'Manage Account',
      bodyNode: shell,
      actions: [{ label: 'Close', onClick: closeModal }],
    });

    let result;
    try {
      result = await accountApi('users');
    } catch (error) {
      loading.className = 'userManagementError';
      loading.textContent = error.message || 'Could not load account information.';
      return;
    }

    const users = (Array.isArray(result.users) ? result.users : []).filter(user => adminOnly ? user.id !== result.currentUserId : (!selfOnly || user.id === result.currentUserId));
    const currentUserId = String(result.currentUserId || authUser.id || '');
    const adminView = typeof IS_ADMIN_PORTAL !== 'undefined' && IS_ADMIN_PORTAL && !!result.isAdmin && !selfOnly;
    const emailDeliveryConfigured = !!result.emailDeliveryConfigured;
    const emailDeliveryMode = String(result.emailDeliveryMode || 'none');
    const oauthAvailability = result.oauthAvailability || {};
    shell.innerHTML = '';

    const intro = document.createElement('div');
    intro.className = 'userManagementIntro';
    intro.textContent = adminView
      ? (mergeOnly ? 'Combine duplicate player accounts while retaining the chosen login username. This action cannot be undone.' : 'Manage registered player accounts, reset passwords, or remove accounts. Your administrator account is managed separately under Manage Account.')
      : 'Only your account is shown. Change your player name or password, and link a verified recovery email for password resets before login. Player names may be shared; usernames are unique.';
    shell.appendChild(intro);

    if (!emailDeliveryConfigured) {
      const warning = document.createElement('div');
      warning.className = 'userManagementWarning';
      warning.textContent = 'Email delivery is not configured on this server. Password changes still work, but recovery emails cannot be sent yet.';
      shell.appendChild(warning);
    } else if (emailDeliveryMode === 'resend') {
      const note = document.createElement('div');
      note.className = 'userManagementNotice';
      note.textContent = 'Verification and password-reset messages are sent through Resend.';
      shell.appendChild(note);
    } else if (emailDeliveryMode === 'cloudflare') {
      const note = document.createElement('div');
      note.className = 'userManagementNotice';
      note.textContent = 'Verification and password-reset messages are sent through this game’s Cloudflare Email Service.';
      shell.appendChild(note);
    } else if (emailDeliveryMode === 'direct') {
      const note = document.createElement('div');
      note.className = 'userManagementNotice';
      note.textContent = 'Email is sent directly by this game server. The hosting plan must permit outbound SMTP, and the sender domain needs valid mail DNS for reliable delivery.';
      shell.appendChild(note);
    }

    if (adminView && mergeOnly) {
      const mergeSection = document.createElement('div');
      mergeSection.className = 'userManagementSection';
      const mergeTitle = document.createElement('div');
      mergeTitle.className = 'userManagementSectionTitle';
      mergeTitle.textContent = 'Merge Duplicate Accounts';
      const candidates = users.filter((user) => !user.isAdmin);
      const first = document.createElement('select');
      const second = document.createElement('select');
      const keep = document.createElement('select');
      for (const select of [first, second]) {
        select.className = 'input';
        for (const user of candidates) {
          const option = document.createElement('option'); option.value = user.id; option.textContent = `${user.username} (${user.displayName || user.username})`; select.appendChild(option);
        }
      }
      if (second.options.length > 1) second.selectedIndex = 1;
      keep.className = 'input';
      const syncKeep = () => {
        keep.innerHTML = '';
        for (const id of [first.value, second.value]) {
          const user = candidates.find((candidate) => candidate.id === id);
          if (!user || Array.from(keep.options).some((option) => option.value === user.username)) continue;
          const option = document.createElement('option'); option.value = user.username; option.textContent = `Keep username: ${user.username}`; keep.appendChild(option);
        }
      };
      first.addEventListener('change', syncKeep); second.addEventListener('change', syncKeep); syncKeep();
      const mergeButton = document.createElement('button'); mergeButton.className = 'btn danger'; mergeButton.textContent = 'Merge Accounts';
      const mergeStatus = document.createElement('div'); mergeStatus.className = 'userManagementStatus';
      mergeButton.addEventListener('click', async () => {
        if (!first.value || !second.value || first.value === second.value) { mergeStatus.className = 'userManagementStatus error'; mergeStatus.textContent = 'Select two different accounts.'; return; }
        const kept = keep.value;
        if (!window.confirm(`Merge these accounts and keep the username ${kept}? This cannot be undone.`)) return;
        mergeButton.disabled = true;
        try {
          const response = await adminApi('merge-users', { firstUserId: first.value, secondUserId: second.value, keepUsername: kept });
          mergeStatus.className = 'userManagementStatus success'; mergeStatus.textContent = response.message || 'Accounts merged.';
          setTimeout(() => {
            if (container) {
              // A late response must not overwrite a different admin tab.
              if (container.closest('.adminDashboard')?.querySelector('.adminTabs .active')?.dataset.tab === (mergeOnly ? 'merge' : 'users')) {
                void openUserManagementScreen({ container, adminOnly, mergeOnly });
              }
            } else { forceCloseModal(); void openUserManagementScreen({ adminOnly, mergeOnly }); }
          }, 500);
        } catch (error) { mergeStatus.className = 'userManagementStatus error'; mergeStatus.textContent = error.message || 'Account merge failed.'; mergeButton.disabled = false; }
      });
      mergeSection.append(mergeTitle, first, second, keep, mergeButton, mergeStatus);
      shell.appendChild(mergeSection);
      return; // Account merging is its own tab; do not render normal user management here.
    }

    let search = null;
    if (adminView) {
      search = document.createElement('input');
      search.className = 'input userManagementSearch';
      search.type = 'search';
      search.placeholder = 'Search username or player name';
      shell.appendChild(search);
    }

    const count = document.createElement('div');
    count.className = 'labelTiny userManagementCount';
    shell.appendChild(count);

    const list = document.createElement('div');
    list.className = 'userManagementList';
    shell.appendChild(list);

    const makePasswordInput = (placeholder, autocomplete = 'new-password') => {
      const input = document.createElement('input');
      input.className = 'input userManagementPassword';
      input.type = 'password';
      input.autocomplete = autocomplete;
      input.placeholder = placeholder;
      return input;
    };

    const renderUsers = () => {
      const query = String(search && search.value || '').trim().toLowerCase();
      const filtered = users.filter((user) => {
        if (!query) return true;
        return String(user.username || '').toLowerCase().includes(query)
          || String(user.displayName || '').toLowerCase().includes(query);
      });
      count.textContent = adminView ? `${filtered.length} of ${users.length} users` : 'Your account';
      list.innerHTML = '';

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'hint';
        empty.textContent = 'No matching users.';
        list.appendChild(empty);
        return;
      }

      for (const user of filtered) {
        const isCurrentUser = String(user.id || '') === currentUserId;
        const row = document.createElement('div');
        row.className = 'userManagementRow' + (isCurrentUser ? ' self' : '');

        const identity = document.createElement('div');
        identity.className = 'userManagementIdentity';
        const title = document.createElement('div');
        title.className = 'userManagementTitle';
        const username = document.createElement('span');
        username.textContent = user.username || 'Unknown user';
        title.appendChild(username);
        if (adminView && user.isAdmin) {
          const badge = document.createElement('span');
          badge.className = 'userManagementBadge';
          badge.textContent = 'Admin';
          title.appendChild(badge);
        }
        if (isCurrentUser) {
          const badge = document.createElement('span');
          badge.className = 'userManagementBadge selfBadge';
          badge.textContent = 'You';
          title.appendChild(badge);
        }
        identity.appendChild(title);

        const playerName = document.createElement('div');
        playerName.className = 'userManagementPlayerName';
        playerName.textContent = `Player name: ${user.displayName || user.username || '—'}`;
        identity.appendChild(playerName);

        const emailLine = document.createElement('div');
        emailLine.className = 'userManagementEmailLine';
        if (isCurrentUser && user.email) {
          emailLine.textContent = `Recovery email: ${user.email}${user.emailVerified ? ' • Verified' : ' • Not verified'}`;
        } else if (user.hasEmail) {
          emailLine.textContent = `Recovery email: ${user.emailMasked || 'Linked'}`;
        } else {
          emailLine.textContent = 'Recovery email: Not linked';
        }
        identity.appendChild(emailLine);

        if (isCurrentUser && user.pendingEmail) {
          const pending = document.createElement('div');
          pending.className = 'userManagementPending';
          pending.textContent = `Verification pending: ${user.pendingEmail}`;
          identity.appendChild(pending);
        }

        const stats = user.stats || {};
        const meta = document.createElement('div');
        meta.className = 'userManagementMeta';
        meta.textContent = `Games ${Number(stats.gamesPlayed || 0)} • Wins ${Number(stats.wins || 0)} • Last login ${formatUserManagementDate(user.lastLoginAt)}`;
        identity.appendChild(meta);
        row.appendChild(identity);

        const controls = document.createElement('div');
        controls.className = 'userManagementControls';

        if (isCurrentUser) {
          const nameSection = document.createElement('div');
          nameSection.className = 'userManagementSection';
          const nameHeading = document.createElement('div');
          nameHeading.className = 'labelTiny';
          nameHeading.textContent = adminView ? 'Administrator Player Name' : 'Change Player Name';
          const nameInput = document.createElement('input');
          nameInput.className = 'input';
          nameInput.type = 'text';
          nameInput.maxLength = 20;
          nameInput.autocomplete = 'nickname';
          nameInput.value = user.displayName || user.username || '';
          nameInput.placeholder = 'Player name (1–20 characters)';
          const nameButton = document.createElement('button');
          nameButton.className = 'btn primary';
          nameButton.type = 'button';
          nameButton.textContent = 'Change Name';
          const nameStatus = document.createElement('div');
          nameStatus.className = 'userManagementStatus';
          const nameNote = document.createElement('div');
          nameNote.className = 'smallNote';
          nameNote.textContent = 'Player names do not need to be unique. Your login username will stay the same.';
          nameButton.addEventListener('click', async () => {
            const nextName = String(nameInput.value || '').trim();
            if (!nextName || nextName.length > 20) {
              nameStatus.className = 'userManagementStatus error';
              nameStatus.textContent = 'Enter a player name between 1 and 20 characters.';
              nameInput.focus();
              return;
            }
            nameButton.disabled = true;
            nameStatus.className = 'userManagementStatus';
            nameStatus.textContent = 'Changing name…';
            try {
              const response = await accountApi('change-name', { displayName: nextName });
              if (response.user) {
                Object.assign(user, response.user);
                setAuthState(response.user, null, { clearToken: true });
              }
              playerName.textContent = `Player name: ${user.displayName || user.username || '—'}`;
              nameStatus.className = 'userManagementStatus success';
              nameStatus.textContent = response.message || 'Player name changed.';
            } catch (error) {
              nameStatus.className = 'userManagementStatus error';
              nameStatus.textContent = error.message || 'Could not change player name.';
            } finally {
              nameButton.disabled = false;
            }
          });
          nameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); nameButton.click(); } });
          nameSection.append(nameHeading, nameInput, nameNote, nameButton, nameStatus);
          controls.appendChild(nameSection);

          const oauthSection = document.createElement('div');
          oauthSection.className = 'userManagementSection';
          const oauthHeading = document.createElement('div');
          oauthHeading.className = 'labelTiny';
          oauthHeading.textContent = 'Linked sign-in accounts';
          const oauthNote = document.createElement('div');
          oauthNote.className = 'smallNote';
          oauthNote.textContent = 'Sign in with any connected provider to use this same player profile, ratings, history, and friends. Provider email addresses are not added as recovery emails automatically.';
          oauthSection.append(oauthHeading, oauthNote);
          const linkedProviders = Array.isArray(user.oauthProviders) ? user.oauthProviders : [];
          const oauthStatus = document.createElement('div');
          oauthStatus.className = 'userManagementStatus';
          for (const [provider, label] of Object.entries(OAUTH_LABELS)) {
            const linked = linkedProviders.find(entry => entry.provider === provider);
            const line = document.createElement('div');
            line.className = 'oauthLinkedRow';
            const info = document.createElement('div');
            const heading = document.createElement('strong'); heading.textContent = label;
            const sub = document.createElement('span');
            sub.textContent = linked ? `Connected${linked.name ? ` · ${linked.name}` : ''}` : (oauthAvailability[provider] ? 'Not connected' : 'Not configured');
            info.append(heading, document.createElement('div'), sub);
            const buttons = document.createElement('div'); buttons.className = 'oauthLinkedActions';
            const action = document.createElement('button'); action.type = 'button'; action.className = linked ? 'btn subtle' : 'btn';
            action.textContent = linked ? 'Disconnect' : 'Connect';
            action.disabled = linked ? (!user.hasPassword && linkedProviders.length < 2) : !oauthAvailability[provider];
            action.title = action.disabled && linked ? 'Keep at least one sign-in method connected.' : '';
            if (linked) {
              action.addEventListener('click', async () => {
                if (!window.confirm(`Disconnect ${label} from your player account?`)) return;
                action.disabled = true;
                try {
                  const response = await accountApi('unlink-oauth', { provider });
                  if (response.user) {
                    Object.assign(user, response.user);
                    setAuthState(response.user, null, { clearToken: true });
                  }
                  oauthStatus.className = 'userManagementStatus success';
                  oauthStatus.textContent = response.message || 'Provider disconnected.';
                  void openUserManagementScreen({ container, selfOnly, adminOnly, mergeOnly });
                } catch (error) {
                  oauthStatus.className = 'userManagementStatus error';
                  oauthStatus.textContent = error.message || 'Could not disconnect provider.';
                  action.disabled = false;
                }
              });
            } else action.addEventListener('click', () => startOAuthProvider(provider, 'link'));
            buttons.appendChild(action);
            line.append(info, buttons);
            oauthSection.appendChild(line);
          }
          oauthSection.appendChild(oauthStatus);
          controls.appendChild(oauthSection);

          const passwordSection = document.createElement('div');
          passwordSection.className = 'userManagementSection';
          const passwordHeading = document.createElement('div');
          passwordHeading.className = 'labelTiny';
          passwordHeading.textContent = 'Change Password';
          passwordSection.appendChild(passwordHeading);

          const currentPassword = makePasswordInput('Current password', 'current-password');
          const newPassword = makePasswordInput('New password (6+ characters)');
          const confirmPassword = makePasswordInput('Confirm new password');
          passwordSection.append(currentPassword, newPassword, confirmPassword);

          const changePassword = document.createElement('button');
          changePassword.className = 'btn primary';
          changePassword.type = 'button';
          changePassword.textContent = 'Change Password';
          passwordSection.appendChild(changePassword);

          const passwordStatus = document.createElement('div');
          passwordStatus.className = 'userManagementStatus';
          passwordSection.appendChild(passwordStatus);

          changePassword.addEventListener('click', async () => {
            const currentValue = String(currentPassword.value || '');
            const nextValue = String(newPassword.value || '');
            if (!currentValue) {
              passwordStatus.className = 'userManagementStatus error';
              passwordStatus.textContent = 'Enter your current password.';
              currentPassword.focus();
              return;
            }
            if (nextValue.length < 6) {
              passwordStatus.className = 'userManagementStatus error';
              passwordStatus.textContent = 'New password must be at least 6 characters.';
              newPassword.focus();
              return;
            }
            if (nextValue !== String(confirmPassword.value || '')) {
              passwordStatus.className = 'userManagementStatus error';
              passwordStatus.textContent = 'The new passwords do not match.';
              confirmPassword.focus();
              return;
            }
            changePassword.disabled = true;
            passwordStatus.className = 'userManagementStatus';
            passwordStatus.textContent = 'Changing password…';
            try {
              const response = await accountApi('change-password', {
                currentPassword: currentValue,
                newPassword: nextValue,
              });
              if (response.user) setAuthState(response.user, null, { clearToken: true });
              currentPassword.value = '';
              newPassword.value = '';
              confirmPassword.value = '';
              passwordStatus.className = 'userManagementStatus success';
              passwordStatus.textContent = response.message || 'Password changed.';
            } catch (error) {
              passwordStatus.className = 'userManagementStatus error';
              passwordStatus.textContent = error.message || 'Password change failed.';
            } finally {
              changePassword.disabled = false;
            }
          });
          if (user.hasPassword !== false) controls.appendChild(passwordSection);
          else {
            const note = document.createElement('div'); note.className = 'smallNote';
            note.textContent = 'Provider sign-in is active. To switch to email/password, enter your email and create a password below. OAuth stays connected until you verify the email.';
            controls.appendChild(note);
          }

          const emailSection = document.createElement('div');
          emailSection.className = 'userManagementSection';
          const emailHeading = document.createElement('div');
          emailHeading.className = 'labelTiny';
          emailHeading.textContent = (user.oauthProviders || []).length ? 'Switch to Email & Password' : 'Recovery Email';
          emailSection.appendChild(emailHeading);

          const emailInput = document.createElement('input');
          emailInput.className = 'input';
          emailInput.type = 'email';
          emailInput.autocomplete = 'email';
          emailInput.placeholder = 'you@example.com';
          emailInput.value = user.pendingEmail || user.email || '';
          emailInput.disabled = !emailDeliveryConfigured;
          emailSection.appendChild(emailInput);

          const emailPassword = makePasswordInput(user.hasPassword ? 'Current password' : 'Create password (6+ characters)', user.hasPassword ? 'current-password' : 'new-password');
          emailPassword.disabled = !emailDeliveryConfigured;
          emailSection.appendChild(emailPassword);
          let emailPasswordConfirm = null;
          if (!user.hasPassword) {
            emailPasswordConfirm = makePasswordInput('Confirm new password', 'new-password');
            emailPasswordConfirm.disabled = !emailDeliveryConfigured;
            emailSection.appendChild(emailPasswordConfirm);
          }
          if ((user.oauthProviders || []).length) {
            const info = document.createElement('p');
            info.className = 'smallNote';
            info.textContent = 'After you confirm the verification email, all OAuth providers will disconnect. Your username, stats, ratings, friends, and game history stay with this account. You will sign in with email (or username) and password.';
            emailSection.appendChild(info);
          }

          const emailButtons = document.createElement('div');
          emailButtons.className = 'row userManagementEmailButtons';
          const verifyEmail = document.createElement('button');
          verifyEmail.className = 'btn';
          verifyEmail.type = 'button';
          verifyEmail.textContent = (user.oauthProviders || []).length ? 'Verify & Switch to Email Login' : (user.pendingEmail ? 'Resend Verification' : (user.hasEmail ? 'Change Email' : 'Link Email'));
          verifyEmail.disabled = !emailDeliveryConfigured;
          emailButtons.appendChild(verifyEmail);

          let removeEmail = null;
          if (user.hasEmail || user.pendingEmail) {
            removeEmail = document.createElement('button');
            removeEmail.className = 'btn danger';
            removeEmail.type = 'button';
            removeEmail.textContent = 'Remove Email';
            emailButtons.appendChild(removeEmail);
          }
          emailSection.appendChild(emailButtons);

          const emailStatus = document.createElement('div');
          emailStatus.className = 'userManagementStatus';
          emailSection.appendChild(emailStatus);

          verifyEmail.addEventListener('click', async () => {
            const email = String(emailInput.value || '').trim();
            const currentValue = String(emailPassword.value || '');
            if (!email) {
              emailStatus.className = 'userManagementStatus error';
              emailStatus.textContent = 'Enter an email address.';
              emailInput.focus();
              return;
            }
            if (!currentValue) {
              emailStatus.className = 'userManagementStatus error';
              emailStatus.textContent = user.hasPassword ? 'Enter your current password.' : 'Create a password (6+ characters).';
              emailPassword.focus();
              return;
            }
            if (emailPasswordConfirm && (currentValue.length < 6 || currentValue !== emailPasswordConfirm.value)) {
              emailStatus.className = 'userManagementStatus error';
              emailStatus.textContent = currentValue.length < 6 ? 'Password must be at least 6 characters.' : 'Passwords do not match.';
              return;
            }
            verifyEmail.disabled = true;
            emailStatus.className = 'userManagementStatus';
            emailStatus.textContent = 'Sending verification email…';
            try {
              const response = await accountApi('request-email-link', { email, ...(user.hasPassword ? { currentPassword: currentValue } : { newPassword: currentValue }) });
              if (response.user) {
                Object.assign(user, response.user);
                setAuthState(response.user, null, { clearToken: true });
              }
              emailPassword.value = '';
              if (emailPasswordConfirm) emailPasswordConfirm.value = '';
              emailStatus.className = 'userManagementStatus success';
              emailStatus.textContent = response.message || 'Verification email sent.';
              setTimeout(renderUsers, 600);
            } catch (error) {
              emailStatus.className = 'userManagementStatus error';
              emailStatus.textContent = error.message || 'Could not send verification email.';
            } finally {
              verifyEmail.disabled = !emailDeliveryConfigured;
            }
          });

          if (removeEmail) {
            removeEmail.addEventListener('click', async () => {
              const currentValue = String(emailPassword.value || '');
              if (!currentValue) {
                emailStatus.className = 'userManagementStatus error';
                emailStatus.textContent = 'Enter your current password before removing the email.';
                emailPassword.focus();
                return;
              }
              if (!window.confirm('Remove the recovery email from your account? Email password recovery will stop working.')) return;
              removeEmail.disabled = true;
              emailStatus.className = 'userManagementStatus';
              emailStatus.textContent = 'Removing email…';
              try {
                const response = await accountApi('remove-email', { currentPassword: currentValue });
                if (response.user) {
                  Object.assign(user, response.user);
                  setAuthState(response.user, null, { clearToken: true });
                }
                emailPassword.value = '';
                emailStatus.className = 'userManagementStatus success';
                emailStatus.textContent = response.message || 'Recovery email removed.';
                setTimeout(renderUsers, 500);
              } catch (error) {
                emailStatus.className = 'userManagementStatus error';
                emailStatus.textContent = error.message || 'Could not remove recovery email.';
              } finally {
                removeEmail.disabled = false;
              }
            });
          }
          controls.appendChild(emailSection);
        } else if (adminView) {
          const adminSection = document.createElement('div');
          adminSection.className = 'userManagementSection';
          const adminHeading = document.createElement('div');
          adminHeading.className = 'labelTiny';
          adminHeading.textContent = 'Administrator Password Reset';
          adminSection.appendChild(adminHeading);

          const password = makePasswordInput('New password (6+ characters)');
          adminSection.appendChild(password);
          const reset = document.createElement('button');
          reset.className = 'btn danger';
          reset.type = 'button';
          reset.textContent = 'Reset Password';
          adminSection.appendChild(reset);
          const status = document.createElement('div');
          status.className = 'userManagementStatus';
          adminSection.appendChild(status);

          reset.addEventListener('click', async () => {
            const nextPassword = String(password.value || '');
            if (nextPassword.length < 6) {
              status.className = 'userManagementStatus error';
              status.textContent = 'Password must be at least 6 characters.';
              password.focus();
              return;
            }
            const confirmed = window.confirm(`Reset the password for ${user.username}? Their existing sessions will be signed out.`);
            if (!confirmed) return;
            reset.disabled = true;
            password.disabled = true;
            status.className = 'userManagementStatus';
            status.textContent = 'Resetting…';
            try {
              const response = await adminApi('reset-password', { userId: user.id, newPassword: nextPassword });
              password.value = '';
              status.className = 'userManagementStatus success';
              status.textContent = response.message || 'Password reset. Existing sessions were signed out.';
            } catch (error) {
              status.className = 'userManagementStatus error';
              status.textContent = error.message || 'Password reset failed.';
            } finally {
              reset.disabled = false;
              password.disabled = false;
            }
          });
          controls.appendChild(adminSection);

          if (!user.isAdmin) {
            const dangerSection = document.createElement('div');
            dangerSection.className = 'userManagementSection';
            const dangerHeading = document.createElement('div');
            dangerHeading.className = 'labelTiny';
            dangerHeading.textContent = 'Delete Account';
            dangerSection.appendChild(dangerHeading);

            const deleteNote = document.createElement('div');
            deleteNote.className = 'smallNote';
            deleteNote.textContent = 'Permanently removes the login, linked email, password, and active sessions. Historical game records remain intact.';
            dangerSection.appendChild(deleteNote);

            const deleteUser = document.createElement('button');
            deleteUser.className = 'btn danger';
            deleteUser.type = 'button';
            deleteUser.textContent = 'Delete User Account';
            dangerSection.appendChild(deleteUser);

            const deleteStatus = document.createElement('div');
            deleteStatus.className = 'userManagementStatus';
            dangerSection.appendChild(deleteStatus);

            deleteUser.addEventListener('click', async () => {
              const confirmation = window.prompt(`Permanently delete ${user.username}? Type the username to confirm.`);
              if (confirmation === null) return;
              if (String(confirmation).trim().toLowerCase() !== String(user.username || '').trim().toLowerCase()) {
                deleteStatus.className = 'userManagementStatus error';
                deleteStatus.textContent = 'Username did not match. Account was not deleted.';
                return;
              }
              deleteUser.disabled = true;
              reset.disabled = true;
              password.disabled = true;
              deleteStatus.className = 'userManagementStatus';
              deleteStatus.textContent = 'Deleting account…';
              try {
                const response = await adminApi('delete-user', { userId: user.id });
                const index = users.findIndex((candidate) => candidate && candidate.id === user.id);
                if (index >= 0) users.splice(index, 1);
                renderUsers();
                setError(response.message || `Deleted ${user.username}.`);
              } catch (error) {
                deleteStatus.className = 'userManagementStatus error';
                deleteStatus.textContent = error.message || 'Account deletion failed.';
                deleteUser.disabled = false;
                reset.disabled = false;
                password.disabled = false;
              }
            });
            controls.appendChild(dangerSection);
          }
        }

        row.appendChild(controls);
        list.appendChild(row);
      }
    };

    if (search) search.addEventListener('input', renderUsers);
    renderUsers();
  }


  function adminElement(tag, className = '', content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }

  async function renderAdminHistoryManagement(container) {
    container.replaceChildren();
    const intro = adminElement('p', 'smallNote', 'Manage completed game archives, including full replays. Deleting or importing history refreshes game statistics but does not silently change ranked ratings. Export a backup before editing.');
    const toolbar = adminElement('div', 'adminActionBar');
    const listing = adminElement('div', 'adminHistoryList');
    const info = adminElement('div', 'adminInlineStatus', 'Loading game history…');
    const selection = new Set();
    let games = [];
    let page = 0;
    const pageSize = 75;
    const search = adminElement('input', 'input');
    search.type = 'search'; search.placeholder = 'Filter by player, room, winner or map';
    const paging = adminElement('div', 'adminActionBar');
    const file = document.createElement('input');
    file.type = 'file'; file.accept = '.json,application/json'; file.className = 'hidden';
    const makeButton = (label, handler, danger = false) => {
      const button = adminElement('button', `btn${danger ? ' danger' : ''}`, label);
      button.type = 'button'; button.addEventListener('click', handler);
      toolbar.appendChild(button);
      return button;
    };
    const filteredGames = () => {
      const query = search.value.trim().toLowerCase();
      return games.filter(game => !query || [game.roomCode, game.winnerName, game.mapMode,
        ...(game.players || []).map(p => p.name), JSON.stringify(game.rules || {})].join(' ').toLowerCase().includes(query));
    };
    function renderGames() {
      listing.replaceChildren();
      paging.replaceChildren();
      const filtered = filteredGames();
      const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
      page = Math.min(page, maxPage);
      info.textContent = `${games.length} archived games · ${filtered.length} shown by filter · ${selection.size} selected`;
      const current = filtered.slice(page * pageSize, (page + 1) * pageSize);
      if (!current.length) listing.appendChild(adminElement('p', 'hint', 'No matching game history.'));
      for (const game of current) {
        const label = adminElement('label', 'adminHistoryItem');
        const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = selection.has(game.id);
        input.addEventListener('change', () => {
          if (input.checked) selection.add(game.id); else selection.delete(game.id);
          info.textContent = `${games.length} archived games · ${filtered.length} shown by filter · ${selection.size} selected`;
        });
        const text = adminElement('span', '', `${new Date(Number(game.endedAt || Date.now())).toLocaleString()} · ${game.roomCode} · ${game.ranked ? 'Ranked' : game.casual ? 'Casual' : 'Unranked'} · ${game.winnerName || 'Unknown winner'} · ${(game.players || []).map(p => p.name).join(', ')}`);
        label.append(input, text); listing.appendChild(label);
      }
      const previous = adminElement('button', 'btn', 'Previous');
      previous.disabled = page <= 0; previous.addEventListener('click', () => { page--; renderGames(); });
      const next = adminElement('button', 'btn', 'Next');
      next.disabled = page >= maxPage; next.addEventListener('click', () => { page++; renderGames(); });
      const label = adminElement('span', 'smallNote', `Page ${page + 1} of ${maxPage + 1}`);
      paging.append(previous, label, next);
    }
    async function refresh() {
      info.textContent = 'Loading game history…';
      try {
        const result = await adminApi('history-list');
        games = result.games || [];
        for (const id of selection) if (!games.some(game => game.id === id)) selection.delete(id);
        renderGames();
      } catch (error) { info.textContent = error.message; }
    }
    makeButton('Refresh', refresh);
    makeButton('Select filtered', () => { filteredGames().forEach(game => selection.add(game.id)); renderGames(); });
    makeButton('Clear selection', () => { selection.clear(); renderGames(); });
    makeButton('Download Full History', async () => {
      info.textContent = 'Preparing full replay archive…';
      try {
        const result = await adminApi('history-export');
        saveBrowserJson(`hex-settlers-game-history-${new Date().toISOString().slice(0, 10)}.json`, result.archive);
        info.textContent = `Downloaded ${result.archive.games.length} archived game(s), including their replays.`;
      } catch (error) { info.textContent = error.message; }
    });
    makeButton('Upload History', () => file.click());
    file.addEventListener('change', async () => {
      const upload = file.files?.[0]; file.value = '';
      if (!upload) return;
      if (upload.size > 64 * 1024 * 1024) { info.textContent = 'History backup exceeds the 64 MB upload limit.'; return; }
      try {
        const archive = JSON.parse(await upload.text());
        if (archive?.format !== 'hex-settlers-history-v1' || !Array.isArray(archive.games)) throw new Error('Choose a full history backup exported from Admin Management.');
        if (!window.confirm(`Merge ${archive.games.length} game(s) into server history? Existing IDs will be skipped, not overwritten. This will create a server backup.`)) return;
        info.textContent = 'Validating and importing history…';
        const result = await adminApi('history-import', { archive });
        info.textContent = result.message; await refresh();
      } catch (error) { info.textContent = error.message || 'Upload failed.'; }
    });
    makeButton('Delete Selected', async () => {
      const ids = [...selection];
      if (!ids.length) { info.textContent = 'Select games to delete.'; return; }
      const typed = window.prompt(`Delete ${ids.length} game(s)? Type DELETE SELECTED to confirm.`);
      if (typed !== 'DELETE SELECTED' || !window.confirm('Last check: permanently remove these selected games from server history? A server backup will be created.')) return;
      try {
        const result = await adminApi('history-delete', { ids, confirm: typed, acknowledgePermanent: true });
        selection.clear(); await refresh(); info.textContent = result.message;
      } catch (error) { info.textContent = error.message; }
    }, true);
    const danger = adminElement('section', 'adminDangerPanel');
    danger.appendChild(adminElement('h3', '', 'Full game-history reset'));
    danger.appendChild(adminElement('p', 'smallNote', 'Deletes all completed game records and server replay data. All three confirmations, a typed phrase, and a final prompt are required. A server-side backup is written first. This cannot recreate games already pruned from history.'));
    const checks = [
      '1. I understand every archived game and replay will be removed from server history.',
      '2. I understand player game statistics will be recalculated and ratings will remain unchanged.',
      '3. I explicitly authorize a full reset of the game-history database.',
    ].map(message => {
      const label = adminElement('label', 'adminHistoryConfirm');
      const input = document.createElement('input'); input.type = 'checkbox';
      label.append(input, adminElement('span', '', message)); danger.appendChild(label);
      return input;
    });
    const phrase = adminElement('input', 'input');
    phrase.placeholder = 'Type DELETE ALL GAME HISTORY';
    phrase.autocomplete = 'off';
    const reset = adminElement('button', 'btn danger', 'Reset All Game History');
    const updateReset = () => { reset.disabled = !checks.every(input => input.checked) || phrase.value !== 'DELETE ALL GAME HISTORY'; };
    checks.forEach(input => input.addEventListener('change', updateReset));
    phrase.addEventListener('input', updateReset); updateReset();
    reset.addEventListener('click', async () => {
      if (reset.disabled || !window.confirm('FINAL confirmation: delete ALL recorded games and replays from the server history?')) return;
      reset.disabled = true;
      try {
        const challenge = await adminApi('history-reset-challenge');
        const result = await adminApi('history-reset', { challenge: challenge.challenge, confirm: phrase.value, check1: checks[0].checked, check2: checks[1].checked, check3: checks[2].checked });
        phrase.value = ''; checks.forEach(input => { input.checked = false; });
        selection.clear(); updateReset(); await refresh(); info.textContent = result.message;
      } catch (error) { info.textContent = error.message; updateReset(); }
    });
    danger.append(phrase, reset);
    search.addEventListener('input', () => { page = 0; renderGames(); });
    container.append(intro, toolbar, file, info, search, listing, paging, danger);
    await refresh();
  }

  function renderAdminHealthMonitor(container) {
    container.replaceChildren();
    const intro = adminElement('p', 'smallNote', 'Live diagnostics reported by this Node game-server instance. CPU % is measured over the previous sample (100% = one logical CPU); host-wide usage is not available to this process. Refreshes every 5 seconds while this tab is open.');
    const summary = adminElement('div', 'adminHealthGrid');
    const details = adminElement('div', 'adminHealthDetails');
    const status = adminElement('div', 'smallNote', 'Connecting to server diagnostics…');
    const refreshButton = adminElement('button', 'btn', 'Refresh Diagnostics');
    container.append(intro, refreshButton, status, summary, details);
    const fmtBytes = number => `${(Number(number || 0) / 1048576).toFixed(1)} MB`;
    let busy = false;
    async function refresh() {
      if (busy || !container.isConnected) return;
      busy = true;
      try {
        const d = await adminApi('health');
        if (!container.isConnected) return;
        status.textContent = `Updated ${new Date(d.sampledAt).toLocaleTimeString()} · Build ${d.build} · Instance ${d.instanceId}`;
        summary.replaceChildren(); details.replaceChildren();
        const metrics = [
          ['Server CPU', `${d.cpu.percentOneCore.toFixed(1)}% of one core`],
          ['CPU capacity', `${d.cpu.percentTotalCapacity.toFixed(1)}% (${d.cpu.logicalCores} logical cores)`],
          ['Process memory', fmtBytes(d.memory.rssBytes)],
          ['JS heap', `${fmtBytes(d.memory.heapUsedBytes)} / ${fmtBytes(d.memory.heapTotalBytes)}`],
          ['Event-loop p99', `${d.eventLoop.p99DelayMs} ms`],
          ['Event-loop max', `${d.eventLoop.maxDelayMs} ms`],
          ['Server uptime', `${Math.floor(d.uptimeSeconds / 3600)}h ${Math.floor(d.uptimeSeconds % 3600 / 60)}m`],
          ['Open WebSockets', String(d.connections.webSocketClients)],
          ['Online accounts', String(d.connections.authenticatedUsers)],
          ['Ranked queue', `${d.connections.queuedPlayers} players / ${d.connections.rankedQueueGroups} groups`],
          ['Rooms', `${d.rooms.total} total · ${d.rooms.waiting} waiting`],
          ['Games', `${d.rooms.activeGames} active · ${d.rooms.pausedGames} paused`],
          ['Room types', `${d.rooms.casual} casual · ${d.rooms.ranked} ranked`],
          ['History', `${d.persistence.historyGames} / ${d.persistence.historyLimit}`],
          ['Data directory', d.persistence.writable ? 'Writable' : 'NOT WRITABLE'],
          ['Email', d.email.configured ? `Configured (${d.email.provider})` : 'Not configured'],
        ];
        for (const [name, value] of metrics) {
          const card = adminElement('div', 'adminHealthMetric');
          card.append(adminElement('div', 'labelTiny', name), adminElement('strong', '', value)); summary.appendChild(card);
        }
        details.appendChild(adminElement('h3', '', 'Persisted data & storage diagnostics'));
        for (const file of d.persistence.files) {
          details.appendChild(adminElement('div', 'adminHealthFile', `${file.name} · ${file.exists ? `${fmtBytes(file.bytes)} · saved ${new Date(file.updatedAt).toLocaleString()}` : 'Not created yet'}`));
        }
        details.appendChild(adminElement('p', 'smallNote', 'Event-loop latency is sampled since server start. Persisted files show last save times, not a transaction integrity check. Diagnostics are local to this server process.'));
      } catch (error) { status.textContent = `Diagnostics unavailable: ${error.message}`; }
      finally { busy = false; }
    }
    refreshButton.addEventListener('click', refresh);
    void refresh();
    const interval = setInterval(() => {
      if (!container.isConnected || !container.closest('.adminDashboard')?.querySelector('.adminTabs .active[data-tab="health"]')) clearInterval(interval);
      else void refresh();
    }, 5000);
  }

  // --- Administrator game analytics: live occupancy + durable time series. ---
  function statsSvg(tag, attrs = {}, text = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== '') node.textContent = text;
    return node;
  }
  function renderGameStatsChart(host, title, data, metrics, { dateAxis = false } = {}) {
    host.replaceChildren();
    const panel = adminElement('section', 'adminStatsChartPanel');
    panel.appendChild(adminElement('h3', '', title));
    const legend = adminElement('div', 'adminStatsLegend');
    for (const metric of metrics) {
      const item = adminElement('span', '', metric.label);
      item.style.setProperty('--metric-color', metric.color);
      legend.appendChild(item);
    }
    panel.appendChild(legend);
    if (data.length < 2) {
      panel.appendChild(adminElement('p', 'smallNote', 'Not enough data yet. Historical activity accumulates automatically after deployment.'));
      host.appendChild(panel); return;
    }
    const svg = statsSvg('svg', { viewBox:'0 0 780 250', role:'img',
      'aria-label': title + ', showing ' + metrics.map(m => m.label).join(', '), preserveAspectRatio:'none' });
    const WIDTH = 780, HEIGHT = 250, L = 43, R = 14, T = 12, B = 36;
    const xStart = L, xSpan = WIDTH - L - R, ySpan = HEIGHT - T - B;
    const values = data.flatMap(row => metrics.map(metric => Number(row[metric.key]) || 0));
    const maxValue = Math.max(1, ...values);
    const maxY = maxValue <= 5 ? Math.ceil(maxValue) : Math.ceil(maxValue / 5) * 5;
    for (let i = 0; i <= 4; i++) {
      const y = T + i * ySpan / 4;
      svg.appendChild(statsSvg('line', { x1:L, x2:WIDTH-R, y1:y, y2:y, stroke:'rgba(169,190,209,.19)' }));
      svg.appendChild(statsSvg('text', { x:L-8, y:y+4, fill:'#9cb3c7', 'font-size':12, 'text-anchor':'end' }, String(Math.round(maxY*(4-i)/4))));
    }
    const xOf = i => xStart + (data.length === 1 ? 0 : i*xSpan/(data.length-1));
    const yOf = v => T + ySpan - Math.max(0,Number(v)||0)/maxY*ySpan;
    for (let i = 0; i < 5; i++) {
      const n = Math.min(data.length-1, Math.round(i * (data.length-1)/4));
      const value = data[n];
      const label = dateAxis ? String(value.day || '').slice(5) : new Date(value.at).toLocaleString(undefined, {
        timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit',
      });
      svg.appendChild(statsSvg('text', { x:xOf(n), y:HEIGHT-12, fill:'#aabed0',
        'font-size':11, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle' }, label));
    }
    for (const metric of metrics) {
      const d = data.map((row,i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(2)},${yOf(row[metric.key]).toFixed(2)}`).join(' ');
      svg.appendChild(statsSvg('path', { d, fill:'none', stroke:metric.color, 'stroke-width':2.5,
        'stroke-linecap':'round', 'stroke-linejoin':'round', 'vector-effect':'non-scaling-stroke' }));
      if (data.length <= 40) for (let i = 0; i < data.length; i++) {
        const point = statsSvg('circle', { cx:xOf(i), cy:yOf(data[i][metric.key]), r:3.5, fill:metric.color });
        point.appendChild(statsSvg('title', {}, `${metric.label}: ${data[i][metric.key]} (${dateAxis ? data[i].day : new Date(data[i].at).toLocaleString()})`));
        svg.appendChild(point);
      }
    }
    panel.appendChild(svg); host.appendChild(panel);
  }

  function renderAdminGameStats(container) {
    container.replaceChildren();
    const shell = adminElement('div', 'adminStats');
    const top = adminElement('div', 'adminStatsTop');
    const title = adminElement('div', 'adminStatsHeading');
    title.append(adminElement('h2', '', 'Game Stats'),
      adminElement('p', 'smallNote', 'Live players, lobby health, and game activity over time. All times displayed in Central Time.'));
    const buttons = adminElement('div', 'adminStatsControls');
    const period = document.createElement('select');
    period.className = 'input'; period.setAttribute('aria-label', 'Game analytics time range');
    for (const [key,label] of [['day','Last 24 hours'],['week','Last 7 days'],['month','Last 30 days'],['quarter','Last 90 days']]) {
      const option = document.createElement('option'); option.value = key; option.textContent = label; period.appendChild(option);
    }
    const refreshButton = adminElement('button', 'btn', 'Refresh now'); refreshButton.type = 'button';
    buttons.append(period, refreshButton); top.append(title, buttons);
    const status = adminElement('div', 'adminStatsStatus', 'Loading analytics…'); status.setAttribute('role', 'status');
    const liveTitle = adminElement('h3', 'adminStatsSectionTitle', 'Right now');
    const liveMetrics = adminElement('div', 'adminStatsMetrics');
    const periodTitle = adminElement('h3', 'adminStatsSectionTitle', 'Selected period');
    const rangeMetrics = adminElement('div', 'adminStatsMetrics');
    const charts = adminElement('div', 'adminStatsCharts');
    const breakdown = adminElement('div', 'adminStatsBreakdown');
    const lobbySection = adminElement('section', 'adminStatsLobbySection');
    const foot = adminElement('div', 'adminStatsFoot');
    shell.append(top,status,liveTitle,liveMetrics,periodTitle,rangeMetrics,charts,breakdown,lobbySection,foot);
    container.appendChild(shell);
    const fmt = value => Number(value || 0).toLocaleString();
    const metricCard = (name, value, subtitle) => {
      const card = adminElement('div', 'adminStatsMetric');
      card.append(adminElement('div', 'adminStatsMetricLabel', name),adminElement('strong', '', String(value)));
      if (subtitle) card.append(adminElement('small', '', subtitle));
      return card;
    };
    let busy = false;
    let generation = 0;
    let pendingRefresh = false;
    let visible = true;
    const isOpen = () => visible && container.isConnected &&
      !!container.closest('.adminDashboard')?.querySelector('.adminTabs [data-tab="stats"].active');
    async function refresh() {
      if (!isOpen()) return;
      if (busy) { pendingRefresh = true; return; }
      busy = true; const request = ++generation;
      refreshButton.disabled = true;
      try {
        const data = await adminApi('game-stats', { range:period.value });
        if (!isOpen() || request !== generation) return;
        const live = data.live || {}, history = data.history || {}, peaks = data.peaks || {};
        const time = new Date(data.sampledAt).toLocaleString(undefined, {timeZone:'America/Chicago'});
        status.textContent = `Updated ${time} CT · ${data.series.length-1} historical readings · Collecting since ${new Date(data.startedCollectingAt).toLocaleString()}`;
        liveMetrics.replaceChildren(); rangeMetrics.replaceChildren(); charts.replaceChildren(); breakdown.replaceChildren(); lobbySection.replaceChildren(); foot.replaceChildren();
        for (const [label,value,hint] of [
          ['Online accounts', fmt(live.onlineAccounts), 'Unique authenticated accounts'],
          ['WebSocket connections', fmt(live.webSockets), 'Includes multiple tabs'],
          ['Playing humans', fmt(live.playingHumans), 'Connected, distinct player accounts'],
          ['Spectators', fmt(live.spectators), 'Connected viewers in rooms'],
          ['AI seats', fmt(live.aiSeats), 'Computer-controlled seats'],
          ['Active games', fmt(live.activeGames), 'Currently in progress'],
          ['Waiting lobbies', fmt(live.waitingLobbies), 'Awaiting game start'],
          ['Paused games', fmt(live.pausedGames), 'Still counted as active'],
          ['Ranked queue', fmt(live.rankedQueue), 'Players waiting for matchmaking'],
          ['Public / private', `${fmt(live.publicLobbies)} / ${fmt(live.privateLobbies)}`, 'All retained rooms'],
        ]) liveMetrics.appendChild(metricCard(label,value,hint));
        for (const [label,value,hint] of [
          ['Unique active accounts', fmt(data.uniqueAccounts), 'Logged in during the selected period'],
          ['Peak online accounts', fmt(peaks.onlineAccounts), 'Highest sampled concurrency'],
          ['Peak active games', fmt(peaks.activeGames), 'Highest sampled concurrent games'],
          ['Completed games', fmt(history.completed), 'From retained game history'],
          ['Game participants', fmt(history.uniqueParticipants), 'Distinct archived participant IDs'],
          ['Average game length', history.averageMinutes === null ? '—' : `${history.averageMinutes} min`, 'Completed games only'],
          ['Average turns', history.averageTurns === null ? '—' : String(history.averageTurns), 'Completed games only'],
          ['Total VP scored', fmt(history.totalVictoryPoints), 'Completed games only'],
          ['New accounts', fmt(data.newAccounts), `${fmt(data.registeredAccounts)} registered total`],
        ]) rangeMetrics.appendChild(metricCard(label,value,hint));
        const m = (key,label,color) => ({key,label,color});
        const connected = adminElement('div', 'adminStatsChartGrid');
        renderGameStatsChart(connected, 'Concurrent users and occupied seats', data.series || [], [
          m('onlineAccounts','Online accounts','#71bbff'),m('playingHumans','Active players','#f3be65'),
          m('spectators','Spectators','#bf91fd'),m('aiSeats','AI seats','#70dbaf'),
        ]);
        renderGameStatsChart(connected, 'Live games, waiting lobbies and queue', data.series || [], [
          m('activeGames','Active games','#f0ba62'),m('waitingLobbies','Waiting lobbies','#77c8fb'),
          m('pausedGames','Paused','#ec8885'),m('rankedQueue','Ranked queue','#c89cff'),
        ]);
        renderGameStatsChart(connected, 'Daily active users, registrations and wins', data.daily || [], [
          m('activeUsers','Active accounts','#71bbff'),m('completedGames','Completed games','#f3be65'),
          m('newAccounts','New accounts','#70dbaf'),
        ], {dateAxis:true});
        renderGameStatsChart(connected, 'Live rooms by game mode', data.series || [], [
          m('rankedRooms','Ranked','#f2b45e'),m('unrankedRooms','Unranked','#71bbff'),
          m('casualRooms','Casual','#6edaab'),m('dailyRooms','Dailies','#e58b94'),
          m('weeklyRooms','Weeklys','#c599ff'),
        ]);
        charts.appendChild(connected);
        const byMode = adminElement('section', 'adminStatsBreakdownPanel');
        byMode.appendChild(adminElement('h3', '', 'Game modes: live rooms vs. completed games'));
        const tbl = document.createElement('table'); tbl.className = 'adminStatsTable';
        const header = document.createElement('tr');
        for (const cell of ['Mode','Live rooms','Completed games']) header.appendChild(adminElement('th','',cell));
        tbl.appendChild(header);
        for (const [label, liveKey, archiveKey] of [
          ['Ranked','rankedRooms','ranked'],['Unranked','unrankedRooms','unranked'],
          ['Casual','casualRooms','casual'],['Daily challenge','dailyRooms','daily'],['Weekly challenge','weeklyRooms','weekly'],
        ]) { const tr = document.createElement('tr'); for (const value of [label,fmt(live[liveKey]),fmt(history.byMode?.[archiveKey])]) tr.appendChild(adminElement('td','',value)); tbl.appendChild(tr); }
        byMode.appendChild(tbl); breakdown.appendChild(byMode);
        const scenarios = adminElement('section','adminStatsBreakdownPanel');
        scenarios.appendChild(adminElement('h3','','Most-played scenarios (completed games)'));
        if (!history.topScenarios?.length) scenarios.appendChild(adminElement('p','smallNote','No completed games in this date range.'));
        else for (const item of history.topScenarios) {
          const row = adminElement('div','adminStatsScenarioRow');
          row.append(adminElement('span','',item.name),adminElement('strong','',fmt(item.games)));
          scenarios.appendChild(row);
        }
        breakdown.appendChild(scenarios);
        const lobbyHead = adminElement('div','adminStatsLobbyHeading');
        lobbyHead.append(adminElement('h3','','Current lobbies and games'),
          adminElement('span','smallNote',`${fmt(data.rooms?.length)} rooms · sorted by connected activity`));
        lobbySection.appendChild(lobbyHead);
        const scroll = adminElement('div','adminStatsTableScroll');
        const lobbyTable = document.createElement('table'); lobbyTable.className = 'adminStatsTable';
        const th = document.createElement('tr');
        for (const label of ['Room','Mode','State','People','AI','Spectators','Visibility','Map','Last activity']) th.appendChild(adminElement('th','',label));
        lobbyTable.appendChild(th);
        if (!data.rooms?.length) {
          const tr = document.createElement('tr'); const td = adminElement('td','','No open lobbies or games at this time.');td.colSpan=9;tr.appendChild(td);lobbyTable.appendChild(tr);
        }
        for (const room of (data.rooms || []).slice(0,100)) {
          const tr = document.createElement('tr');
          const cells = [room.code, room.mode, room.paused ? `${room.phase} · paused` : room.phase,
            `${room.connected}/${room.humans} online`, String(room.ai), String(room.spectators),
            room.visibility, room.scenario ? room.scenario.replaceAll('_',' ') : room.map,
            room.lastActiveAt ? new Date(room.lastActiveAt).toLocaleTimeString(undefined, {timeZone:'America/Chicago'}) : '—'];
          for (const value of cells) tr.appendChild(adminElement('td','',value));
          const playerNames = (room.players || []).map(p => `${p.name}${p.online ? ' (online)' : ' (offline)'}`).join(', ');
          if (playerNames) tr.title = playerNames;
          lobbyTable.appendChild(tr);
        }
        scroll.appendChild(lobbyTable);lobbySection.appendChild(scroll);
        if ((data.rooms||[]).length > 100) lobbySection.appendChild(adminElement('p','smallNote','Showing the first 100 of the current rooms.'));
        for (const note of data.notes || []) foot.appendChild(adminElement('p','smallNote',note));
      } catch (error) { if (isOpen()) status.textContent = `Analytics unavailable: ${error.message}`; }
      finally {
        busy = false; refreshButton.disabled = false;
        if (pendingRefresh) { pendingRefresh = false; void refresh(); }
      }
    }
    refreshButton.addEventListener('click', refresh);
    period.addEventListener('change', () => { void refresh(); });
    void refresh();
    const interval = setInterval(() => {
      if (!isOpen()) { visible = false; clearInterval(interval); }
      else void refresh();
    }, 20_000);
  }

  function openAdminManagementScreen() {
    if (!authUser?.isAdmin) { setError('Administrator access required.'); return; }
    const dashboard = adminElement('div', 'adminDashboard');
    const tabs = adminElement('nav', 'adminTabs');
    tabs.setAttribute('aria-label', 'Administrator management sections');
    const content = adminElement('section', 'adminDashboardContent');
    const options = [
      ['stats', 'Game Stats'], ['server', 'Server Management'], ['ratings', 'Rating Management'],
      ['users', 'User Account Management'], ['merge', 'Merge Accounts'],
      ['history', 'Manage Game History'],
      ['health', 'Health Monitor'],
    ];
    const buttons = [];
    const selectTab = key => {
      buttons.forEach(button => {
        const active = button.dataset.tab === key;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      content.replaceChildren();
      if (key === 'stats') renderAdminGameStats(content);
      if (key === 'server') void openServerManagementConsole(content);
      if (key === 'ratings') void openRatingManagementScreen(content);
      if (key === 'users') void openUserManagementScreen({ container: content, adminOnly: true });
      if (key === 'merge') void openUserManagementScreen({ container: content, adminOnly: true, mergeOnly: true });
      if (key === 'history') void renderAdminHistoryManagement(content);
      if (key === 'health') renderAdminHealthMonitor(content);
    };
    for (const [key, label] of options) {
      const tab = adminElement('button', 'adminTab', label);
      tab.type = 'button'; tab.dataset.tab = key;
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => selectTab(key));
      buttons.push(tab); tabs.appendChild(tab);
    }
    dashboard.append(tabs, content);
    openModal({ title: 'Admin Management', bodyNode: dashboard, actions: [{ label: 'Close', onClick: closeModal }] });
    selectTab('stats');
  }

  function removeAccountActionFromUrl(parameter) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(parameter);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
  }

  function openForgotPasswordScreen() {
    const shell = document.createElement('div');
    shell.className = 'passwordRecoveryPanel';
    const intro = document.createElement('div');
    intro.className = 'userManagementIntro';
    intro.textContent = 'Enter your username or linked email. If the account has a verified recovery email, a one-time reset link will be sent.';
    shell.appendChild(intro);

    const identifier = document.createElement('input');
    identifier.className = 'input';
    identifier.type = 'text';
    identifier.autocomplete = 'username';
    identifier.placeholder = 'Username or email';
    shell.appendChild(identifier);

    const sendButton = document.createElement('button');
    sendButton.className = 'btn primary';
    sendButton.type = 'button';
    sendButton.textContent = 'Send Reset Email';
    shell.appendChild(sendButton);

    const status = document.createElement('div');
    status.className = 'userManagementStatus';
    shell.appendChild(status);

    sendButton.addEventListener('click', async () => {
      const value = String(identifier.value || '').trim();
      if (!value) {
        status.className = 'userManagementStatus error';
        status.textContent = 'Enter your username or email.';
        identifier.focus();
        return;
      }
      sendButton.disabled = true;
      status.className = 'userManagementStatus';
      status.textContent = 'Requesting reset email…';
      try {
        const response = await authApi('request-password-reset', { identifier: value });
        status.className = 'userManagementStatus success';
        status.textContent = response.message || 'If the account can receive recovery email, a reset link was sent.';
      } catch (error) {
        status.className = 'userManagementStatus error';
        status.textContent = error.message || 'Could not request a password reset.';
      } finally {
        sendButton.disabled = false;
      }
    });

    openModal({
      title: 'Forgot Password',
      bodyNode: shell,
      actions: [{ label: 'Close', onClick: closeModal }],
    });
    setTimeout(() => identifier.focus(), 0);
  }

  function openPasswordResetFromToken(token) {
    const shell = document.createElement('div');
    shell.className = 'passwordRecoveryPanel';
    const intro = document.createElement('div');
    intro.className = 'userManagementIntro';
    intro.textContent = 'Choose a new password for your account. This reset link can only be used once.';
    shell.appendChild(intro);

    const password = document.createElement('input');
    password.className = 'input';
    password.type = 'password';
    password.autocomplete = 'new-password';
    password.placeholder = 'New password (6+ characters)';
    shell.appendChild(password);

    const confirm = document.createElement('input');
    confirm.className = 'input';
    confirm.type = 'password';
    confirm.autocomplete = 'new-password';
    confirm.placeholder = 'Confirm new password';
    shell.appendChild(confirm);

    const resetButton = document.createElement('button');
    resetButton.className = 'btn primary';
    resetButton.type = 'button';
    resetButton.textContent = 'Reset Password';
    shell.appendChild(resetButton);

    const status = document.createElement('div');
    status.className = 'userManagementStatus';
    shell.appendChild(status);

    resetButton.addEventListener('click', async () => {
      const nextPassword = String(password.value || '');
      if (nextPassword.length < 6) {
        status.className = 'userManagementStatus error';
        status.textContent = 'Password must be at least 6 characters.';
        password.focus();
        return;
      }
      if (nextPassword !== String(confirm.value || '')) {
        status.className = 'userManagementStatus error';
        status.textContent = 'The passwords do not match.';
        confirm.focus();
        return;
      }
      resetButton.disabled = true;
      status.className = 'userManagementStatus';
      status.textContent = 'Resetting password…';
      try {
        const response = await authApi('reset-password', { token, newPassword: nextPassword });
        removeAccountActionFromUrl('reset_password');
        clearAuthLocal();
        password.value = '';
        confirm.value = '';
        status.className = 'userManagementStatus success';
        status.textContent = response.message || 'Password reset. You can now log in.';
      } catch (error) {
        status.className = 'userManagementStatus error';
        status.textContent = error.message || 'Password reset failed.';
      } finally {
        resetButton.disabled = false;
      }
    });

    openModal({
      title: 'Reset Password',
      bodyNode: shell,
      actions: [{ label: 'Close', onClick: closeModal }],
    });
    setTimeout(() => password.focus(), 0);
  }

  async function verifyEmailFromToken(token) {
    const shell = document.createElement('div');
    shell.className = 'passwordRecoveryPanel';
    const status = document.createElement('div');
    status.className = 'hint';
    status.textContent = 'Verifying email…';
    shell.appendChild(status);
    openModal({
      title: 'Verify Recovery Email',
      bodyNode: shell,
      actions: [{ label: 'Close', onClick: closeModal }],
    });
    try {
      const response = await authApi('verify-email', { token });
      removeAccountActionFromUrl('verify_email');
      status.className = 'userManagementStatus success';
      status.textContent = response.message || 'Email verified.';
      if (response.convertedToEmailLogin) {
        clearAuthLocal();
        websocketAuthenticated = false;
        reconnectForCookieAuth();
      } else if (authUser) {
        try {
          const session = await authApi('session');
          if (session.user) setAuthState(session.user, null, { clearToken: true });
        } catch (_) {}
      }
    } catch (error) {
      status.className = 'userManagementStatus error';
      status.textContent = error.message || 'Email verification failed.';
    }
  }

  function handleAccountActionLinkFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyToken = String(params.get('verify_email') || '').trim();
      const resetToken = String(params.get('reset_password') || '').trim();
      if (verifyToken) {
        void verifyEmailFromToken(verifyToken);
      } else if (resetToken) {
        openPasswordResetFromToken(resetToken);
      }
    } catch (_) {}
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
      row.setAttribute('data-i18n-skip', '');

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

    const spectatorLinkRow = document.createElement('div');
    spectatorLinkRow.style.marginBottom = '14px';

    const spectatorLinkLabel = document.createElement('div');
    spectatorLinkLabel.textContent = 'Spectator link:';
    spectatorLinkLabel.style.color = '#9fb0c6';
    spectatorLinkLabel.style.marginBottom = '6px';

    const spectatorLinkControls = document.createElement('div');
    spectatorLinkControls.style.display = 'flex';
    spectatorLinkControls.style.alignItems = 'center';
    spectatorLinkControls.style.gap = '8px';

    const spectatorLink = document.createElement('input');
    spectatorLink.className = 'input';
    spectatorLink.readOnly = true;
    spectatorLink.value = buildSpectatorJoinUrl(room.code || '');
    spectatorLink.style.flex = '1';
    spectatorLink.style.minWidth = '0';
    spectatorLink.style.fontFamily = 'ui-monospace, monospace';
    spectatorLink.style.fontSize = '11px';

    const copySpectatorLink = document.createElement('button');
    copySpectatorLink.className = 'btn';
    copySpectatorLink.textContent = 'Copy Link';
    copySpectatorLink.addEventListener('click', () => copyText(buildSpectatorJoinUrl(room.code || '')));

    spectatorLinkControls.appendChild(spectatorLink);
    spectatorLinkControls.appendChild(copySpectatorLink);
    spectatorLinkRow.appendChild(spectatorLinkLabel);
    spectatorLinkRow.appendChild(spectatorLinkControls);
    content.appendChild(spectatorLinkRow);

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
    logPanelOpen = true; // The Game Log is never dismissed, only its parent Game Panels.

    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame);
    if (ui.logList && inGame && logPanelOpen) renderLogList(ui.logList);
  }

  function toggleLogPanel() {
    const inGame = !!(state && state.phase && state.phase !== 'lobby');
    if (!inGame) { openLogModal(); return; }
    setGamePanelsExpanded(!gamePanelsExpanded);
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

  const LOBBY_RULES_SCENARIOS = Object.freeze({
    four_islands: {
      label: 'Four Islands',
      summary: 'Expand from your starting island group and establish settlements across the sea.',
      setup: [
        'Use normal Seafarers snake-order setup. Each setup settlement is followed by a connected road or ship.',
        'Starting positions are spread across the scenario’s island groups.',
      ],
      rules: [
        'The first settlement a player builds on each new island after setup is worth 2 bonus victory points.',
        'A player can earn the bonus again by reaching another island on which they did not already have a building.',
        'Roads and ships both count toward the combined Longest Road route.',
      ],
    },
    six_islands: {
      label: 'Six Islands',
      summary: 'A larger Seafarers map for five or six players, with paired action turns.',
      setup: [
        'Five or six players complete normal snake-order Seafarers setup, placing a road or ship after each settlement.',
        'The bank starts with the selected 5–6-player supply and the board uses the expanded port layout.',
      ],
      rules: [
        'The first settlement a player builds on each new island after setup is worth 2 bonus victory points.',
        'Paired-turn rules apply: Player 1 rolls and acts, then Player 2 receives an action-only turn and may trade only with the bank.',
        'Player 2 is the third remaining player to the left of Player 1. Play then advances to the next Player 1.',
      ],
    },
    through_the_desert: {
      label: 'Through the Desert',
      summary: 'Begin on the main island, then cross the desert or sail to new land for bonus points.',
      setup: [
        'Both starting settlements must be placed on the designated starting island.',
        'Gold Field intersections cannot be used for starting settlements.',
        'One port is placed on each outer island and one on the land mass across the desert; the remaining ports stay on the starting mainland.',
      ],
      rules: [
        'The first settlement a player builds on each new island after setup is worth 2 bonus victory points.',
        'The first settlement a player establishes beyond the desert during the main game grants a one-time 2-point bonus.',
        'The new-island bonus and beyond-the-desert bonus are separate and can both contribute to a player’s score when their conditions are met.',
      ],
    },
    through_the_desert_56: {
      label: 'Through the Desert',
      summary: 'The expanded desert scenario adds multiple regions to explore and uses paired action turns.',
      setup: [
        'Five or six players place both starting settlements in the allowed starting area and may follow each with a connected road or ship.',
        'Gold Field intersections cannot be used for starting settlements.',
        'One port is placed on each outer island and one on each of the two land masses across the desert; the remaining ports stay on the starting mainland.',
      ],
      rules: [
        'The first settlement a player builds on each new island after setup is worth 2 bonus victory points.',
        'Eligible desert regions can each be claimed for a 2-point exploration bonus. A single settlement can claim at most one region bonus.',
        'Paired-turn rules apply: Player 1 rolls and acts, then Player 2 receives an action-only turn and may trade only with the bank.',
      ],
    },
    fog_island: {
      label: 'Fog Island',
      summary: 'Sail from the known starting islands and reveal the hidden center one tile at a time.',
      setup: [
        'Both starting settlements must be placed on the revealed starting islands.',
        'Unrevealed fog is treated as sea until it is explored.',
      ],
      rules: [
        'Placing or moving a road or ship beside fog reveals exactly one adjacent hidden tile. Exploration must begin from a revealed edge of the map.',
        'Revealing a normal resource tile grants the explorer 1 matching resource if the bank has one. Revealing a Gold Field prompts a resource choice; revealing sea grants nothing.',
        'The pirate starts on revealed sea and cannot be moved onto an unrevealed fog tile.',
        'When exploration victory points are enabled, the first settlement a player builds on each newly revealed land mass after setup awards 2 bonus victory points.',
      ],
    },
    fog_island_56: {
      label: 'Fog Island',
      summary: 'The expanded hidden-map scenario combines fog exploration with paired action turns.',
      setup: [
        'Five or six players place both starting settlements on the revealed starting islands.',
        'Unrevealed fog is treated as sea until it is explored.',
      ],
      rules: [
        'Placing or moving a road or ship beside fog reveals exactly one adjacent hidden tile, starting from a revealed edge.',
        'A revealed resource tile grants 1 matching resource if available; Gold prompts a choice; sea grants nothing.',
        'The pirate starts on revealed sea and cannot be moved onto an unrevealed fog tile.',
        'When exploration victory points are enabled, the first settlement a player builds on each newly revealed land mass after setup awards 2 bonus victory points. Paired-turn rules apply, and Player 2 may trade only with the bank.',
      ],
    },
    eight_islands_78: {
      label: 'Eight Islands (7–8)',
      summary: 'Eight separate island regions on a 79-hex Seafarers map with 40 production discs.',
      setup: ['Seven or eight players establish starting settlements across the island groups.', 'The game uses 11 ports and expanded paired-turn play.'],
      rules: ['Land types and number discs are randomized while preserving the eight-island arrangement.', 'Exploring islands may award settlement bonuses when enabled.', 'Paired-turn rules apply.'],
    },
    through_the_desert_78: {
      label: 'Through the Desert (7–8)',
      summary: 'A 97-hex board with seven desert hexes, five Gold Fields, and 50 numbered tiles.',
      setup: ['Start on the designated main island, not the Gold Fields.', 'Desert routes and overseas land masses provide expansion paths.'],
      rules: ['The seven desert locations and island geometry remain fixed.', 'Land resources are randomized without changing the scenario inventory.', 'Exploration and desert expansion bonuses follow the corresponding Seafarers scenario rules.'],
    },
    fog_island_78: {
      label: 'Fog Island (7–8)',
      summary: 'Sail toward 23 hidden central tiles; four conceal sea, four conceal Gold Fields, and fifteen conceal resources.',
      setup: ['Seven or eight players begin on known, visible islands.', 'The center is hidden at game start, regardless of the uploaded template’s visible center.'],
      rules: ['Placing a ship or road at a fog edge reveals an adjacent tile and its number disc.', 'Discovering resources awards one card from the bank, Gold Fields prompt a choice, and sea grants no card.', 'The pirate cannot start on or enter an unrevealed fog tile. Paired turns apply.'],
    },
    scattered_tiles_78: {
      label: 'Scattered Tiles (7–8)',
      summary: 'A randomized 97-hex Seafarers board, automatically sized for seven or eight players.',
      setup: ['The seven-player pool has 42 number discs and nine ports; the eight-player pool has 48 discs and eleven ports.', 'The preview switches to the eight-player pool only when eight lobby seats are occupied.'],
      rules: ['The correct tile inventory is shuffled every generation.', 'Red number discs are kept apart and off Gold Fields.'],
    },
    cartographer_78: {
      label: 'Cartographer (7–8)',
      summary: 'Each of seven or eight players manually drafts tiles onto the expanded 97-hex board.',
      setup: ['The draft uses the seven-player inventory until all eight lobby seats are occupied.', 'The game assigns number discs and ports after the draft.'],
      rules: ['The manual Cartographer timer and turn order apply.', 'Number and port inventories follow the occupied-seat count at game start.'],
    },
    scattered_tiles_78_7: {
      label: 'Scattered Tiles (7)',
      summary: 'A 97-position randomized Seafarers board for seven players.',
      setup: ['All map tiles are shuffled according to the supplied seven-player inventory.', 'There are nine ports and 42 numbered land tiles.'],
      rules: ['The tile types and number discs change with every regeneration.', 'Numbers 6 and 8 are kept apart, and Gold Fields avoid the red-number positions.'],
    },
    scattered_tiles_78_8: {
      label: 'Scattered Tiles (8)',
      summary: 'A 97-position randomized Seafarers board for eight players.',
      setup: ['All map tiles are shuffled according to the supplied eight-player inventory.', 'There are eleven ports and 48 numbered land tiles.'],
      rules: ['The tile types and number discs change with every regeneration.', 'Numbers 6 and 8 are kept apart, and Gold Fields avoid the red-number positions.'],
    },
    cartographer_78_7: {
      label: 'Cartographer (7)',
      summary: 'Seven players manually draft and place the 97 tiles of the expanded board.',
      setup: ['Each player selects placements from their allotted terrain inventory.', 'After drafting, numbers and nine ports are assigned automatically.'],
      rules: ['Drafts use the manual Cartographer turn timer.', 'The seven-player inventory and 42 number discs are enforced.'],
    },
    cartographer_78_8: {
      label: 'Cartographer (8)',
      summary: 'Eight players manually draft and place the 97 tiles of the expanded board.',
      setup: ['Each player selects placements from their allotted terrain inventory.', 'After drafting, numbers and eleven ports are assigned automatically.'],
      rules: ['Drafts use the manual Cartographer turn timer.', 'The eight-player inventory and 48 number discs are enforced.'],
    },
    test_builder_78: {
      label: 'Custom Map (7–8)',
      summary: 'An editable 97-hex Seafarers map using the supplied seven-to-eight-player custom template.',
      setup: ['Paint resource, sea, desert, Gold Field, or Fog tiles on the fixed map layout.', 'Choose a number on terrain, or paint Fog over an existing tile to hide its type and number.'],
      rules: ['Fog uncovers and awards resources using the standard Fog Island rules.', 'Uploaded and downloaded custom maps preserve hidden terrain and number discs.', 'The selected lobby rules control points, timers, and bank supply.'],
    },
    heading_for_new_shores: {
      label: 'Heading for New Shores',
      summary: 'Build from the main island toward valuable outer islands and their Gold Fields.',
      setup: [
        'Both starting settlements must be placed on the main island.',
        'One port is placed on each outer island; the remaining ports stay on the main island.',
        'The outer islands contain Gold Fields.',
      ],
      rules: [
        'The first settlement a player builds on each new island after setup is worth 2 bonus victory points.',
        'Gold Fields produce a resource of the receiving player’s choice instead of a fixed resource.',
        'Ships provide the routes needed to reach the outer islands, subject to the pirate’s blocking rules.',
      ],
    },
    cartographer_4_manual: {
      label: 'Cartographer',
      summary: 'Players construct the board from personal tile inventories before normal setup begins.',
      setup: [
        'Before settlement setup, players take turns placing one tile from their available inventory into a legal map position.',
        'After the tile draft, number tokens, robber, pirate, and ports are randomized; normal Seafarers settlement setup then begins.',
      ],
      rules: [
        'Tile placement is part of the game: use it to shape future production, coastlines, routes, and access to ports.',
        'The first settlement a player builds on each new land mass after setup is worth 2 bonus victory points.',
        'Desert tiles divide land masses for exploration scoring, so settling on land beyond a desert barrier can earn that bonus.',
        'All common Seafarers ship, pirate, Gold Field, building, trade, and development-card rules still apply.',
      ],
    },
    cartographer_56_manual: {
      label: 'Cartographer',
      summary: 'Five or six players draft the expanded board, then play it using paired action turns.',
      setup: [
        'Before settlement setup, players take turns placing one tile from their inventory into a legal map position.',
        'After the draft, number tokens, robber, pirate, and ports are randomized; normal expanded Seafarers setup follows.',
      ],
      rules: [
        'The first settlement a player builds on each new land mass after setup is worth 2 bonus victory points.',
        'Desert tiles divide land masses for exploration scoring, so settling on land beyond a desert barrier can earn that bonus.',
        'Paired-turn rules apply after setup, and Player 2 may trade only with the bank.',
        'All common Seafarers ship, pirate, Gold Field, building, trade, and development-card rules still apply.',
      ],
    },
    cartographer_4_random: {
      label: 'Scattered Tiles',
      summary: 'Begin on a randomized Seafarers board and adapt to its coastlines and resource distribution.',
      setup: [
        'The server randomizes the board before normal Seafarers snake-order settlement setup begins.',
        'Each setup settlement is followed by a connected road or ship.',
      ],
      rules: [
        'The first settlement a player builds on each new land mass after setup is worth 2 bonus victory points.',
        'Desert tiles divide land masses for exploration scoring, so settling on land beyond a desert barrier can earn that bonus.',
        'All common Seafarers ship, pirate, Gold Field, building, trade, and development-card rules apply.',
      ],
    },
    cartographer_56_random: {
      label: 'Scattered Tiles',
      summary: 'An expanded randomized Seafarers board for five or six players.',
      setup: [
        'The server randomizes the board before normal expanded Seafarers settlement setup begins.',
        'Each setup settlement is followed by a connected road or ship.',
      ],
      rules: [
        'The first settlement a player builds on each new land mass after setup is worth 2 bonus victory points.',
        'Desert tiles divide land masses for exploration scoring, so settling on land beyond a desert barrier can earn that bonus.',
        'Paired-turn rules apply after setup, and Player 2 may trade only with the bank.',
        'All common Seafarers ship, pirate, Gold Field, building, trade, and development-card rules apply.',
      ],
    },
    test_builder: {
      label: 'Custom Map',
      summary: 'A solo-capable sandbox for painting a custom Seafarers board before starting.',
      setup: [
        'The host paints tile types and optional numbers, or selects port types and places them on shoreline edges. Sea and desert tiles ignore number selections.',
        'Placed ports cannot share a corner and are removed automatically if later tile painting makes their edge invalid.',
        'The host can reset to a blank board before starting. This is the only map that allows a one-player game.',
      ],
      rules: [
        'When exploration points are enabled, the first settlement on each new island or desert-separated land mass after setup awards 2 bonus victory points.',
        'After the custom board is locked, normal Seafarers placement, ship, pirate, Gold Field, trade, and development-card rules apply wherever the painted terrain permits them.',
        'This sandbox uses the lobby’s selected victory target, timers, bank size, discard limit, and development deck.',
      ],
    },
    test_builder_56: {
      label: 'Custom Map',
      summary: 'A large-frame sandbox for designing a custom 5–6-player Seafarers board before starting.',
      setup: [
        'The host paints tile types and optional numbers, or selects port types and places them on shoreline edges. Sea and desert tiles ignore number selections.',
        'Placed ports cannot share a corner and are removed automatically if later tile painting makes their edge invalid.',
        'The host can reset the large frame to a blank board before the five- or six-player game starts.',
      ],
      rules: [
        'When exploration points are enabled, the first settlement on each new island or desert-separated land mass after setup awards 2 bonus victory points.',
        'After the custom board is locked, normal Seafarers placement, ship, pirate, Gold Field, trade, and development-card rules apply wherever the painted terrain permits them.',
        'Paired-turn 5–6-player rules apply, and Player 2 may trade only with the bank.',
        'This sandbox uses the lobby’s selected victory target, timers, bank size, discard limit, and development deck.',
      ],
    },
  });

  let casualRulesSelection = { mapMode: 'classic', scenarioKey: '' };
  function lobbyRulesSelectedContext(selection = null) {
    const activeRules = (state && state.rules) ? state.rules : ((room && room.rules) ? room.rules : {});
    const mapMode = String(selection?.mapMode || ui.mapModeSelect?.value || uiMapModeFromRules(activeRules) || 'classic').toLowerCase();
    const isSeafarers = mapMode === 'seafarers' || mapMode === 'seafarers56' || mapMode === 'seafarers78';
    const isPaired = mapMode === 'classic56' || mapMode === 'seafarers56' || mapMode === 'classic78' || mapMode === 'seafarers78';
    const scenarioKey = selection?.scenarioKey || (mapMode === 'seafarers78'
      ? String(ui.mapScenario78Select?.value || activeRules.seafarersScenario || 'eight_islands_78').toLowerCase()
      : mapMode === 'seafarers56'
      ? String(ui.mapScenario56Select?.value || activeRules.seafarersScenario || 'six_islands').toLowerCase()
      : String(ui.mapScenarioSelect?.value || activeRules.seafarersScenario || 'four_islands').toLowerCase());
    const scenario = isSeafarers ? (LOBBY_RULES_SCENARIOS[scenarioKey] || LOBBY_RULES_SCENARIOS.four_islands) : null;

    function selectedInt(control, fallback, min, max) {
      const value = Math.floor(Number(control?.value ?? fallback));
      if (!Number.isFinite(value)) return fallback;
      return Math.max(min, Math.min(max, value));
    }

    const speed = String(ui.timerSpeedSelect?.value || 'normal').toLowerCase();
    const speedFactor = speed === 'off' ? 0 : (speed === 'fast' ? 0.5 : (speed === 'slow' ? 2 : 1));
    const speedLabel = speed === 'off' ? 'Off' : speed === 'fast' ? 'Fast' : (speed === 'slow' ? 'Slow' : 'Normal');
    const victoryTarget = selectedInt(selection ? null : ui.victoryPointsSelect, defaultVictoryPointsFor({
      mapMode,
      seafarersScenario: scenarioKey,
      seafarersScenario56: scenarioKey,
    }), 3, 30);
    const baseResources = selectedInt(selection ? null : ui.baseResourceCountSelect, defaultBaseResourcesFor({
      mapMode,
      seafarersScenario: scenarioKey,
      seafarersScenario56: scenarioKey,
    }), 1, 40);
    const discardLimit = selectedInt(ui.discardLimitInput, 7, 3, 30);
    const friendlyRobber = ui.friendlyRobberToggle
      ? !!ui.friendlyRobberToggle.checked
      : activeRules.friendlyRobber === true;
    const explorationPointsEnabled = ui.explorationPointsToggle
      ? !!ui.explorationPointsToggle.checked
      : activeRules.explorationPointsEnabled !== false;
    const devDeckSize = selectedInt(ui.devDeckModeSelect, 25, 13, 38);
    const diceAlgorithm = normalizeDiceAlgorithmClient(ui.diceAlgorithmSelect?.value || activeRules.diceAlgorithm);
    const diceAlgorithmDetails = diceAlgorithmInfo(diceAlgorithm);
    const devDeckDescription = devDeckSize === 38
      ? '38 cards: 21 Knights, 3 Road Building, 3 Invention, 3 Monopoly, 8 Victory Point'
      : (devDeckSize === 13
        ? '13 cards: 7 Knights, 1 Road Building, 1 Invention, 1 Monopoly, 3 Victory Point'
        : '25 cards: 14 Knights, 2 Road Building, 2 Invention, 2 Monopoly, 5 Victory Point');
    const mapLabel = mapMode === 'classic78' ? 'Classic 7–8 Player'
      : (mapMode === 'seafarers78' ? `Seafarers 7–8 — ${scenario.label}` : mapMode === 'classic56'
      ? 'Classic 5–6 Player'
      : (mapMode === 'seafarers56'
        ? `Seafarers 5–6 — ${scenario.label}`
        : (mapMode === 'seafarers' ? `Seafarers — ${scenario.label}` : 'Classic')));

    return {
      mapMode,
      mapLabel,
      isSeafarers,
      isPaired,
      scenarioKey,
      scenario,
      playerRange: mapMode === 'classic78' || mapMode === 'seafarers78' ? (scenarioKey.endsWith('_7') ? '7' : (scenarioKey.endsWith('_8') ? '8' : '7–8')) : mapMode === 'classic56' || mapMode === 'seafarers56' ? '5–6' : (scenarioKey === 'test_builder' && isSeafarers ? '1–4' : '2–4'),
      victoryTarget,
      baseResources,
      discardLimit,
      friendlyRobber,
      explorationPointsEnabled,
      devDeckSize,
      devDeckDescription,
      diceAlgorithm,
      diceAlgorithmLabel: diceAlgorithmDetails.label,
      diceAlgorithmDescription: diceAlgorithmDetails.description,
      speedLabel,
      setupSeconds: Math.round(60 * speedFactor),
      playSeconds: Math.round(30 * speedFactor),
      microSeconds: Math.round(15 * speedFactor),
    };
  }

  function rulesGuideNode(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue != null) node.textContent = textValue;
    return node;
  }

  function appendRulesGuideList(parent, items, ordered = false) {
    const list = rulesGuideNode(ordered ? 'ol' : 'ul', 'rulesGuideList');
    for (const item of items) list.appendChild(rulesGuideNode('li', '', item));
    parent.appendChild(list);
    return list;
  }

  function appendRulesGuideParagraph(parent, textValue, className = '') {
    parent.appendChild(rulesGuideNode('p', className, textValue));
  }

  function makeRulesGuideSection(parent, id, title, intro = '') {
    const section = rulesGuideNode('section', 'rulesGuideSection');
    section.id = id;
    section.appendChild(rulesGuideNode('h2', '', title));
    if (intro) appendRulesGuideParagraph(section, intro, 'rulesGuideLead');
    parent.appendChild(section);
    return section;
  }

  function appendRulesGuideCallout(parent, title, textValue, tone = '') {
    const callout = rulesGuideNode('div', `rulesGuideCallout${tone ? ` ${tone}` : ''}`);
    callout.appendChild(rulesGuideNode('div', 'rulesGuideCalloutTitle', title));
    callout.appendChild(rulesGuideNode('div', 'rulesGuideCalloutText', textValue));
    parent.appendChild(callout);
  }

  function renderLobbyRulesPage() {
    if (!ui.rulesPageContent || !ui.rulesPageNav) return;
    const showCasualTabs = selectedPlayMode === 'casual' || !!room?.casual;
    const selection = showCasualTabs ? casualRulesSelection : null;
    const guide = lobbyRulesSelectedContext(selection);
    const categories = [
      ['classic', 'Classic 2–4'], ['classic56', 'Classic 5–6'], ['classic78', 'Classic 7–8'],
      ['seafarers', 'Seafarers 2–4'], ['seafarers56', 'Seafarers 5–6'], ['seafarers78', 'Seafarers 7–8'],
    ];
    const scenarioOptions = {
      seafarers: ['four_islands', 'through_the_desert', 'fog_island', 'heading_for_new_shores', 'cartographer_4_manual', 'cartographer_4_random'],
      seafarers56: ['six_islands', 'through_the_desert_56', 'fog_island_56', 'cartographer_56_manual', 'cartographer_56_random'],
      seafarers78: ['eight_islands_78', 'through_the_desert_78', 'fog_island_78', 'cartographer_78', 'scattered_tiles_78', 'test_builder_78'],
    };
    const buildRuleTabs = (element, list, selectedKey, clickHandler) => {
      if (!element) return;
      element.replaceChildren();
      element.classList.remove('hidden');
      for (const [key, label] of list) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'rulesTab' + (key === selectedKey ? ' active' : '');
        btn.setAttribute('role', 'tab'); btn.setAttribute('aria-selected', key === selectedKey ? 'true' : 'false');
        btn.textContent = label;
        btn.addEventListener('click', () => { clickHandler(key); renderLobbyRulesPage(); });
        element.appendChild(btn);
      }
    };
    if (showCasualTabs) {
      buildRuleTabs(ui.rulesPageCategoryTabs, categories, guide.mapMode, (key) => {
        casualRulesSelection.mapMode = key;
        casualRulesSelection.scenarioKey = scenarioOptions[key]?.[0] || '';
      });
      if (scenarioOptions[guide.mapMode]) {
        buildRuleTabs(ui.rulesPageScenarioTabs,
          scenarioOptions[guide.mapMode].map(key => [key, LOBBY_RULES_SCENARIOS[key].label]), guide.scenarioKey,
          key => { casualRulesSelection.scenarioKey = key; });
      } else ui.rulesPageScenarioTabs?.classList.add('hidden');
    } else {
      ui.rulesPageCategoryTabs?.classList.add('hidden');
      ui.rulesPageScenarioTabs?.classList.add('hidden');
    }
    ui.rulesPageTitle.textContent = `${guide.mapLabel} Rules`;
    ui.rulesPageSubtitle.textContent = `${guide.playerRange} players • First to ${guide.victoryTarget} victory points • ${guide.speedLabel} timers`;
    ui.rulesPageContent.innerHTML = '';
    ui.rulesPageNav.innerHTML = '';

    const navTitle = rulesGuideNode('div', 'rulesPageNavTitle', 'On this page');
    ui.rulesPageNav.appendChild(navTitle);
    const navList = rulesGuideNode('div', 'rulesPageNavList');
    ui.rulesPageNav.appendChild(navList);
    const sections = [
      ['rules-overview', 'Current game'],
      ['rules-objective', 'Objective & scoring'],
      ['rules-setup', 'Game setup'],
      ['rules-turn', 'Turn process'],
      ['rules-production', 'Production & rolling 7'],
      ['rules-building', 'Building & placement'],
      ['rules-trading', 'Trading'],
      ['rules-dev-cards', 'Development cards'],
      ['rules-thieves', guide.isSeafarers ? 'Robber & pirate' : 'Robber'],
      ['rules-titles', 'Longest Road & Largest Army'],
      ['rules-map', 'Selected map rules'],
      ['rules-timers', 'Timers'],
      ['rules-tools', 'Players, tools & history'],
    ];
    for (const [id, label] of sections) {
      const link = rulesGuideNode('a', 'rulesPageNavLink', label);
      link.href = `#${id}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      navList.appendChild(link);
    }

    const overview = makeRulesGuideSection(ui.rulesPageContent, 'rules-overview', showCasualTabs ? 'Map & scenario overview' : 'Current game selection', showCasualTabs ? 'Browse the available maps and scenarios. These are their default rules; choose your preferred map and settings after creating a Casual lobby.' : 'This handbook follows the options currently selected in Game Setup. Selected lobby values override scenario defaults.');
    const stats = rulesGuideNode('div', 'rulesGuideStats');
    const statItems = [
      ['Map', guide.mapLabel],
      ['Players', guide.playerRange],
      ['Win target', `${guide.victoryTarget} VP`],
      ['Bank', `${guide.baseResources} of each resource`],
      ['Dice', `${guide.diceAlgorithmLabel}: ${guide.diceAlgorithmDescription}`],
      ['Discard limit', String(guide.discardLimit)],
      ['Friendly Robber', guide.friendlyRobber ? 'Enabled' : 'Disabled'],
      ...(guide.isSeafarers ? [['Exploration VP', guide.explorationPointsEnabled ? 'Enabled' : 'Disabled']] : []),
      ['Timers', `${guide.speedLabel}: ${guide.setupSeconds}s / ${guide.playSeconds}s / ${guide.microSeconds}s`],
      ['Dev deck', `${guide.devDeckSize} cards`],
      ['Turn style', guide.isPaired ? 'Paired expanded-map turns' : 'Standard turns'],
    ];
    for (const [label, value] of statItems) {
      const card = rulesGuideNode('div', 'rulesGuideStat');
      card.appendChild(rulesGuideNode('div', 'rulesGuideStatLabel', label));
      card.appendChild(rulesGuideNode('div', 'rulesGuideStatValue', value));
      stats.appendChild(card);
    }
    overview.appendChild(stats);

    const objective = makeRulesGuideSection(ui.rulesPageContent, 'rules-objective', 'Objective and victory points', `Be the first player to reach ${guide.victoryTarget} victory points.`);
    appendRulesGuideList(objective, [
      'Settlement: 1 victory point.',
      'City: 2 victory points total; upgrading replaces the settlement’s 1 point.',
      'Longest Road: 2 victory points while held.',
      'Largest Army: 2 victory points while held.',
      'Victory Point development card: 1 victory point when played.',
      ...(guide.isSeafarers ? ['Scenario bonuses: points are awarded only as described in Selected map rules below.'] : []),
    ]);
    appendRulesGuideCallout(objective, 'Winning', 'The server recalculates victory points after scoring actions and ends the game as soon as a player reaches the selected target.');

    const setup = makeRulesGuideSection(ui.rulesPageContent, 'rules-setup', 'Game setup', 'Players establish two starting settlements and routes before normal turns begin.');
    appendRulesGuideList(setup, [
      'First round: players act in seating order, placing 1 settlement and then a connected route.',
      'Second round: the order reverses, so the last player places first and the first player places last.',
      `In ${guide.isSeafarers ? 'Seafarers, each setup route may be a road or ship' : 'Classic, each setup route is a road'}.`,
      'After placing the second settlement, collect 1 matching resource for each adjacent standard producing land tile, subject to bank supply. Gold Fields do not grant a setup resource.',
      'Starting settlements must obey the distance rule and any restrictions listed for the selected map.',
      'When setup finishes, the first player begins the first normal turn.',
    ], true);

    const turn = makeRulesGuideSection(ui.rulesPageContent, 'rules-turn', 'Turn process', guide.isPaired ? 'Expanded maps use a full Player 1 turn followed by an action-only Player 2 turn.' : 'A normal turn has a roll followed by an action phase.');
    appendRulesGuideList(turn, [
      ...(guide.isSeafarers ? ['Before rolling, the active player may play an eligible development card or make their one permitted end-ship move.'] : ['Before rolling, the active player may play an eligible development card.']),
      'Roll both dice. Resolve production, or resolve discards and the robber/pirate when the total is 7.',
      'During the action phase, perform legal actions in any order: build, trade, buy development cards, play an eligible development card, or move a ship if that move was not already used.',
      'Select End Turn when finished. Any unresolved required choice must be completed before play advances.',
    ], true);
    if (guide.isPaired) {
      appendRulesGuideCallout(turn, 'Paired turns', 'Player 1 rolls and takes a full action phase. If the game has not ended, the third remaining player to Player 1’s left becomes Player 2 and receives an action-only phase with no roll or production. Player 2 may trade with the bank but not with other players. Play then advances to the next Player 1.', 'accent');
    }

    const production = makeRulesGuideSection(ui.rulesPageContent, 'rules-production', 'Production and rolling 7', 'A producing tile pays the owners of adjacent settlements and cities when its number is rolled.');
    appendRulesGuideList(production, [
      'A settlement receives 1 matching resource; a city receives 2. The desert and sea do not produce.',
      'If the bank cannot provide the required cards, it pays only what the game can legally distribute from the remaining supply.',
      ...(guide.isSeafarers ? ['A Gold Field lets each eligible player choose the resource they receive. Each pending Gold choice uses the micro-phase timer.'] : []),
      `On a 7, every player holding more than ${guide.discardLimit} resource cards has 30 seconds to discard half their hand, rounded down.`,
      `After all required discards, the roller moves the ${guide.isSeafarers ? 'robber or pirate' : 'robber'} and may steal 1 random resource from an eligible adjacent opponent.`,
    ]);

    const building = makeRulesGuideSection(ui.rulesPageContent, 'rules-building', 'Building costs and placement', 'Pay resources to the bank, then choose a highlighted legal location.');
    const costs = rulesGuideNode('div', 'rulesGuideCosts');
    const costItems = [
      ['Road', '1 brick + 1 lumber', 'Extends your land network.'],
      ...(guide.isSeafarers ? [['Ship', '1 lumber + 1 wool', 'Extends your route along sea or coastal edges.']] : []),
      ['Settlement', '1 brick + 1 lumber + 1 wool + 1 grain', 'Build on an empty legal intersection connected to your route.'],
      ['City', '2 grain + 3 ore', 'Upgrade one of your settlements; cities cannot be placed directly.'],
      ['Development card', '1 wool + 1 grain + 1 ore', 'Draw the top card from the selected deck.'],
    ];
    for (const [name, cost, note] of costItems) {
      const card = rulesGuideNode('div', 'rulesGuideCost');
      card.appendChild(rulesGuideNode('h3', '', name));
      card.appendChild(rulesGuideNode('div', 'rulesGuideCostValue', cost));
      card.appendChild(rulesGuideNode('div', 'rulesGuideCostNote', note));
      costs.appendChild(card);
    }
    building.appendChild(costs);
    appendRulesGuideList(building, [
      'Settlements must be at least two edges away from every other settlement or city.',
      'A new settlement must connect to one of your roads or ships unless it is being placed during setup.',
      'Roads must use legal land/coastal edges and connect to your route or building network.',
      ...(guide.isSeafarers ? [
        'Ships must use sea/coastal edges and connect to your ship or building network. The pirate blocks placement on adjacent edges.',
        'Once per turn, before or after rolling, you may move one open end ship to another legal connected edge. A ship enclosed inside a route cannot be moved, and the pirate blocks movement into or out of adjacent edges.',
      ] : []),
    ]);

    const trading = makeRulesGuideSection(ui.rulesPageContent, 'rules-trading', 'Trading', 'Trading is available during the action phase after the roll.');
    appendRulesGuideList(trading, [
      'Bank trade: exchange 4 cards of one resource for 1 card of your choice.',
      'Generic port: exchange 3 cards of one resource for 1 card of your choice.',
      'Resource port: exchange 2 cards of the pictured resource for 1 card of your choice.',
      'Player trade: propose the resources you will give and receive. Another player may accept while the offer remains open.',
      'After a successful player trade, 10 seconds are added to the initiating player’s current turn.',
      'The turn timer continues while any trade window is open.',
      ...(guide.isPaired ? ['Player 2’s action-only turn permits bank and port trades but not player-to-player trades.'] : []),
    ]);

    const devCards = makeRulesGuideSection(ui.rulesPageContent, 'rules-dev-cards', 'Development cards', guide.devDeckDescription + '.');
    appendRulesGuideList(devCards, [
      'A newly purchased non-Victory-Point card cannot be played on the same turn it was bought.',
      'A player may play at most 1 non-Victory-Point development card per turn. Eligible cards may be played before rolling.',
      `Knight: counts toward Largest Army and moves the ${guide.isSeafarers ? 'robber or pirate' : 'robber'}, followed by an eligible random steal.`,
      guide.isSeafarers
        ? 'Road Building: place up to 2 free roads or ships in any combination. Every placement must still be legal and use an available piece.'
        : 'Road Building: place up to 2 roads for free. Every placement must still be legal and use an available road piece.',
      'Invention: choose exactly 2 resources to take from the bank.',
      'Monopoly: name 1 resource and take every card of that resource held by the other players.',
      'Victory Point: adds 1 revealed victory point and may be played immediately, including on the purchase turn.',
      'Every played development card is consumed and removed from the player’s Resources tab.',
    ]);

    const thieves = makeRulesGuideSection(ui.rulesPageContent, 'rules-thieves', guide.isSeafarers ? 'Robber and pirate' : 'Robber', guide.isSeafarers ? 'A 7 or Knight creates a choice between the land robber and sea pirate.' : 'The robber controls land production and stealing.');
    appendRulesGuideList(thieves, [
      'The robber must move to a different land tile. That tile produces nothing until the robber moves again.',
      ...(guide.friendlyRobber ? ['Friendly Robber is enabled: the robber cannot move beside a low-score player’s building, and the pirate cannot move beside a low-score player’s ship, while that player has 2 victory points or fewer.'] : []),
      'After moving the robber, choose an eligible opponent with a building beside the destination and steal 1 random resource if they have one.',
      ...(guide.isSeafarers ? [
        'The pirate must move to a different sea tile. It blocks building or moving ships on adjacent edges.',
        'After moving the pirate, choose an eligible opponent with a ship beside the destination and steal 1 random resource if they have one.',
      ] : []),
      'If no eligible opponent has a resource, the move completes without a steal.',
    ]);

    const titles = makeRulesGuideSection(ui.rulesPageContent, 'rules-titles', 'Longest Road and Largest Army', 'Each title is worth 2 victory points while it is held.');
    appendRulesGuideList(titles, [
      `Longest Road requires a continuous route of at least 5 of your ${guide.isSeafarers ? 'roads and ships' : 'roads'}. An edge cannot be counted twice, and an opponent’s settlement or city blocks continuation through that intersection.`,
      'Largest Army requires at least 3 played Knights.',
      'To take either title from its current holder, a player must strictly exceed the holder’s recorded route length or army size; tying the holder is not enough.',
      'If there is a tie without an eligible current holder, the title remains unclaimed until one player has the unique best qualifying total.',
      'If a title holder leaves, the departed player remains the recorded holder and keeps its 2 points in the game state until a remaining player uniquely and strictly surpasses the recorded total.',
    ]);

    const map = makeRulesGuideSection(ui.rulesPageContent, 'rules-map', 'Selected map rules', guide.isSeafarers ? guide.scenario.summary : (guide.isPaired ? 'The expanded Classic board supports five or six players and uses paired action turns.' : 'Classic uses the standard land-only board, robber, roads, settlements, cities, ports, and development cards.'));
    if (guide.isSeafarers) {
      map.appendChild(rulesGuideNode('h3', 'rulesGuideSubheading', 'Scenario setup'));
      appendRulesGuideList(map, guide.scenario.setup);
      map.appendChild(rulesGuideNode('h3', 'rulesGuideSubheading', 'Special rules'));
      appendRulesGuideList(map, guide.scenario.rules);
      if (!guide.explorationPointsEnabled) {
        appendRulesGuideCallout(map, 'Game Setup override', 'Exploration victory points are disabled. Ignore any new-island, desert-region, or other exploration-point awards described by this scenario.', 'accent');
      }
      map.appendChild(rulesGuideNode('h3', 'rulesGuideSubheading', 'Common Seafarers rules'));
      appendRulesGuideList(map, [
        'Ships cost 1 lumber and 1 wool, travel on sea/coastal edges, and count with roads toward Longest Road.',
        'The pirate blocks adjacent ship placement and movement. Knights and a rolled 7 allow the active player to choose robber or pirate.',
        'Gold Fields award resources chosen by the receiving player.',
        guide.explorationPointsEnabled
          ? 'Unless this scenario says otherwise, the first settlement a player builds on each new island after setup awards 2 bonus victory points.'
          : 'Exploration victory points are disabled for this game.',
      ]);
    } else if (guide.isPaired) {
      appendRulesGuideList(map, [
        'The expanded board requires five or six players, uses the larger bank default and 11 ports, and has no ships, pirate, Gold Fields, or island bonuses.',
        'Player 1 rolls and takes a full action phase. Player 2 then takes an action-only phase and may trade only with the bank.',
        'All other Classic production, robber, building, port, development-card, title, and victory rules apply.',
      ]);
    } else {
      appendRulesGuideList(map, [
        'Classic supports two to four players and uses land routes only.',
        'There are no ships, pirate, Gold Fields, fog tiles, exploration bonuses, or paired turns.',
        'The default victory target is 10, but this game uses the selected target shown above.',
      ]);
    }

    const timers = makeRulesGuideSection(ui.rulesPageContent, 'rules-timers', 'Timers and automatic resolution', `${guide.speedLabel} timing is selected for this lobby.`);
    appendRulesGuideList(timers, [
      `Setup placement: ${guide.setupSeconds} seconds for each required settlement or route placement.`,
      `Normal turn: ${guide.playSeconds} seconds.`,
      'Discard phase: 30 seconds after a 7 is rolled.',
      `Micro phase: ${guide.microSeconds} seconds for other short required choices such as stealing or choosing Gold Field resources.`,
      'The server automatically resolves or skips an expired choice when possible so the game can continue.',
      'Opening a trade window does not pause the turn timer.',
      'A completed player-to-player trade adds 10 seconds to the initiating player’s turn.',
    ]);

    const tools = makeRulesGuideSection(ui.rulesPageContent, 'rules-tools', 'Players, game tools, and history', 'The interface keeps information and recovery tools available throughout the game.');
    appendRulesGuideList(tools, [
      'Resources shows the bank, public counts, pieces, played Knights, titles, and your exact hand. A spectator may click a player there to view that active player’s exact resources and development cards.',
      'Game Log records rolls, builds, trades, cards, scoring, and other actions. Dice Stats summarizes roll totals; Chat, Audio, and Colorblind controls are available from Game Tools.',
      'The host can pause and resume the game. Ending an active game early requires the remaining players’ unanimous vote.',
      'If a player leaves, all resources in their hand return to the bank. Their roads, ships, settlements, and cities remain on the map and continue to block or connect exactly where they were built.',
      'A departed Longest Road or Largest Army holder remains the title holder until a remaining player satisfies the strict surpassing rule described above.',
      'Use Rejoin Last Room after a disconnect. Spectators do not take turns and may follow the game without occupying an active player seat.',
      'Completed games appear in Game History. Each game provides a step-by-step replay with the saved game log; during replay, click a player in Resources to inspect the active player view for that step.',
    ]);

    ui.rulesPageContent.scrollTop = 0;
  }

  function openLobbyRulesPage() {
    if (!ui.rulesPage) return;
    renderLobbyRulesPage();
    ui.rulesPage.classList.remove('hidden');
    ui.rulesPage.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rules-page-open');
    window.setTimeout(() => ui.rulesPageCloseBtn?.focus(), 0);
  }

  function closeLobbyRulesPage() {
    if (!ui.rulesPage) return;
    ui.rulesPage.classList.add('hidden');
    ui.rulesPage.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rules-page-open');
    ui.lobbyRulesBtn?.focus();
  }

  const DICE_ALGORITHM_INFO = Object.freeze({
    random: Object.freeze({
      label: 'Random',
      description: 'Independent fair six-sided dice on every roll.',
    }),
    balanced: Object.freeze({
      label: 'Balanced Bag',
      description: 'All 36 possible dice pairs are shuffled, giving the exact normal 2d6 distribution in each 36-roll cycle.',
    }),
    probability_corrected: Object.freeze({
      label: 'Probability Corrected',
      description: 'Rolls stay random, but totals behind their expected frequency receive a gentle boost.',
    }),
    streak_breaker: Object.freeze({
      label: 'Streak Breaker',
      description: 'Fair random dice, except the same total cannot occur three times in a row.',
    }),
  });

  function normalizeDiceAlgorithmClient(value) {
    const raw = String(value == null ? '' : value).trim();
    const key = String(raw || 'probability_corrected').toLowerCase().replace(/[\s-]+/g, '_');
    if (key === 'balanced' || key === 'balanced_bag' || key === 'bag') return 'balanced';
    if (key === 'probability_corrected' || key === 'corrected' || key === 'smooth' || key === 'smoothed') return 'probability_corrected';
    if (key === 'streak_breaker' || key === 'streakbreaker' || key === 'anti_streak') return 'streak_breaker';
    return 'random';
  }

  function diceAlgorithmInfo(value) {
    return DICE_ALGORITHM_INFO[normalizeDiceAlgorithmClient(value)] || DICE_ALGORITHM_INFO.random;
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
      if (ratio === 0) return 'Off';
      if (Math.abs(ratio - 0.5) < 0.12) return 'Fast';
      if (Math.abs(ratio - 1.0) < 0.12) return 'Normal';
      if (Math.abs(ratio - 2.0) < 0.25) return 'Slow';
      return 'Custom';
    }

    // Resolve scenario labels from the same inventory used by the pre-game
    // rules guide. The old hand-written chain silently labeled all newer 7–8
    // scenarios (including Eight Islands) as Four Islands.
    const mmRaw = String(rules.mapMode || 'classic').toLowerCase();
    const mmUi = String(uiMapModeFromRules(rules)).toLowerCase();
    const is56 = mmUi === 'classic56' || mmUi === 'seafarers56';
    const is78 = mmUi === 'classic78' || mmUi === 'seafarers78';
    const mapMode = mmRaw === 'seafarers'
      ? (is78 ? 'Seafarers 7–8' : is56 ? 'Seafarers 5–6' : 'Seafarers')
      : (is78 ? 'Classic 7–8' : is56 ? 'Classic 5–6' : 'Classic');
    const scenRaw = String(rules.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g, '_');
    const scenarioAliases = {
      six: 'six_islands', eight_islands: 'eight_islands_78', fog: 'fog_island',
      desert: 'through_the_desert', scattered_56: 'cartographer_56_random',
      cartographer: 'cartographer_4_manual',
      new_shores: 'heading_for_new_shores',
    };
    const normalizedScenario = scenarioAliases[scenRaw] || scenRaw;
    const scenarioDefinition = LOBBY_RULES_SCENARIOS[normalizedScenario];
    const scenario = mmRaw === 'seafarers'
      ? (scenarioDefinition?.label || `Unknown scenario (${scenRaw})`)
      : (rules.customMap === true ? 'Custom Map' : '—');
    const usesPairedTurns = state?.paired?.enabled === true || is56 || is78;

    const vpToWin = Math.max(0, Math.floor(Number(rules.victoryPointsToWin ?? rules.victoryTarget ?? 10)));
    const configuredResourceMax = Math.floor(Number(rules.baseResourcesPerType ?? rules.baseResourceCount));
    const maxIndividualResource = Number.isFinite(configuredResourceMax)
      ? Math.max(1, Math.min(40, configuredResourceMax))
      : defaultBaseResourcesFor(rules);

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
    addRow('Max Individual Resource', `${maxIndividualResource} cards per resource type`);
    if (mmRaw === 'seafarers') addRow('Exploration Points', rules.explorationPointsEnabled === false ? 'Disabled' : 'Enabled');
    const ddMode = Math.floor(Number(rules.devDeckMode ?? 25));
    const ddSpec = (ddMode === 38)
      ? '38 cards (21K / 3RB / 3Inv / 3Mon / 8VP)'
      : (ddMode === 13)
        ? '13 cards (7K / 1RB / 1Inv / 1Mon / 3VP)'
        : '25 cards (14K / 2RB / 2Inv / 2Mon / 5VP)';
    addRow('Development Deck', ddSpec);
    addRow('Discard Limit', `${discardLimit}`);
    addRow('Friendly Robber', rules.friendlyRobber === true ? 'Enabled' : 'Disabled');
    addRow('Dice Algorithm', diceAlgorithmInfo(rules.diceAlgorithm).label);
    addRow('Timer Speed', `${timerSpeedName()} (setup ${msToS(setupMs)} / turn ${msToS(playMs)} / micro ${msToS(microMs)})`);

    table.appendChild(tbody);
    content.appendChild(table);

    if (usesPairedTurns) {
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

  let diceStatsScope = 'all';
  let diceStatsView = 'comparison';
  const DICE_ROLL_PROBABILITIES = Object.freeze({
    2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36,
    7: 6 / 36,
    8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36,
  });

  function buildDiceStatsModalBody() {
    const { wrap, content } = makeScalableToolWrap('dice', 'Scale Dice Stats tab');
    const rollStats = state?.stats?.rolls || null;
    const allRolls = rollStats?.byNumber || state?.diceStats || {};
    const perPlayer = rollStats?.byPlayer || {};
    const availablePlayers = (state?.players || []).filter((player) => player?.id && perPlayer[player.id]);
    if (diceStatsScope !== 'all' && !availablePlayers.some((player) => player.id === diceStatsScope)) {
      diceStatsScope = 'all';
    }
    const selectedPlayer = availablePlayers.find((player) => player.id === diceStatsScope) || null;
    const ds = selectedPlayer ? perPlayer[selectedPlayer.id] : allRolls;
    const total = Array.from({ length: 11 }, (_, index) => index + 2)
      .reduce((sum, roll) => sum + Number(ds?.[roll] || 0), 0);

    const controls = document.createElement('div');
    controls.className = 'diceStatsControls';
    const addSelect = (labelText, value, options, onChange) => {
      const control = document.createElement('label');
      control.className = 'diceStatsControl';
      const label = document.createElement('span');
      label.className = 'labelTiny';
      label.textContent = labelText;
      const select = document.createElement('select');
      select.className = 'input';
      for (const optionSpec of options) {
        const option = document.createElement('option');
        option.value = optionSpec.value;
        option.textContent = optionSpec.label;
        select.appendChild(option);
      }
      select.value = value;
      select.addEventListener('change', () => onChange(select.value));
      control.appendChild(label);
      control.appendChild(select);
      controls.appendChild(control);
    };

    addSelect('Rolls to inspect', diceStatsScope, [
      { value: 'all', label: 'All players' },
      ...availablePlayers.map((player) => ({ value: player.id, label: player.name || 'Player' })),
    ], (value) => {
      diceStatsScope = value;
      refreshDiceStatsModalBody();
    });
    addSelect('Probability view', diceStatsView, [
      { value: 'comparison', label: 'Full comparison' },
      { value: 'counts', label: 'Counts vs expected' },
      { value: 'percentages', label: 'Percentages vs probability' },
    ], (value) => {
      diceStatsView = value;
      refreshDiceStatsModalBody();
    });
    content.appendChild(controls);

    const note = document.createElement('div');
    note.className = 'smallNote diceProbabilityNote';
    note.textContent = `${selectedPlayer ? `${selectedPlayer.name || 'Player'} rolls` : 'All player rolls'}: ${total}. Expected values use the standard probability of two six-sided dice.`;
    content.appendChild(note);

    const headers = diceStatsView === 'counts'
      ? ['Roll', 'Count', 'Expected', 'Difference']
      : diceStatsView === 'percentages'
        ? ['Roll', 'Actual %', 'Expected %', 'Difference']
        : ['Roll', 'Count', 'Actual %', 'Expected %', 'Expected Count', 'Difference'];
    const table = document.createElement('table');
    table.className = 'diceTable';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const header of headers) {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let roll = 2; roll <= 12; roll++) {
      const count = Number(ds?.[roll] || 0);
      const actualPct = total ? (count / total) * 100 : 0;
      const expectedPct = Number(DICE_ROLL_PROBABILITIES[roll] || 0) * 100;
      const expectedCount = total * Number(DICE_ROLL_PROBABILITIES[roll] || 0);
      const differenceCount = count - expectedCount;
      const differencePct = actualPct - expectedPct;
      const values = diceStatsView === 'counts'
        ? [String(roll), String(count), expectedCount.toFixed(1), `${differenceCount >= 0 ? '+' : ''}${differenceCount.toFixed(1)}`]
        : diceStatsView === 'percentages'
          ? [String(roll), `${actualPct.toFixed(1)}%`, `${expectedPct.toFixed(1)}%`, `${differencePct >= 0 ? '+' : ''}${differencePct.toFixed(1)} pp`]
          : [String(roll), String(count), `${actualPct.toFixed(1)}%`, `${expectedPct.toFixed(1)}%`, expectedCount.toFixed(1), `${differencePct >= 0 ? '+' : ''}${differencePct.toFixed(1)} pp`];
      const tr = document.createElement('tr');
      values.forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (index === values.length - 1) {
          const delta = diceStatsView === 'counts' ? differenceCount : differencePct;
          td.className = `diceStatsDelta ${delta > 0.0001 ? 'positive' : (delta < -0.0001 ? 'negative' : 'neutral')}`;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'diceStatsTableWrap';
    tableWrap.appendChild(table);
    content.appendChild(tableWrap);
    return wrap;
  }

  function refreshDiceStatsModalBody() {
    if (activeToolModal !== 'dice' || ui.modal.classList.contains('hidden')) return;
    ui.modalBody.innerHTML = '';
    ui.modalBody.appendChild(buildDiceStatsModalBody());
  }

  function openDiceModal() {
    activeToolModal = 'dice';
    openModal({
      title: 'Dice Statistics',
      bodyNode: buildDiceStatsModalBody(),
      actions: [{ label: 'Close', primary: true, onClick: closeModal }],
    });
  }

  function openTexturePackModal() {
    activeToolModal = 'texture-pack';
    const body = document.createElement('div');
    body.className = 'stack';

    const note = document.createElement('div');
    note.className = 'smallNote';
    note.textContent = isCasualTextureMode()
      ? 'Casual Play supports Default and Simplified. Custom texture imports are disabled in this mode.'
      : 'Texture packs change only this browser’s graphics. You can switch packs during a match without reloading or interrupting other players.';
    body.appendChild(note);

    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = 'Texture pack';
    body.appendChild(label);

    const select = document.createElement('select');
    select.className = 'input';
    const activeId = activeTexturePackId();
    const casual = isCasualTextureMode();
    for (const pack of listLocalTexturePacks().filter(pack => !casual || pack.builtin)) {
      const option = document.createElement('option');
      option.value = pack.id;
      const count = Array.isArray(pack.assets) ? pack.assets.length : 0;
      option.textContent = `${pack.name}${pack.builtin ? ' (built in)' : ` (${count}/${DEFAULT_TEXTURE_ASSET_REL.length} textures)`}`;
      select.appendChild(option);
    }
    select.value = activeId;
    body.appendChild(select);

    const active = activeTexturePackMeta();
    const current = document.createElement('div');
    current.className = 'smallNote';
    current.textContent = `Currently active: ${active && active.name ? active.name : 'Default'}`;
    body.appendChild(current);

    openModal({
      title: 'Change Texture Pack',
      bodyNode: body,
      actions: [
        ...(!casual ? [{
          label: 'Import Pack',
          onClick: () => {
            closeModal();
            if (!ui.texturePackFileInput) return;
            try { ui.texturePackFileInput.value = ''; } catch (_) {}
            ui.texturePackFileInput.click();
          },
        }] : []),
        { label: 'Cancel', onClick: closeModal },
        {
          label: 'Apply',
          primary: true,
          onClick: () => {
            const targetId = String(select.value || DEFAULT_TEXTURE_PACK_ID).trim() || DEFAULT_TEXTURE_PACK_ID;
            closeModal();
            void setActiveTexturePackById(targetId, { announce: true, forcePublish: false }).catch((err) => {
              setError(err && err.message ? err.message : 'Failed to switch texture pack.');
            });
          },
        },
      ],
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
      refreshDiceStatsModalBody();
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
    if (!room || !myPlayerId || room.ranked) return;
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
    if (!room || room.ranked || phaseNow === 'lobby' || !myPlayerId) return;
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

  let rankedBallotClockTimer = null;
  function stopRankedBallotClock() {
    if (rankedBallotClockTimer !== null) clearInterval(rankedBallotClockTimer);
    rankedBallotClockTimer = null;
  }

  function drawRankedMiniMap(canvas, tiles) {
    if (!canvas || !Array.isArray(tiles) || !tiles.length) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width, height = canvas.height;
    context.clearRect(0, 0, width, height);
    const visible = tiles.filter((tile) => Number.isFinite(tile.x) && Number.isFinite(tile.y));
    if (!visible.length) return;
    const halfWidth = Math.sqrt(3) / 2;
    const minX = Math.min(...visible.map((tile) => tile.x - halfWidth));
    const maxX = Math.max(...visible.map((tile) => tile.x + halfWidth));
    const minY = Math.min(...visible.map((tile) => tile.y - 1));
    const maxY = Math.max(...visible.map((tile) => tile.y + 1));
    const scale = Math.min((width - 18) / (maxX - minX), (height - 16) / (maxY - minY));
    const offX = (width - (maxX - minX) * scale) / 2;
    const offY = (height - (maxY - minY) * scale) / 2;
    const palette = {
      sea: '#255575', forest: '#367e46', pasture: '#8aaf50', field: '#d3b45c',
      hills: '#bd754b', mountains: '#9298a6', desert: '#e7c98e',
      gold: '#daa43d', unexplored: '#687480', fog: '#687480',
    };
    for (const tile of visible) {
      const cx = offX + (tile.x - minX) * scale;
      const cy = offY + (tile.y - minY) * scale;
      context.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30);
        const x = cx + Math.cos(angle) * scale * .985;
        const y = cy + Math.sin(angle) * scale * .985;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      // Use the same face-down appearance as the live game; reject accidental
      // hidden terrain/number fields even if a cached catalog is outdated.
      const faceDown = tile.fog === true || tile.type === 'unexplored' || tile.type === 'fog';
      context.fillStyle = faceDown ? palette.unexplored : (palette[tile.type] || '#738497');
      context.fill();
      if (faceDown) {
        context.save();
        context.clip();
        context.strokeStyle = 'rgba(224, 237, 247, .22)';
        context.lineWidth = Math.max(.8, scale * .045);
        for (let dx = -scale; dx < scale * 1.5; dx += scale * .28) {
          context.beginPath(); context.moveTo(cx + dx, cy - scale); context.lineTo(cx + dx + scale, cy + scale);
          context.stroke();
        }
        context.restore();
      }
      context.lineWidth = Math.max(.75, scale * .055);
      context.strokeStyle = 'rgba(5, 15, 24, .82)';
      context.stroke();
      // Readable number tokens help players judge the dice distribution.
      if (!faceDown && scale >= 14 && Number.isInteger(tile.number) && tile.number >= 2 && tile.number <= 12) {
        const tokenRadius = Math.min(11, Math.max(5.5, scale * .31));
        context.beginPath();
        context.arc(cx, cy, tokenRadius, 0, Math.PI * 2);
        context.fillStyle = '#f7ecd8';
        context.fill();
        context.fillStyle = (tile.number === 6 || tile.number === 8) ? '#9a292a' : '#283036';
        context.font = `bold ${Math.max(8, tokenRadius * 1.3)}px system-ui`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(tile.number), cx, cy + .4);
      }
    }
  }

  function renderRankedScenarioVote() {
    const host = ui.rankedScenarioVote;
    const ballot = room && room.rankedScenarioVote;
    const show = !!(host && room?.ranked && ballot && Array.isArray(ballot.options) && ballot.options.length && currentRoomPhase() === 'lobby');
    if (!host) return;
    host.classList.toggle('hidden', !show);
    host.innerHTML = '';
    if (!show) { stopRankedBallotClock(); return; }

    const votes = ballot.votes || {};
    const myVote = votes[myPlayerId] || '';
    stopRankedBallotClock();
    const heading = document.createElement('div');
    heading.className = 'rankedScenarioVoteHeading';
    const title = document.createElement('div');
    title.className = 'rankedScenarioVoteTitle';
    title.textContent = 'CHOOSE YOUR BATTLEGROUND';
    const countdown = document.createElement('div');
    countdown.className = 'rankedScenarioCountdown';
    countdown.setAttribute('role', 'timer');
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((Number(ballot.endsAt || (ballot.createdAt + 30_000)) - serverNowMs()) / 1000));
      countdown.textContent = `${remaining}s`;
      countdown.classList.toggle('expiring', remaining <= 10);
    };
    updateCountdown();
    rankedBallotClockTimer = setInterval(() => {
      if (!room?.ranked || currentRoomPhase() !== 'lobby' || room.rankedScenarioVote?.selectedId) {
        stopRankedBallotClock();
        return;
      }
      updateCountdown();
    }, 200);
    heading.append(title, countdown);
    const note = document.createElement('div');
    note.className = 'rankedScenarioVoteInstructions';
    const voteCount = (room.players || []).filter((player) => player && votes[player.id]).length;
    note.textContent = `${voteCount}/${room.players.length} votes cast · Change your vote freely until the timer ends · Ties are decided randomly · Abstentions allowed`;
    const options = document.createElement('div');
    options.className = 'rankedScenarioOptions';

    for (const option of ballot.options) {
      const count = Object.values(votes).filter((scenarioId) => scenarioId === option.id).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `rankedScenarioOption${myVote === option.id ? ' selected' : ''}`;
      button.setAttribute('aria-pressed', myVote === option.id ? 'true' : 'false');
      button.disabled = amRoomSpectator() || !myPlayerId || serverNowMs() >= Number(ballot.endsAt || (ballot.createdAt + 30_000));
      const preview = document.createElement('canvas');
      preview.className = 'rankedScenarioMapPreview';
      preview.width = 420;
      preview.height = 280;
      preview.setAttribute('aria-label', `Randomized preview of ${option.label || option.id}`);
      const optionInfo = document.createElement('div');
      optionInfo.className = 'rankedScenarioOptionInfo';
      const optionName = document.createElement('strong');
      optionName.textContent = option.label || option.id;
      const optionCount = document.createElement('span');
      optionCount.textContent = `${count} vote${count === 1 ? '' : 's'}`;
      const selectedMarker = document.createElement('span');
      selectedMarker.className = 'rankedScenarioSelectedMark';
      selectedMarker.textContent = amRoomSpectator() ? 'SPECTATOR' : (myVote === option.id ? '✓ YOUR VOTE' : 'SELECT MAP');
      optionInfo.append(optionName, optionCount);
      button.append(preview, optionInfo, selectedMarker);
      drawRankedMiniMap(preview, option.preview);
      button.addEventListener('click', () => send({ type: 'ranked_scenario_vote', scenarioId: option.id }));
      options.appendChild(button);
    }
    host.append(heading, note, options);
  }

  function renderLobby() {
    const isRankedLobby = !!(room?.ranked && currentRoomPhase() === 'lobby');
    // The card is hidden while a match is in progress. Always restore it
    // before taking the no-room early return; otherwise leaving a completed
    // game shows only the "Start a new adventure" heading until a refresh
    // rebuilds the original HTML classes.
    const gameStarted = !!(room && state && state.phase && state.phase !== 'lobby');
    if (ui.lobbyCard) ui.lobbyCard.classList.toggle('hidden', gameStarted);
    document.body.classList.toggle('ranked-lobby', isRankedLobby);
    document.body.classList.toggle('uncreated-lobby', !room);
    document.body.classList.toggle('hasLobbyMapPreview', !!(room && !room.ranked && currentRoomPhase() === 'lobby' && state?.geom?.tiles?.length));
    if (isRankedLobby || !room) setMobileLobbyMapOpen(false);
    if (!isRankedLobby) stopRankedBallotClock();
    const shareLabel = document.getElementById('roomShareLabel');
    if (shareLabel) shareLabel.textContent = isRankedLobby ? 'Spectator link · Invite viewers before the match begins' : 'Direct join link';
    refreshLobbyJoinLinkUi();
    refreshTexturePackUi();

    if (ui.myAccountLabel) ui.myAccountLabel.textContent = authUser ? `${authUser.username} (${authUser.displayName || authUser.username})` : '—';
    if (!ui.playersList) return;

    ui.playersList.innerHTML = '';
    if (!room) {
      // Pre-lobby forms never expose access or leave controls. Visibility is
      // selected through Public / Private / Casual entry paths instead.
      $('lobbyAccessControls')?.classList.add('hidden');
      $('leaveLobbyTopBtn')?.classList.add('hidden');
      if (ui.roomBox) ui.roomBox.classList.add('hidden');
      if (ui.setupCard) ui.setupCard.classList.add('hidden');
      return;
    }

    const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
    const amHost = !!(!room.ranked && myPlayerId && room.hostId === myPlayerId);
    const activePackIdNow = activeTexturePackId();

    function aiDifficultyDisplayName(value) {
      const difficulty = String(value || 'easy').trim().toLowerCase().replace(/-/g, '_');
      if (difficulty === 'neural_net' || difficulty === 'neural' || difficulty === 'expert') return 'Expert';
      if (difficulty === 'hard') return 'Hard';
      if (difficulty === 'medium') return 'Medium';
      return 'Easy';
    }

    function appendMemberRow(p, roleLabel) {
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'playerRow';
      if (!p.isAI && p.id !== myPlayerId) {
        row.title = 'Right-click to send a friend request';
        row.addEventListener('contextmenu', async (event) => {
          event.preventDefault();
          try { const result = await accountApi('friend-request', { userId: p.id }); toast(result.message || 'Friend request sent.'); }
          catch (error) { setError(error.message || 'Could not send friend request.'); }
        });
      }

      const tag = document.createElement('div');
      tag.className = 'playerTag';
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = p.color;
      const name = document.createElement('div');
      let label = p.name;
      if (p.isAI) label += ` (AI · ${aiDifficultyDisplayName(p.aiDifficulty || room.aiDifficulty)})`;
      if (roleLabel === 'spectator') label += ' (spectator)';
      if (!room.ranked && p.id === room.hostId) label += ' (host)';
      else if (!room.ranked && room.bossIds?.includes(p.id)) label += ' (boss)';
      if (p.id === myPlayerId) label += ' (you)';
      name.textContent = label;
      name.setAttribute('data-i18n-skip', ''); // Player names are not UI strings.
      tag.appendChild(badge);
      tag.appendChild(name);
      if (!p.isAI && p.id) {
        tag.classList.add('playerProfileLink');
        tag.title = p.id === myPlayerId ? 'View your player stats' : 'View player stats · Right-click to send a friend request';
        tag.tabIndex = 0;
        tag.setAttribute('role', 'button');
        tag.addEventListener('click', () => void openPlayerProfileById(p.id));
        tag.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void openPlayerProfileById(p.id);
          }
        });
      }
      row.appendChild(tag);

      if (roleLabel === 'player') {
        const readyStatus = document.createElement('div');
        const playerReady = !!(p.isAI || p.ready === true);
        readyStatus.className = `lobbyReadyStatus ${playerReady ? 'ready' : 'waiting'}`;
        readyStatus.textContent = playerReady ? 'Ready' : 'Not Ready';
        readyStatus.setAttribute('aria-label', `${p.name || 'Player'} is ${playerReady ? 'ready' : 'not ready'}`);
        row.appendChild(readyStatus);
      }

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
        useBtn.title = isBuiltinTexturePackId(playerPackId)
          ? `Switch to the built-in ${playerPackName} texture pack.`
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
          if (!room.ranked) {
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

        if (!gameStartedNow && !room.ranked) {
          const spectBtn = document.createElement('button');
          spectBtn.className = 'btn';
          spectBtn.type = 'button';
          spectBtn.style.padding = '6px 8px';
          spectBtn.style.fontSize = '11px';
          spectBtn.textContent = (roleLabel === 'spectator') ? 'Join Game' : 'Spectator Mode';
          if (p.id === room.hostId) spectBtn.title = 'Pass host to the longest-waiting player and spectate (another human must be present).';
          spectBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
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
    renderRankedScenarioVote();
    // AI fill controls (host-only, lobby only)
    try {
      const gameStartedNow = !!(state && state.phase && state.phase !== 'lobby');
      const canManageAI = !!(!room.ranked && !room.challenge && myPlayerId && (room.hostId === myPlayerId || room.bossIds?.includes(myPlayerId)) && !gameStartedNow);
      if (ui.aiFillRow) ui.aiFillRow.classList.toggle('hidden', !canManageAI);

      // AI difficulty (host-only, lobby only)
      if (ui.aiDifficultySelect) {
        ui.aiDifficultySelect.disabled = !canManageAI;
        const rawDiff = String(room?.aiDifficulty || 'easy').toLowerCase();
        let diff = 'easy';
        if (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') diff = rawDiff;
        else if (rawDiff === 'expert' || rawDiff === 'neural_net' || rawDiff === 'neural' || rawDiff === 'neural-net') diff = 'expert';
        else if (rawDiff === 'catanatron') diff = 'hard';
        ui.aiDifficultySelect.value = diff;
      }

      if (canManageAI && ui.aiFillSelect) {
        const raw = String(room?.rules?.mapMode || 'classic').toLowerCase();
        const mm = (raw === 'seafarers') ? 'seafarers'
          : (raw === 'classic56' || raw === 'classic_5_6' || raw === 'classic-5-6' || raw === 'classic5_6' || raw === 'classic5-6')
            ? 'classic56'
            : 'classic';
        const allowSolo = !!room?.casual || !!room?.rules?.customMap || (mm === 'seafarers' && uiIsTestBuilderScenario(room?.rules));
        const scen = String(room?.rules?.seafarersScenario || 'four_islands').toLowerCase().replace(/-/g,'_');
        const isSeafarers56 = (mm === 'seafarers' && (scen === 'six_islands' || scen === 'through_the_desert_56' || scen === 'fog_island_56' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'test_builder_56'));
        // Respect the server's lobby capacity: all permanent 7–8 scenarios
        // (not just editable custom maps) allow Fill to 7 or Fill to 8.
        const is78Lobby = Number(room?.maxPlayers) === 8 || String(room?.rules?.mapMode || '') === 'classic78' || uiMapModeFromRules(room?.rules) === 'seafarers78';
        const minPlayers = is78Lobby ? 7 : ((mm === 'classic56') ? 5 : (isSeafarers56 ? 5 : (allowSolo ? 1 : 2)));
        const maxPlayers = is78Lobby ? 8 : ((mm === 'classic56') ? 6 : (isSeafarers56 ? 6 : 4));
        // Selecting 7 must still show the 7-player AI controls even though
        // maxPlayers sent by the server is now 7 rather than 8.
        const capacity = Math.floor(Number(room?.maxPlayers));
        const effectiveMaxPlayers = Number.isFinite(capacity) && capacity >= minPlayers ? Math.min(maxPlayers, capacity) : maxPlayers;
        const humans = (room.players || []).filter(pp => pp && !pp.isAI).length;
        const current = (room.players || []).length;
        const start = Math.max(humans, 1);
        const prev = ui.aiFillSelect.value;
        ui.aiFillSelect.innerHTML = '';
        for (let target = start; target <= effectiveMaxPlayers; target++) {
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
        // The game-size selection is authoritative. Prefer filling to that
        // total so a single Fill click can make the lobby start-ready.
        const configured = String(room?.rules?.playerCount ?? '');
        const matches = value => [...ui.aiFillSelect.options].some(o => o.value === value);
        const desired = matches(String(current)) ? String(current)
          : String(Math.max(start, Math.min(effectiveMaxPlayers, current)));
        ui.aiFillSelect.value = desired;
        if (ui.aiFillMaxBtn) {
          ui.aiFillMaxBtn.disabled = current >= effectiveMaxPlayers;
          ui.aiFillMaxBtn.title = current >= effectiveMaxPlayers
            ? 'All lobby seats are filled' : `Add AI until all ${effectiveMaxPlayers} seats are filled`;
        }
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
    const gameStartedForControls = !!(state && state.phase && state.phase !== 'lobby');
    if (ui.lobbyCard) ui.lobbyCard.classList.toggle('hidden', gameStartedForControls);
    if (ui.setupCard) ui.setupCard.classList.toggle('hidden', gameStarted || !!room.ranked);
    if (ui.setupCard) ui.setupCard.classList.toggle('challengeLockedSetup', !!room.challenge);
    if ($('challengeLobbyNote')) {
      $('challengeLobbyNote').classList.toggle('hidden', !room.challenge);
      if (room.challenge) {
        const kind = room.challenge.kind === 'daily' ? 'Daily' : 'Weekly';
        const scenario = room.rules?.mapMode === 'classic' || String(room.rules?.mapMode || '').startsWith('classic')
          ? 'Classic' : String(room.rules?.seafarersScenario || 'Islands').replace(/_?(?:56|78)(?:_[78])?$/, '').replace(/_/g,' ');
        $('challengeLobbyNote').textContent = `${kind} Challenge · ${room.challenge.playerCount} seats · ${room.challenge.dayId || room.challenge.weekId} · ${scenario} · Balanced Bag · Expert AI · Unranked stats${kind === 'Daily' ? ' · Solo, single attempt' : ''}`;
      } else $('challengeLobbyNote').textContent = '';
    }
    const accessControls = $('lobbyAccessControls');
    if (accessControls) accessControls.classList.toggle('hidden', !!room.ranked || !!room.challenge || !!room.tutorial || gameStartedForControls);
    $('leaveLobbyTopBtn')?.classList.toggle('hidden', !!room.ranked || !!room.tutorial || gameStartedForControls);
    if ($('lobbyFriendsOnlyToggle')) {
      $('lobbyFriendsOnlyToggle').checked = !!room.friendsOnly;
      $('lobbyFriendsOnlyToggle').disabled = room.hostId !== myPlayerId || gameStartedForControls;
    }

    const r = room.rules || { discardLimit: 7, setupTurnMs: 60000, playTurnMs: 30000, microPhaseMs: 15000 };
    const isHost = !!(myPlayerId && (room.hostId === myPlayerId || room.bossIds?.includes(myPlayerId))) && !gameStartedForControls && !room.challenge && !room.tutorial;

    if (ui.discardLimitInput) {
      ui.discardLimitInput.value = r.discardLimit ?? 7;
      ui.discardLimitInput.disabled = !isHost;
    }
    if (ui.friendlyRobberToggle) {
      ui.friendlyRobberToggle.checked = r.friendlyRobber === true;
      ui.friendlyRobberToggle.disabled = !isHost;
    }
    if (ui.timerSpeedSelect) {
      const factor = Number(r.setupTurnMs ?? 60000) / 60000;
      const preset = factor === 0 ? 'off' : factor <= 0.75 ? 'fast' : (factor >= 1.5 ? 'slow' : 'normal');
      ui.timerSpeedSelect.value = preset;
      ui.timerSpeedSelect.disabled = !isHost;
    }
    if (ui.diceAlgorithmSelect) {
      ui.diceAlgorithmSelect.value = normalizeDiceAlgorithmClient(r.diceAlgorithm);
      ui.diceAlgorithmSelect.disabled = !isHost;
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
      if (ui.mapFamilySelect) {
        ui.mapFamilySelect.value = ui.mapModeSelect.value.startsWith('seafarers') ? 'seafarers' : 'classic';
        ui.mapFamilySelect.disabled = !isHost;
      }
      if (ui.classicCustomMapToggle) {
        const isClassic = ['classic','classic56','classic78'].includes(ui.mapModeSelect.value);
        ui.classicCustomMapRow?.classList.toggle('hidden', !isClassic);
        ui.classicCustomMapToggle.checked = isClassic && r.customMap === true;
        ui.classicCustomMapToggle.disabled = !isHost;
      }
    }
    syncPlayerCountOptions(r.playerCount);
    if (ui.playerCountSelect) ui.playerCountSelect.disabled = !isHost || gameStarted;
    if (ui.devDeckModeSelect) {
      const ddRaw = String(r.devDeckMode ?? 25);
      ui.devDeckModeSelect.value = (ddRaw === '13' || ddRaw === '25' || ddRaw === '38') ? ddRaw : '25';
      ui.devDeckModeSelect.disabled = !isHost;
    }
    if (ui.randomMapAtStartToggle) {
      ui.randomMapAtStartToggle.checked = r.randomMapAtStart === true;
      ui.randomMapAtStartToggle.disabled = !isHost || !!r.customMap || ((r.mapMode === 'seafarers') && uiIsTestBuilderScenario(r));
    }
    // Seafarers scenario selector
    const mmNow = uiMapModeFromRules(r);
    if (ui.scenarioRow) ui.scenarioRow.classList.toggle('hidden', mmNow !== 'seafarers');
    if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mmNow !== 'seafarers56');
    if (ui.scenario78Row) ui.scenario78Row.classList.toggle('hidden', mmNow !== 'seafarers78');
    if (ui.mapScenario78Select) {
      const allowed=new Set(Array.from(ui.mapScenario78Select.options).map(o=>o.value));
      const savedValue = String(r.seafarersScenario || 'eight_islands_78');
      // Existing saved lobbies may still use the former separate 7/8 options.
      const value = savedValue.startsWith('cartographer_78_') ? 'cartographer_78'
        : savedValue.startsWith('scattered_tiles_78_') ? 'scattered_tiles_78' : savedValue;
      ui.mapScenario78Select.value = allowed.has(value) ? value : 'eight_islands_78';
      ui.mapScenario78Select.disabled=!isHost || mmNow!=='seafarers78';
    }
    if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mmNow !== 'classic56');
    if (ui.sixIslandsNote) ui.sixIslandsNote.classList.toggle('hidden', mmNow !== 'seafarers56');
    ui.scenario78Note?.classList.toggle('hidden', !['classic78','seafarers78'].includes(mmNow));
    const isSeafarersSetup = mmNow === 'seafarers' || mmNow === 'seafarers56' || mmNow === 'seafarers78';
    if (ui.explorationPointsRow) ui.explorationPointsRow.classList.toggle('hidden', !isSeafarersSetup);
    if (ui.explorationPointsToggle) {
      ui.explorationPointsToggle.checked = r.explorationPointsEnabled !== false;
      ui.explorationPointsToggle.disabled = !isHost || !isSeafarersSetup;
    }
    if (ui.mapScenarioSelect) {
      // Only meaningful when mapMode === 'seafarers'.
      ui.mapScenarioSelect.value = (mmNow === 'seafarers') ? (r.seafarersScenario || 'four_islands') : 'four_islands';
      ui.mapScenarioSelect.disabled = !isHost || (mmNow !== 'seafarers');
    }
    if (ui.mapScenario56Select) {
      const scen56 = (mmNow === 'seafarers56') ? String(r.seafarersScenario || 'six_islands').toLowerCase() : 'six_islands';
      const allowed56 = new Set(['six_islands', 'through_the_desert_56', 'fog_island_56', 'cartographer_56_manual', 'cartographer_56_random', 'test_builder_56']);
      ui.mapScenario56Select.value = allowed56.has(scen56) ? scen56 : 'six_islands';
      ui.mapScenario56Select.disabled = !isHost || (mmNow !== 'seafarers56');
    }
    enforceCasualMapRestrictions();

    // Custom Map map and port painting UI (host-only)
    const scenNow = String(r.seafarersScenario || 'four_islands').toLowerCase();
    const showTestBuilder = isCustom78Map(r) || ((mmNow === 'seafarers' || mmNow === 'seafarers56') && uiIsTestBuilderScenario(r)) || (['classic','classic56'].includes(mmNow) && r.customMap === true);
    if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTestBuilder || gameStarted || selectedPlayMode === 'casual' || !!room?.casual);
    if (ui.testToolSelect) ui.testToolSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testBrushSelect) ui.testBrushSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testNumberSelect) ui.testNumberSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testPortSelect) ui.testPortSelect.disabled = !isHost || !showTestBuilder || gameStarted;
    if (ui.testResetBtn) ui.testResetBtn.disabled = !isHost || !showTestBuilder || gameStarted;
    for (const button of [ui.customMapDownloadBtn,ui.customMapUploadBtn]) if(button) button.disabled = !isHost || !showTestBuilder || gameStarted;
    syncTestBuilderToolModeUi();

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
    if ($('loadRulesBtn')) $('loadRulesBtn').disabled = !isHost;

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
      const s1 = Math.round(Number(r.setupTurnMs ?? 60000) / 1000);
      const s2 = Math.round(Number(r.playTurnMs ?? 30000) / 1000);
      const s3 = Math.round(Number(r.microPhaseMs ?? 15000) / 1000);
      const mmUi = uiMapModeFromRules(r);
      const mmL = String(mmUi || 'classic').toLowerCase();
      const scen = (mmL === 'seafarers56')
        ? (((r.seafarersScenario === 'through_the_desert_56') || (r.seafarersScenario === 'fog_island_56') || (r.seafarersScenario === 'cartographer_56_manual') || (r.seafarersScenario === 'cartographer_56_random') || (r.seafarersScenario === 'test_builder_56')) ? r.seafarersScenario : 'six_islands')
        : (r.seafarersScenario || 'four_islands');
      const scenLabel = LOBBY_RULES_SCENARIOS[scen]?.label || `Unknown scenario (${scen})`;
      const is56 = mmL === 'classic56';
      const mapLabel = mmL === 'seafarers78' ? `seafarers 7–8 (${scenLabel.toLowerCase()}, paired turns)`
        : mmL === 'classic78' ? 'classic 7–8 (paired turns)'
        : mmL === 'seafarers56' ? `seafarers 5–6 (${scenLabel.toLowerCase()}, paired turns)`
        : mmL === 'seafarers' ? `seafarers (${scenLabel})`
        : is56 ? 'classic 5–6 (paired turns)' : 'classic';
      const vpWin = Math.floor(Number(r.victoryPointsToWin ?? r.victoryTarget ?? defaultVictoryPointsFor(r)));
      const ddMode = Math.floor(Number(r.devDeckMode ?? 25));
      const ddCards = (ddMode === 13 || ddMode === 25 || ddMode === 38) ? ddMode : 25;
      const explorationLabel = (mmL === 'seafarers' || mmL === 'seafarers56' || mmL === 'seafarers78')
        ? ` • Exploration VP: ${r.explorationPointsEnabled === false ? 'off' : 'on'}`
        : '';
      const friendlyRobberLabel = ` • Friendly Robber: ${r.friendlyRobber === true ? 'on' : 'off'}`;
      const diceLabel = diceAlgorithmInfo(r.diceAlgorithm).label;
      ui.rulesPreview.textContent = `Map: ${mapLabel} • Win: ${vpWin} VP • Dev deck: ${ddCards} cards • Dice: ${diceLabel} • Discard limit: ${r.discardLimit ?? 7}${friendlyRobberLabel}${explorationLabel} • Setup turn: ${s1}s • Turn: ${s2}s • Micro: ${s3}s`;
    }

    const allowSolo = !!room?.casual || !!r.customMap || (mmNow === 'seafarers' && uiIsTestBuilderScenario(r));
    const mmLow = String(mmNow || 'classic').toLowerCase();
    const isClassic56 = (mmLow === 'classic56' || mmLow === 'classic_5_6' || mmLow === 'classic-5-6' || mmLow === 'classic5_6' || mmLow === 'classic5-6');
    const isSix = uiIsSixIslands(r);
    const minPlayers = isClassic56 ? 5 : (isSix ? 5 : (allowSolo ? 1 : 2));
    const gameIsInLobby = !state || state.phase === 'lobby';
    const meInLobby = (room.players || []).find((player) => player && player.id === myPlayerId) || null;
    const allPlayersReady = ((room.players || []).length > 0 && (room.players || []).every((player) => !!(player && (player.isAI || player.ready === true))));
    if (ui.readyBtn) {
      const showReady = !!(gameIsInLobby && meInLobby && !meInLobby.isAI && !room.ranked);
      const amReady = !!(meInLobby && meInLobby.ready === true);
      ui.readyBtn.classList.toggle('hidden', !showReady);
      ui.readyBtn.classList.toggle('primary', amReady);
      ui.readyBtn.classList.toggle('readyYes', amReady);
      ui.readyBtn.classList.toggle('readyNo', !amReady);
      ui.readyBtn.textContent = amReady ? 'Unready' : 'Ready';
      ui.readyBtn.setAttribute('aria-pressed', amReady ? 'true' : 'false');
      ui.readyBtn.disabled = !showReady;
    }
    ui.startBtn.classList.toggle('hidden', !!room.ranked || !(myPlayerId && room.hostId === myPlayerId));
    ui.startBtn.disabled = !(myPlayerId && room.hostId === myPlayerId && room.players.length >= minPlayers && allPlayersReady && gameIsInLobby && !room.ranked);
    ui.startBtn.title = allPlayersReady ? '' : 'Every player must be ready before the game can start.';
  }

    // ---- Account / Auth ----
  if (ui.registerBtn) ui.registerBtn.addEventListener('click', async () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    try { await authenticateInBrowser('register', { username, password, displayName }); }
    catch (error) { setError(error.message || 'Register failed.'); }
  });

  if (ui.loginBtn) ui.loginBtn.addEventListener('click', async () => {
    setError(null);
    const username = (ui.usernameInput?.value || '').trim();
    const password = (ui.passwordInput?.value || '').trim();
    const displayName = (ui.nameInput?.value || '').trim();
    if (!username || !password) { setError('Enter a username and password.'); return; }
    try { await authenticateInBrowser('login', { username, password, displayName }); }
    catch (error) { setError(error.message || 'Login failed.'); }
  });

  if (ui.logoutBtn) ui.logoutBtn.addEventListener('click', async () => {
    stopRankedMatchmaking();
    setError(null);
    try { await authApi('logout'); } catch (_) {}
    clearAuthLocal();
    websocketAuthenticated = false;
    clearRecentRoom();
    clearRoomQueryFromUrl();
    // Optional: drop room state
    room = null;
    myPlayerId = null;
    try { setLocalPanelLayoutOwnerKey(null); } catch (_) {}
    isHost = false;
    if (ui.roomBox) ui.roomBox.classList.add('hidden');
    reconnectForCookieAuth();
  });

  if (ui.userManagementBtn) ui.userManagementBtn.addEventListener('click', openUserManagementScreen);
  if (ui.forgotPasswordBtn) ui.forgotPasswordBtn.addEventListener('click', openForgotPasswordScreen);

  async function portalLogin() {
    const username = String($('landingUsername')?.value || '').trim();
    const password = String($('landingPassword')?.value || '');
    const errorBox = $('landingError');
    errorBox?.classList.add('hidden');
    if (!username || !password) { if (errorBox) { errorBox.textContent = 'Enter your username or email and password.'; errorBox.classList.remove('hidden'); } return; }
    try { await authenticateInBrowser('login', { username, password }); }
    catch (error) { if (errorBox) { errorBox.textContent = error.message || 'Login failed.'; errorBox.classList.remove('hidden'); } }
  }

  // Both portal screens share one accessible modal. Legal pages are separate,
  // static documents served from /public so they also work on Cloudflare Assets.
  {
    const overlay = $('legalOverlay');
    const dialog = $('legalDialog');
    const frame = $('legalDocumentFrame');
    const heading = $('legalDialogTitle');
    const link = $('legalDocumentLink');
    const closeButton = $('legalDialogClose');
    const documents = {
      terms: { label: 'Terms of Service', path: '/terms_of_service.html' },
      privacy: { label: 'Privacy Policy', path: '/privacy_policy.html' },
    };
    let trigger = null;
    const closeLegal = () => {
      if (!overlay || overlay.classList.contains('hidden')) return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      // Clear the document so hidden iframes are not unnecessarily retained.
      if (frame) frame.removeAttribute('src');
      trigger?.focus?.();
      trigger = null;
    };
    const openLegal = (key, from) => {
      const documentInfo = documents[key];
      if (!documentInfo || !overlay || !frame || !heading || !link) return;
      trigger = from;
      heading.textContent = documentInfo.label;
      frame.title = documentInfo.label;
      frame.src = documentInfo.path;
      link.href = documentInfo.path;
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      dialog?.focus();
      closeButton?.focus();
    };
    document.querySelectorAll('[data-legal-page]').forEach((button) => {
      button.addEventListener('click', () => openLegal(button.dataset.legalPage, button));
    });
    closeButton?.addEventListener('click', closeLegal);
    overlay?.addEventListener('click', (event) => { if (event.target === overlay) closeLegal(); });
    document.addEventListener('keydown', (event) => {
      if (!overlay || overlay.classList.contains('hidden')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeLegal(); }
      // Keep tab navigation in the dialog while it is open.
      if (event.key === 'Tab') {
        const controls = Array.from(dialog?.querySelectorAll('button, a[href], iframe') || []);
        const focusable = controls.filter((element) => !element.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  $('landingLoginBtn')?.addEventListener('click', portalLogin);
  $('landingPassword')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') portalLogin(); });
  {
    const passwordInput = $('landingPassword');
    const revealButton = $('landingPasswordReveal');
    const setPasswordRevealed = (revealed) => {
      if (!passwordInput || !revealButton) return;
      passwordInput.type = revealed ? 'text' : 'password';
      revealButton.textContent = revealed ? 'Hide' : 'Show';
      revealButton.classList.toggle('revealing', revealed);
      revealButton.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    };
    revealButton?.addEventListener('pointerdown', (event) => { event.preventDefault(); revealButton.setPointerCapture?.(event.pointerId); setPasswordRevealed(true); });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'blur']) revealButton?.addEventListener(eventName, () => setPasswordRevealed(false));
    revealButton?.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setPasswordRevealed(true); } });
    revealButton?.addEventListener('keyup', () => setPasswordRevealed(false));
    window.addEventListener('blur', () => setPasswordRevealed(false));
  }
  $('landingCreateBtn')?.addEventListener('click', () => $('registerOverlay')?.classList.remove('hidden'));
  $('registerCloseBtn')?.addEventListener('click', () => $('registerOverlay')?.classList.add('hidden'));
  $('landingForgotBtn')?.addEventListener('click', openForgotPasswordScreen);
  $('registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = $('registerMessage');
    const password = String($('registerPassword')?.value || '');
    if (password !== String($('registerConfirm')?.value || '')) { if (message) message.textContent = 'Passwords do not match.'; return; }
    try {
      const result = await authApi('register-with-email', { displayName: $('registerName')?.value, username: $('registerUsername')?.value, email: $('registerEmail')?.value, password });
      if (message) message.textContent = result.message;
      event.target.reset();
    } catch (error) { if (message) message.textContent = error.message || 'Registration failed.'; }
  });
  function stopRankedMatchmaking() {
    pendingRankedMatchmaking = false;
    if (rankedQueueActive && ws?.readyState === WebSocket.OPEN) send({ type: 'ranked_queue_leave' });
    rankedQueueActive = false;
    $('rankedReadyBtn')?.classList.remove('hidden');
    $('rankedCancelBtn')?.classList.add('hidden');
    const status = $('rankedStatus');
    if (status) status.textContent = 'Ready to start matchmaking.';
  }

  function activatePlayMode(mode, { skipRecentRoom = false } = {}) {
    $('playModeNotice')?.classList.add('hidden');
    if (mode === 'casual' && !room) { requestedLobbyVisibility = 'private'; prepareUncreatedLobby(); }
    if (mode === 'unranked' && !room) {
      // A fresh switch starts with a clean lobby; only normal navigation can
      // recover a recently occupied room that the player has NOT left.
      prepareUncreatedLobby();
      const code = skipRecentRoom ? '' : recentRoomCodeForUser();
      if (code && websocketAuthenticated && ws?.readyState === WebSocket.OPEN && authUser) {
        pendingRecentRoomRejoinCode = code;
        send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
      }
    }
    if (mode === 'ranked') clearRecentRoom();
    if (mode === 'journey') { journeyView = 'home'; roomNotFoundVisible = false; roomNotFoundReturnView = ''; pendingRecentRoomRejoinCode = ''; }
    selectedPlayMode = mode;
    try { sessionStorage.setItem('hexsettlers_play_mode', mode); } catch (_) {}
    updateAuthUi();
    enforceCasualMapRestrictions();
  }

  function choosePlayMode(mode) {
    if (!['ranked', 'unranked', 'casual', 'journey'].includes(mode) || pendingPlayModeSwitch) return;
    if (!tutorialUnlocked()) { if (mode === 'casual') beginLiveTutorial(); else setError('Complete Start Your Adventure to unlock this game type.'); return; }
    if (room && (room.casual ? 'casual' : room.ranked ? 'ranked' : 'unranked') !== mode) {
      if (!roomConnectionReady || ws?.readyState !== WebSocket.OPEN) {
        setError('Reconnect to your current lobby before changing game types.');
        return;
      }
      // Wait for the server to remove our membership and elect the oldest
      // remaining human host BEFORE revealing a different lobby or queue.
      pendingPlayModeSwitch = mode;
      send({ type: 'leave_room', switchMode: mode });
      return;
    }
    activatePlayMode(mode);
  }
  window.addEventListener('pagehide', () => {
    if (rankedQueueActive && ws?.readyState === WebSocket.OPEN) send({ type: 'ranked_queue_leave' });
    rankedQueueActive = false;
    pendingRankedMatchmaking = false;
  });
  $('rankedModeBtn')?.addEventListener('click', () => choosePlayMode('ranked'));
  $('rankedBackBtn')?.addEventListener('click', () => {
    if (room?.ranked) { setError('Leave your ranked lobby before returning to game types.'); return; }
    stopRankedMatchmaking();
    returnToGameTypeSelection('');
  });
  $('unrankedModeBtn')?.addEventListener('click', () => choosePlayMode('journey'));
  $('journeyPublicBtn')?.addEventListener('click', () => setJourneyView('public'));
  $('journeyPrivateBtn')?.addEventListener('click', () => setJourneyView('private'));
  $('journeyChallengeBtn')?.addEventListener('click', () => setJourneyView('challenge'));
  $('challengePeriodTabs')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-period]');
    if (!button) return;
    selectedChallengeKind = button.dataset.period === 'daily' ? 'daily' : 'weekly';
    $('challengePeriodTabs').querySelectorAll('button').forEach(tab => tab.classList.toggle('active', tab === button));
    renderChallengeMaps();
  });
  $('journeyBackBtn')?.addEventListener('click', journeyBack);
  $('publicLobbyDetailBackBtn')?.addEventListener('click', () => setJourneyView('public'));
  $('publicLobbyDetailRefreshBtn')?.addEventListener('click', requestPublicLobbies);
  $('publicLobbyDetailJoinBtn')?.addEventListener('click', () => {
    const lobby = publicLobbyResults.find(item => item.code === selectedPublicLobbyCode);
    if (lobby && Number(lobby.openSeats) > 0) beginJourneyJoin(lobby.code);
  });
  for (const id of ['publicLobbySearch','publicLobbyMapFilter','publicLobbySeatsFilter','publicLobbyTimerFilter','publicLobbySort']) {
    $(id)?.addEventListener('input', renderPublicLobbyList);
    $(id)?.addEventListener('change', renderPublicLobbyList);
  }
  $('journeyHostPublicBtn')?.addEventListener('click', () => beginJourneyHost('public'));
  $('journeyHostPrivateBtn')?.addEventListener('click', () => beginJourneyHost('private'));
  $('journeyRefreshBtn')?.addEventListener('click', requestPublicLobbies);
  $('journeyPrivateJoinBtn')?.addEventListener('click', () => beginJourneyJoin($('journeyPrivateCode')?.value));
  $('journeyPrivateCode')?.addEventListener('keydown', e => { if (e.key === 'Enter') beginJourneyJoin(e.target.value); });
  $('journeyTutorialBtn')?.addEventListener('click', beginLiveTutorial);
  $('journeyRankedBtn')?.addEventListener('click', () => choosePlayMode('ranked'));
  $('journeyCasualBtn')?.addEventListener('click', () => choosePlayMode('casual'));
  $('journeySettingsBtn')?.addEventListener('click', () => setJourneyView('settings'));
  $('journeySettingsBackBtn')?.addEventListener('click', () => { setAudioPanelVisible(false); setJourneyView('home'); });
  const sandboxControls = [
    ['sandboxToolsScale', 'sandboxToolsScaleValue', 'tools_bar', 'settingsMockTop'],
    ['sandboxTurnScale', 'sandboxTurnScaleValue', 'turn_bar', 'settingsMockBottom'],
    ['sandboxLogScale', 'sandboxLogScaleValue', 'log_panel', 'settingsMockLog'],
    ['sandboxResourcesScale', 'sandboxResourcesScaleValue', 'resources_panel', 'settingsMockSide'],
  ];
  function syncSettingsSandbox() {
    for (const [id, valueId, scaleKey, sampleId] of sandboxControls) {
      const input = $(id); if (!input) continue;
      const pct = Math.round(getToolUiScale(scaleKey) * 100);
      input.value = String(pct);
      $(valueId).textContent = `${pct}%`;
      $(sampleId)?.style.setProperty('--mock-scale', String(pct / 100));
    }
    const width = getSavedRightSidebarWidth();
    if ($('sandboxRightWidth')) $('sandboxRightWidth').value = String(width);
    if ($('sandboxRightWidthValue')) $('sandboxRightWidthValue').textContent = `${width}px`;
    $('settingsMockSide')?.style.setProperty('--mock-width', String(Math.round(width / 15)) + '%');
    let ratio = 50; try { ratio = Math.round((Number(localStorage.getItem(MOBILE_SPLIT_RATIO_KEY)) || .4) * 100); } catch (_) {}
    if ($('sandboxMobileRatio')) $('sandboxMobileRatio').value = String(ratio);
    if ($('sandboxMobileRatioValue')) $('sandboxMobileRatioValue').textContent = `${ratio}%`;
  }
  for (const [id, valueId, scaleKey, sampleId] of sandboxControls) $(id)?.addEventListener('input', event => {
    const pct = Number(event.target.value);
    setToolUiScale(scaleKey, pct / 100);
    $(valueId).textContent = `${pct}%`;
    $(sampleId)?.style.setProperty('--mock-scale', String(pct / 100));
  });
  $('sandboxRightWidth')?.addEventListener('input', event => {
    const width = Number(event.target.value);
    setRightSidebarWidth(width, { persist: true });
    $('sandboxRightWidthValue').textContent = `${width}px`;
    $('settingsMockSide')?.style.setProperty('--mock-width', String(Math.round(width/15))+'%');
  });
  $('sandboxMobileRatio')?.addEventListener('input', event => {
    const ratio = Number(event.target.value);
    try { localStorage.setItem(MOBILE_SPLIT_RATIO_KEY, String(ratio / 100)); } catch (_) {}
    $('sandboxMobileRatioValue').textContent = `${ratio}%`;
  });
  $('sandboxAudioBtn')?.addEventListener('click', () => setAudioPanelVisible(true));
  $('sandboxResetBtn')?.addEventListener('click', () => {
    for (const [, , key] of sandboxControls) setToolUiScale(key, 1);
    setRightSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH, { persist: true });
    try { localStorage.removeItem(MOBILE_SPLIT_RATIO_KEY); } catch (_) {}
    syncSettingsSandbox();
  });
  $('roomNotFoundBackBtn')?.addEventListener('click', () => {
    roomNotFoundVisible = false;
    clearRoomQueryFromUrl();
    if (roomNotFoundReturnView) {
      const backTo = roomNotFoundReturnView;
      roomNotFoundReturnView = '';
      selectedPlayMode = 'journey';
      try { sessionStorage.setItem('hexsettlers_play_mode', 'journey'); } catch (_) {}
      setJourneyView(backTo);
      updateAuthUi();
      return;
    }
    returnToGameTypeSelection('');
  });
  // Move the guide from anywhere on its header. The board remains interactive.
  (() => {
    const guide = $('tutorialGuide');
    const handle = guide?.querySelector('.tutorialGuideHeader');
    if (!guide || !handle) return;
    let drag = null;
    handle.setAttribute('title', 'Drag to reposition the tutorial guide');
    function clampGuide() {
      if (!guide.style.left) return;
      const bounds = guide.getBoundingClientRect();
      guide.style.left = `${Math.max(4, Math.min(window.innerWidth - bounds.width - 4, bounds.left))}px`;
      guide.style.top = `${Math.max(4, Math.min(window.innerHeight - bounds.height - 4, bounds.top))}px`;
    }
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button, a, input')) return;
      const rect = guide.getBoundingClientRect();
      drag = { id:event.pointerId, x:event.clientX - rect.left, y:event.clientY - rect.top, w:rect.width, h:rect.height };
      guide.style.right = 'auto';
      guide.style.left = `${rect.left}px`;
      guide.style.top = `${rect.top}px`;
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      guide.style.left = `${Math.max(4, Math.min(innerWidth - drag.w - 4, event.clientX - drag.x))}px`;
      guide.style.top = `${Math.max(4, Math.min(innerHeight - drag.h - 4, event.clientY - drag.y))}px`;
    });
    function stop(event) { if (drag?.id === event.pointerId) drag = null; }
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    window.addEventListener('resize', clampGuide);
  })();
  $('tutorialGuidePrimary')?.addEventListener('click', () => {
    if (!liveTutorialRoom()) return;
    if (state?.tutorial?.completed || tutorialUnlocked()) {
      tutorialContinueToAllGames = true;
      returnToModeSelectionAfterLeave = true;
      send({ type: 'leave_room' });
    } else if (!state || state.phase === 'lobby') {
      send({ type: 'start_game' });
    }
  });
  $('tutorialGuideExit')?.addEventListener('click', () => {
    if (!liveTutorialRoom()) return;
    returnToModeSelectionAfterLeave = true;
    send({ type: 'leave_room' });
  });
  // Refresh discovery without exposing private or friends-only rooms.
  setInterval(() => { if (selectedPlayMode === 'journey' && (journeyView === 'public' || journeyView === 'detail')) requestPublicLobbies(); }, 12000);
  setInterval(() => { if (selectedPlayMode === 'journey' && journeyView === 'challenge') requestChallengeMaps(); }, 60000);
  $('casualModeBtn')?.addEventListener('click', () => choosePlayMode('casual'));
  $('uncreatedLobbyBackBtn')?.addEventListener('click', () => {
    if (room) return;
    if (selectedPlayMode === 'casual') returnToGameTypeSelection('');
    else if (selectedPlayMode === 'unranked') returnToAllGamesAfterExit();
  });
  function startRankedMatchmaking() {
    rankedQueueActive = true;
    const status = $('rankedStatus');
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingRankedMatchmaking = true;
      if (status) status.textContent = 'Connecting to the matchmaking server…';
      websocketReconnectAllowed = true;
      scheduleWebsocketReconnect(0);
      return;
    }
    pendingRankedMatchmaking = false;
    if (status) status.textContent = 'Joining the matchmaking queue…';
    $('rankedReadyBtn')?.classList.add('hidden');
    $('rankedCancelBtn')?.classList.remove('hidden');
    send({ type: 'ranked_queue_join' });
  }
  $('rankedReadyBtn')?.addEventListener('click', startRankedMatchmaking);
  $('rankedCancelBtn')?.addEventListener('click', stopRankedMatchmaking);
  $('changeModeBtn')?.addEventListener('click', () => {
    const phase = room?.gamePhase || state?.phase || 'lobby';
    if (room && (room.ranked ? phase !== 'game-over' : phase !== 'lobby' && phase !== 'game-over')) {
      setAccountMenuOpen(false);
      setError('Finish or leave the active game before changing game types.');
      return;
    }
    stopRankedMatchmaking();
    selectedPlayMode = ''; roomNotFoundVisible = false;
    try { sessionStorage.removeItem('hexsettlers_play_mode'); } catch (_) {}
    setAccountMenuOpen(false);
    updateAuthUi();
  });
  function setAccountMenuOpen(open) {
    const menu = $('accountMenu');
    const orb = $('accountOrb');
    if (!menu) return;
    menu.classList.toggle('hidden', !open);
    orb?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('accountOrb')?.addEventListener('click', () => setAccountMenuOpen($('accountMenu')?.classList.contains('hidden')));
  document.addEventListener('click', (event) => {
    const menu = $('accountMenu');
    const orb = $('accountOrb');
    if (!menu || menu.classList.contains('hidden')) return;
    const target = event.target;
    if (target instanceof Node && (menu.contains(target) || orb?.contains(target))) return;
    setAccountMenuOpen(false);
  });
  $('accountManageBtn')?.addEventListener('click', () => { stopRankedMatchmaking(); $('accountMenu')?.classList.add('hidden'); openUserManagementScreen({ selfOnly: true }); });
  $('friendsBtn')?.addEventListener('click', () => { setAccountMenuOpen(false); $('friendsOverlay')?.classList.remove('hidden'); loadFriends(); });
  $('friendsCloseBtn')?.addEventListener('click', () => $('friendsOverlay')?.classList.add('hidden'));
  $('friendRequestForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = $('friendUsernameInput');
    const username = String(field?.value || '').trim().replace(/^@/, '');
    if (!username) return;
    const sendButton = $('friendRequestSendBtn');
    if (sendButton) sendButton.disabled = true;
    try {
      await accountApi('friend-request', { username });
      if (field) field.value = '';
      const status = $('friendRequestStatus');
      if (status) { status.textContent = 'Request sent.'; status.classList.remove('hidden'); }
    } catch (_) {
      // Do not disclose a recipient's existence or account state to the sender.
      const status = $('friendRequestStatus');
      if (status) { status.textContent = 'Could not send request. Try again.'; status.classList.remove('hidden'); }
    } finally {
      if (sendButton) sendButton.disabled = false;
    }
  });
  $('friendUsernameInput')?.addEventListener('input', () => $('friendRequestStatus')?.classList.add('hidden'));
  $('accountPlayerStatsBtn')?.addEventListener('click', () => {
    setAccountMenuOpen(false);
    openHistoryOverlay('players');
  });
  $('accountGameLogBtn')?.addEventListener('click', () => {
    setAccountMenuOpen(false);
    if (state && state.phase && state.phase !== 'lobby') {
      // While playing, show the live game log, not an unrelated past game.
      setLogPanelVisible(true);
    } else {
      // From the mode selection or lobby, open completed games and their logs.
      openHistoryOverlay('games');
    }
  });
  $('accountLogoutBtn')?.addEventListener('click', () => { setAccountMenuOpen(false); ui.logoutBtn?.click(); });
  async function loadFriends() {
    const list = $('friendsList'); if (!list) return; list.textContent = 'Loading…';
    try {
      const result = await accountApi('friends');
      list.innerHTML = '';
      for (const request of (result.requests || [])) {
        const row = document.createElement('div');
        row.className = 'friendRow';
        const name = document.createElement('button');
        name.className = 'friendProfileLink';
        name.textContent = `${request.displayName} (@${request.username})`;
        name.addEventListener('click', () => void openPlayerProfileById(request.id));
        row.append(name, document.createTextNode(' sent a request '));
        for (const [label, accept] of [['Accept', true], ['Decline', false]]) {
          const button = document.createElement('button');
          button.className = `btn${accept ? ' primary' : ''}`;
          button.textContent = label;
          button.addEventListener('click', async () => { await accountApi('friend-response', { userId: request.id, accept }); loadFriends(); });
          row.appendChild(button);
        }
        list.appendChild(row);
      }
      const canInvite = !!(roomConnectionReady && room?.code && myPlayerId && currentRoomPhase() === 'lobby');
      for (const friend of (result.friends || [])) {
        const row = document.createElement('div');
        row.className = 'friendRow friendRowWithActions';
        const profile = document.createElement('button');
        profile.type = 'button';
        profile.className = 'friendRowProfile friendProfileButton';
        profile.innerHTML = `<span><strong></strong><small></small></span><span class="friendPresence"></span>`;
        profile.querySelector('strong').textContent = friend.displayName;
        profile.querySelector('small').textContent = `@${friend.username}`;
        profile.querySelector('.friendPresence').textContent = friend.online ? 'Online' : 'Offline';
        profile.querySelector('.friendPresence').classList.toggle('online', !!friend.online);
        profile.addEventListener('click', () => void openPlayerProfileById(friend.id));
        row.appendChild(profile);
        if (canInvite) {
          const invite = document.createElement('button');
          invite.type = 'button';
          invite.className = 'btn friendInviteBtn';
          invite.textContent = room.ranked ? 'Invite to Watch' : 'Invite to Lobby';
          invite.disabled = !friend.online;
          invite.title = friend.online ? 'Invite this friend to your current lobby' : 'Friend is offline';
          invite.addEventListener('click', async () => {
            if (!roomConnectionReady || !room?.code || currentRoomPhase() !== 'lobby') return;
            invite.disabled = true;
            try {
              await accountApi('invite-to-lobby', { userId: friend.id, roomCode: room.code });
              invite.textContent = 'Invite Sent';
            } catch (error) {
              toast(error.message || 'Could not send invite.');
              invite.disabled = !friend.online;
            }
          });
          row.appendChild(invite);
        }
        list.appendChild(row);
      }
      if (!(result.friends || []).length && !(result.requests || []).length) list.textContent = 'No friends yet. Add someone by username above.';
      const badge = $('friendBadge');
      if (badge) {
        badge.textContent = String((result.requests || []).length);
        badge.classList.toggle('hidden', !(result.requests || []).length);
      }
    }
    catch (error) { list.textContent = error.message || 'Could not load friends.'; }
  }

  if (ui.rejoinLastBtn) ui.rejoinLastBtn.addEventListener('click', () => {
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    const code = (ui.codeInput?.value || '').trim().toUpperCase() || (() => { try { return localStorage.getItem(LAST_ROOM_KEY) || ''; } catch (_) { return ''; } })();
    if (!code) { setError('Enter a room code first.'); return; }
    websocketReconnectAllowed = true;
    pendingManualRejoinCode = code;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      scheduleWebsocketReconnect(0);
      return;
    }
    pendingManualRejoinCode = '';
    send({ type: 'rejoin_room', code, displayName: (ui.nameInput?.value || '').trim() });
  });

  // ---- Lobby ----
  if (ui.lobbyRulesBtn) ui.lobbyRulesBtn.addEventListener('click', openLobbyRulesPage);
  if (ui.rulesPageCloseBtn) ui.rulesPageCloseBtn.addEventListener('click', closeLobbyRulesPage);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.rulesPage && !ui.rulesPage.classList.contains('hidden')) {
      event.preventDefault();
      closeLobbyRulesPage();
    }
  });

  ui.createBtn.addEventListener('click', () => {
    websocketReconnectAllowed = true;
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    state = null;
    resetViewportForRoomChange();
    render();
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Host';
    send({ type: 'create_room', displayName, casual: selectedPlayMode === 'casual', visibility: selectedPlayMode === 'casual' ? 'private' : requestedLobbyVisibility });
  });

  ui.joinBtn.addEventListener('click', () => {
    websocketReconnectAllowed = true;
    setError(null);
    if (!authUser) { setError('Log in first.'); return; }
    state = null;
    resetViewportForRoomChange();
    render();
    const code = (ui.codeInput?.value || '').trim().toUpperCase();
    const displayName = (ui.nameInput?.value || '').trim() || authUser.displayName || 'Player';
    send({ type: 'join_room', code, displayName });
  });

  ui.roomCode?.addEventListener('click', () => {
    const code = String(room?.code || '').trim().toUpperCase();
    if (code) copyText(code);
  });
  ui.roomJoinLinkInput?.addEventListener('click', () => {
    refreshLobbyJoinLinkUi();
    const link = String(ui.roomJoinLinkInput?.value || '');
    if (link) copyText(link);
  });
  const lobbyAccessChanged = () => {
    if (!room || room.ranked || room.hostId !== myPlayerId) return;
    send({ type:'set_lobby_access', friendsOnly: !!$('lobbyFriendsOnlyToggle')?.checked });
  };
  $('lobbyFriendsOnlyToggle')?.addEventListener('change', lobbyAccessChanged);
  $('leaveLobbyTopBtn')?.addEventListener('click', openLeaveRoomConfirm);
  ui.startBtn.addEventListener('click', () => {
    setError(null);
    send({ type: 'start_game' });
  });

  if (ui.readyBtn) ui.readyBtn.addEventListener('click', () => {
    if (!room || !myPlayerId) return;
    const me = (room.players || []).find((player) => player && player.id === myPlayerId);
    if (!me || me.isAI) return;
    send({ type: 'set_ready', ready: me.ready !== true });
  });

  if (ui.aiDifficultySelect) ui.aiDifficultySelect.addEventListener('change', () => {
    if (!room || !myPlayerId || room.hostId !== myPlayerId) return;
    const difficulty = String(ui.aiDifficultySelect.value || 'easy').toLowerCase();
    send({ type: 'set_ai_difficulty', difficulty });
  });

  const canChangeLobbyAi = () => !!(room && myPlayerId && !room.ranked &&
    (room.hostId === myPlayerId || room.bossIds?.includes(myPlayerId)) &&
    (!state || state.phase === 'lobby'));
  if (ui.aiFillSelect) ui.aiFillSelect.addEventListener('change', () => {
    if (!canChangeLobbyAi()) return;
    const target = Math.floor(Number(ui.aiFillSelect.value));
    if (!Number.isFinite(target) || target < 1) return;
    // The server is authoritative for the AI player count.
    send({ type: 'fill_ai', targetCount: target });
  });
  ui.aiFillMaxBtn?.addEventListener('click', () => {
    if (!canChangeLobbyAi() || !ui.aiFillSelect) return;
    const targets = Array.from(ui.aiFillSelect.options, option => Number(option.value))
      .filter(value => Number.isFinite(value) && value >= 1);
    if (!targets.length) return;
    const max = Math.max(...targets);
    if ((room.players || []).length >= max) return;
    send({ type: 'fill_ai', targetCount: max });
  });

  function scenarioForResizedBoard(oldScenario, newMode) {
    if (!newMode.startsWith('seafarers')) return '';
    const key = String(oldScenario || 'four_islands');
    const size = newMode === 'seafarers78' ? '78' : newMode === 'seafarers56' ? '56' : '4';
    if (key.startsWith('fog_island')) return size === '4' ? 'fog_island' : `fog_island_${size}`;
    if (key.startsWith('through_the_desert')) return size === '4' ? 'through_the_desert' : `through_the_desert_${size}`;
    if (key.startsWith('scattered_tiles') || /cartographer_.*random/.test(key)) {
      return size === '78' ? 'scattered_tiles_78' : size === '56' ? 'cartographer_56_random' : 'cartographer_4_random';
    }
    if (key.startsWith('cartographer')) {
      return size === '78' ? 'cartographer_78' : size === '56' ? 'cartographer_56_manual' : 'cartographer_4_manual';
    }
    if (key.startsWith('test_builder')) return size === '78' ? 'test_builder_78' : size === '56' ? 'test_builder_56' : 'test_builder';
    if (key === 'heading_for_new_shores' && size === '4') return key;
    // Four/Six/Eight Islands are the size variants of the island scenario.
    return size === '78' ? 'eight_islands_78' : size === '56' ? 'six_islands' : 'four_islands';
  }
  let lastSetupPlayerCount = String(ui.playerCountSelect?.value || '4');
  function applyVisibleMapSizeSelection() {
    if (!ui.mapModeSelect || !ui.mapFamilySelect || !ui.playerCountSelect) return;
    const selectedCount = String(ui.playerCountSelect.value || '4');
    const playerCountChanged = selectedCount !== lastSetupPlayerCount;
    lastSetupPlayerCount = selectedCount;
    const oldMode = ui.mapModeSelect.value;
    const oldScenario = oldMode === 'seafarers78' ? ui.mapScenario78Select?.value : oldMode === 'seafarers56' ? ui.mapScenario56Select?.value : ui.mapScenarioSelect?.value;
    const mode = mapModeForSetupSelection(ui.mapFamilySelect.value, ui.playerCountSelect.value);
    const scenario = scenarioForResizedBoard(oldScenario, mode);
    // Resizing changes only the variant of the selected scenario. Reset any
    // manual overrides to the default rules of that resulting scenario.
    if (mode !== oldMode || playerCountChanged) {
      if (mode === 'seafarers' && ui.mapScenarioSelect) ui.mapScenarioSelect.value = scenario;
      if (mode === 'seafarers56' && ui.mapScenario56Select) ui.mapScenario56Select.value = scenario;
      if (mode === 'seafarers78' && ui.mapScenario78Select) ui.mapScenario78Select.value = scenario;
      vpTouched = false; baseResourceCountTouched = false;
      if (ui.discardLimitInput) ui.discardLimitInput.value = '7';
      if (ui.diceAlgorithmSelect) ui.diceAlgorithmSelect.value = 'probability_corrected';
      if (ui.devDeckModeSelect) ui.devDeckModeSelect.value = '25';
      if (ui.friendlyRobberToggle) ui.friendlyRobberToggle.checked = false;
      if (ui.randomMapAtStartToggle) ui.randomMapAtStartToggle.checked = false;
      if (ui.explorationPointsToggle) ui.explorationPointsToggle.checked = !scenario.startsWith('fog_island');
      if (ui.timerSpeedSelect) ui.timerSpeedSelect.value = room?.casual || selectedPlayMode === 'casual' ? 'off' : 'normal';
      if (ui.victoryPointsSelect) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode:mode, seafarersScenario:scenario }));
      if (ui.baseResourceCountSelect) ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode:mode, seafarersScenario:scenario, seafarersScenario56:scenario }));
    }
    ui.mapModeSelect.value = mode;
    ui.mapModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  ui.mapFamilySelect?.addEventListener('change', applyVisibleMapSizeSelection);
  ui.playerCountSelect?.addEventListener('change', applyVisibleMapSizeSelection);

  if (ui.mapModeSelect && ui.scenarioRow) {
    ui.mapModeSelect.addEventListener('change', () => {
      const mm = (ui.mapModeSelect.value || 'classic');
      if (ui.mapFamilySelect) ui.mapFamilySelect.value = mm.startsWith('seafarers') ? 'seafarers' : 'classic';
      syncPlayerCountOptions();
      ui.scenarioRow.classList.toggle('hidden', mm !== 'seafarers');
      if (ui.scenario56Row) ui.scenario56Row.classList.toggle('hidden', mm !== 'seafarers56');
      if (ui.scenario78Row) ui.scenario78Row.classList.toggle('hidden', mm !== 'seafarers78');
      if (ui.mapScenario78Select) ui.mapScenario78Select.disabled=(mm !== 'seafarers78') || !!(room && room.hostId !== myPlayerId);
      if (ui.classic56Note) ui.classic56Note.classList.toggle('hidden', mm !== 'classic56');
      if (ui.sixIslandsNote) {
        ui.sixIslandsNote.classList.toggle('hidden', mm !== 'seafarers56');
      }
      ui.scenario78Note?.classList.toggle('hidden', !['classic78','seafarers78'].includes(mm));
      if (mm === 'classic78' && ui.classicCustomMapToggle) ui.classicCustomMapToggle.checked = false;
      const isSeafarersSetup = mm === 'seafarers' || mm === 'seafarers56' || mm === 'seafarers78';
      if (ui.explorationPointsRow) ui.explorationPointsRow.classList.toggle('hidden', !isSeafarersSetup);
      if (ui.explorationPointsToggle) ui.explorationPointsToggle.disabled = !isSeafarersSetup || (room && room.hostId !== myPlayerId);
      if (ui.mapScenarioSelect) ui.mapScenarioSelect.disabled = (mm !== 'seafarers') || (room && room.hostId !== myPlayerId);
      if (ui.mapScenario56Select) ui.mapScenario56Select.disabled = (mm !== 'seafarers56') || (room && room.hostId !== myPlayerId);

      const selectedTestScenario = mm==='seafarers78' ? ui.mapScenario78Select?.value : (mm === 'seafarers56' ? ui.mapScenario56Select?.value : ui.mapScenarioSelect?.value);
      if (!applyingSettingsTemplate && ui.explorationPointsToggle && isSeafarersSetup) {
        const scenario = String(selectedTestScenario || '').toLowerCase().replace(/-/g, '_');
        ui.explorationPointsToggle.checked = scenario !== 'fog_island' && scenario !== 'fog_island_56' && scenario !== 'fog_island_78';
      }
      enforceCasualMapRestrictions();
      const showTest = (mm==='classic78' && !!ui.classicCustomMapToggle?.checked) || (mm==='seafarers78' && ui.mapScenario78Select?.value==='test_builder_78') || ((mm === 'seafarers' || mm === 'seafarers56') && uiIsTestBuilderScenario({ seafarersScenario: selectedTestScenario })) || (['classic','classic56'].includes(mm) && !!ui.classicCustomMapToggle?.checked);
      ui.classicCustomMapRow?.classList.toggle('hidden', !['classic','classic56','classic78'].includes(mm));
      if (ui.classicCustomMapToggle) ui.classicCustomMapToggle.disabled = !!(room && room.hostId !== myPlayerId);
      syncTestBuilderToolModeUi();
      if (ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden', !showTest || selectedPlayMode === 'casual' || !!room?.casual);

      // If the host hasn't manually set a win target yet, auto-fill the scenario default.
      if (ui.victoryPointsSelect && !vpTouched) {
        const scen = (mm === 'seafarers')
          ? (ui.mapScenarioSelect ? ui.mapScenarioSelect.value : (room?.rules?.seafarersScenario || 'four_islands'))
          : ((mm === 'seafarers56') ? (ui.mapScenario56Select?.value || 'six_islands') : (mm === 'seafarers78' ? (ui.mapScenario78Select?.value || 'eight_islands_78') : 'four_islands'));
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
      if (!applyingSettingsTemplate && ui.explorationPointsToggle) {
        ui.explorationPointsToggle.checked = String(ui.mapScenarioSelect.value).toLowerCase().replace(/-/g, '_') !== 'fog_island';
      }
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario: ui.mapScenarioSelect.value }));
      if (ui.baseResourceCountSelect && !baseResourceCountTouched) ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode: mm, seafarersScenario: ui.mapScenarioSelect.value }));
    });
  }

  if (ui.mapScenario56Select) {
    ui.mapScenario56Select.addEventListener('change', () => {
      if (!ui.victoryPointsSelect) return;
      const mm = (ui.mapModeSelect ? (ui.mapModeSelect.value || 'classic') : 'classic');
      if (ui.testBuilderRow) {
        const showTest = (mm === 'seafarers56' && uiIsTestBuilderScenario({ seafarersScenario: ui.mapScenario56Select.value }));
        ui.testBuilderRow.classList.toggle('hidden', !showTest);
      }
      if (mm !== 'seafarers56') return;
      if (!applyingSettingsTemplate && ui.explorationPointsToggle) {
        ui.explorationPointsToggle.checked = String(ui.mapScenario56Select.value).toLowerCase().replace(/-/g, '_') !== 'fog_island_56';
      }
      if (!vpTouched) ui.victoryPointsSelect.value = String(defaultVictoryPointsFor({ mapMode: mm, seafarersScenario56: ui.mapScenario56Select.value }));
      if (ui.baseResourceCountSelect && !baseResourceCountTouched) ui.baseResourceCountSelect.value = String(defaultBaseResourcesFor({ mapMode: mm, seafarersScenario56: ui.mapScenario56Select.value }));
    });
  }

  if (ui.mapScenario78Select) {
    ui.mapScenario78Select.addEventListener('change', () => {
      const mm=ui.mapModeSelect?.value || 'classic';
      if(mm!=='seafarers78') return;
      const scen=ui.mapScenario78Select.value;
      if(ui.testBuilderRow) ui.testBuilderRow.classList.toggle('hidden',scen!=='test_builder_78');
      if(!applyingSettingsTemplate && ui.explorationPointsToggle) ui.explorationPointsToggle.checked=scen!=='fog_island_78';
      if(ui.victoryPointsSelect&&!vpTouched) ui.victoryPointsSelect.value=String(defaultVictoryPointsFor({mapMode:mm,seafarersScenario:scen}));
      syncTestBuilderToolModeUi();
    });
  }
  if (ui.victoryPointsSelect) {
    ui.victoryPointsSelect.addEventListener('change', () => { vpTouched = true; });
  }
  if (ui.baseResourceCountSelect) {
    ui.baseResourceCountSelect.addEventListener('change', () => { baseResourceCountTouched = true; });
  }
  if (ui.testToolSelect) {
    ui.testToolSelect.addEventListener('change', syncTestBuilderToolModeUi);
  }

  // v23: settings are committed to the room automatically; the Save button
  // now creates a named, reusable subset of settings, not an implicit commit.
  const SETTINGS_TEMPLATE_STORAGE = 'hexsettlers_rules_templates_v23';
  const SETTINGS_FIELDS = [
    ['discardLimitInput', 'Discard limit'], ['friendlyRobberToggle', 'Friendly Robber'],
    ['timerSpeedSelect', 'Timer speed'], ['diceAlgorithmSelect', 'Dice algorithm'],
    ['baseResourceCountSelect', 'Bank resources per type'], ['mapFamilySelect', 'Map'], ['playerCountSelect', 'Number of players'],
    ['mapScenarioSelect', 'Seafarers scenario'], ['mapScenario56Select', '5–6-player scenario'], ['mapScenario78Select','7–8-player scenario'], ['classicCustomMapToggle','Custom Map'],
    ['explorationPointsToggle', 'Exploration victory points'],
    ['victoryPointsSelect', 'Victory points to win'], ['devDeckModeSelect', 'Development deck'],
    ['randomMapAtStartToggle', 'Surprise map at start'],
  ];
  const changedSettingsForTemplate = new Set();
  let settingsAutosaveTimer = null;
  let applyingSettingsTemplate = false;
  const settingNode = id => $(id);
  const settingValue = id => {
    const node = settingNode(id);
    return node?.type === 'checkbox' ? !!node.checked : String(node?.value ?? '');
  };
  function collectCurrentRules() {
    const discardLimit = parseInt(ui.discardLimitInput.value, 10);
    const vpToWin = parseInt(ui.victoryPointsSelect?.value, 10);
    const devDeckMode = parseInt(ui.devDeckModeSelect?.value, 10);
    const baseResourcesPerType = parseInt(ui.baseResourceCountSelect?.value, 10);
    const preset = ui.timerSpeedSelect?.value || 'normal';
    const factor = preset === 'off' ? 0 : preset === 'fast' ? .5 : preset === 'slow' ? 2 : 1;
    const modeUi = ui.mapModeSelect?.value || 'classic';
    const mapMode = ['seafarers56','seafarers78'].includes(modeUi) ? 'seafarers' : modeUi;
    const seafarersScenario = modeUi === 'seafarers78' ? ui.mapScenario78Select?.value : modeUi === 'seafarers56' ? ui.mapScenario56Select?.value
      : modeUi === 'seafarers' ? ui.mapScenarioSelect?.value : (room?.rules?.seafarersScenario || 'four_islands');
    return {
      discardLimit: Number.isFinite(discardLimit) ? discardLimit : 7,
      setupTurnMs: Math.round(60000 * factor), playTurnMs: Math.round(30000 * factor),
      microPhaseMs: Math.round(15000 * factor), diceAlgorithm: normalizeDiceAlgorithmClient(ui.diceAlgorithmSelect?.value),
      mapMode, playerCount: null, customMap: ['classic','classic56','classic78'].includes(mapMode) && !!ui.classicCustomMapToggle?.checked, seafarersScenario, victoryPointsToWin: Number.isFinite(vpToWin) ? vpToWin : undefined,
      devDeckMode: [13,25,38].includes(devDeckMode) ? devDeckMode : undefined,
      baseResourcesPerType: Number.isFinite(baseResourcesPerType) ? Math.max(1, Math.min(40, baseResourcesPerType)) : undefined,
      friendlyRobber: ui.friendlyRobberToggle ? !!ui.friendlyRobberToggle.checked : false,
      explorationPointsEnabled: ui.explorationPointsToggle ? !!ui.explorationPointsToggle.checked : true,
      randomMapAtStart: !!ui.randomMapAtStartToggle?.checked,
    };
  }
  function commitLobbySettings() {
    if (!room || !myPlayerId || room.hostId !== myPlayerId || room.ranked || (state && state.phase !== 'lobby')) return;
    if (settingsAutosaveTimer) clearTimeout(settingsAutosaveTimer);
    settingsAutosaveTimer = null;
    const rules = collectCurrentRules();
    if (ui.settingsAutosaveStatus) ui.settingsAutosaveStatus.textContent = 'Saving…';
    send({ type: 'set_rules', rules });
    if (ui.settingsAutosaveStatus) ui.settingsAutosaveStatus.textContent = 'Changes sent to lobby automatically.';
  }
  function scheduleSettingsAutosave() {
    if (!room || room.hostId !== myPlayerId || room.ranked || (state && state.phase !== 'lobby')) return;
    if (settingsAutosaveTimer) clearTimeout(settingsAutosaveTimer);
    settingsAutosaveTimer = setTimeout(commitLobbySettings, 170);
  }
  for (const [id] of SETTINGS_FIELDS) {
    const control = settingNode(id);
    if (!control) continue;
    control.addEventListener('change', () => {
      if (applyingSettingsTemplate || control.disabled) return;
      changedSettingsForTemplate.add(id);
      scheduleSettingsAutosave();
    });
  }
  function getSavedRuleTemplates() {
    try { const data = JSON.parse(localStorage.getItem(SETTINGS_TEMPLATE_STORAGE) || '[]'); return Array.isArray(data) ? data : []; }
    catch (_) { return []; }
  }
  function storeSavedRuleTemplates(templates) {
    try { localStorage.setItem(SETTINGS_TEMPLATE_STORAGE, JSON.stringify(templates.slice(-40))); }
    catch (_) { setError('Templates could not be saved in this browser.'); }
  }
  function applyRulesTemplate(template) {
    if (!room || room.hostId !== myPlayerId || room.ranked) return;
    applyingSettingsTemplate = true;
    try {
      // Map mode before scenario so standard visibility/target defaults update properly.
      const fields = template.fields || {};
      for (const [id] of SETTINGS_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(fields, id)) continue;
        const node = settingNode(id);
        if (!node) continue;
        if (node.type === 'checkbox') node.checked = !!fields[id];
        else node.value = String(fields[id]);
        changedSettingsForTemplate.add(id);
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Manual target and resource choices in a template must not be overwritten
      // when scenario defaults are recalculated on subsequent map changes.
      vpTouched = Object.prototype.hasOwnProperty.call(fields, 'victoryPointsSelect');
      baseResourceCountTouched = Object.prototype.hasOwnProperty.call(fields, 'baseResourceCountSelect');
      applyVisibleMapSizeSelection();
    } finally { applyingSettingsTemplate = false; }
    commitLobbySettings();
  }
  function openRulesTemplateDialog() {
    if (!room || room.hostId !== myPlayerId || room.ranked) return;
    // Draft values are read from controls so templates capture what was just edited,
    // whether or not a server acknowledgement has arrived.
    const form = document.createElement('div');
    form.className = 'settingsTemplateEditor';
    const label = document.createElement('label');
    label.className = 'label'; label.textContent = 'Template name';
    const name = document.createElement('input');
    name.className = 'input'; name.maxLength = 60; name.placeholder = 'My custom game rules';
    label.appendChild(name); form.appendChild(label);
    const info = document.createElement('p');
    info.className = 'smallNote'; info.textContent = 'Changed settings are selected by default. Choose the fields you want to save; other settings remain unchanged when this template is applied.';
    form.appendChild(info);
    const choices = document.createElement('div'); choices.className = 'settingsTemplateFields';
    const boxes = [];
    for (const [id, title] of SETTINGS_FIELDS) {
      const node = settingNode(id);
      if (!node || node.closest('.hidden')) continue;
      const row = document.createElement('label'); row.className = 'settingsTemplateField';
      const box = document.createElement('input'); box.type = 'checkbox'; box.checked = changedSettingsForTemplate.has(id);
      boxes.push({ id, box });
      const text = document.createElement('span'); text.textContent = title;
      const value = document.createElement('small'); value.textContent = node.type === 'checkbox' ? (node.checked ? 'On' : 'Off') : (node.selectedOptions?.[0]?.textContent || node.value);
      row.append(box, text, value); choices.appendChild(row);
    }
    form.appendChild(choices);
    const selectAll = document.createElement('label'); selectAll.className = 'settingsTemplateSelectAll';
    const allBox = document.createElement('input'); allBox.type = 'checkbox';
    allBox.checked = boxes.length > 0 && boxes.every(({box}) => box.checked);
    allBox.indeterminate = boxes.some(({box}) => box.checked) && !allBox.checked;
    allBox.addEventListener('change', () => { for (const item of boxes) item.box.checked = allBox.checked; allBox.indeterminate = false; });
    for (const item of boxes) item.box.addEventListener('change', () => {
      allBox.checked = boxes.every(({box}) => box.checked);
      allBox.indeterminate = boxes.some(({box}) => box.checked) && !allBox.checked;
    });
    selectAll.append(allBox, document.createTextNode(' Select all settings'));
    form.appendChild(selectAll);
    const savedHeading = document.createElement('h3'); savedHeading.textContent = 'Saved templates'; form.appendChild(savedHeading);
    const savedList = document.createElement('div'); savedList.className = 'settingsTemplateSaved'; form.appendChild(savedList);
    const renderSaved = () => {
      savedList.replaceChildren();
      const entries = getSavedRuleTemplates();
      if (!entries.length) { const empty = document.createElement('p'); empty.className = 'smallNote'; empty.textContent = 'No templates saved in this browser yet.'; savedList.appendChild(empty); }
      entries.forEach((template, index) => {
        const row = document.createElement('div'); row.className = 'settingsTemplateSavedRow';
        const title = document.createElement('span'); title.textContent = template.name;
        const load = document.createElement('button'); load.type = 'button'; load.className = 'btn'; load.textContent = 'Apply';
        load.addEventListener('click', () => { applyRulesTemplate(template); closeModal(); });
        const del = document.createElement('button'); del.type = 'button'; del.className = 'btn subtle'; del.textContent = 'Delete';
        del.addEventListener('click', () => { const next = getSavedRuleTemplates(); next.splice(index, 1); storeSavedRuleTemplates(next); renderSaved(); });
        row.append(title, load, del); savedList.appendChild(row);
      });
    };
    renderSaved();
    openModal({ title: 'Save Settings Template', bodyNode: form, actions: [
      { label: 'Cancel', onClick: closeModal },
      { label: 'Save Template', primary: true, onClick: () => {
        const templateName = name.value.trim();
        const selected = boxes.filter(({box}) => box.checked);
        if (!templateName) { name.focus(); return; }
        if (!selected.length) { info.textContent = 'Select at least one setting to save.'; return; }
        const fields = {};
        for (const {id} of selected) fields[id] = settingValue(id);
        const entries = getSavedRuleTemplates();
        const matching = entries.findIndex(t => t.name.toLowerCase() === templateName.toLowerCase());
        if (matching >= 0) entries.splice(matching, 1);
        entries.push({ name: templateName, fields, savedAt: Date.now() });
        storeSavedRuleTemplates(entries);
        for (const {id} of selected) changedSettingsForTemplate.delete(id);
        closeModal();
      } },
    ] });
    name.focus();
  }
  function openLoadRulesTemplateDialog() {
    if (!room || room.hostId !== myPlayerId || room.ranked || state?.phase !== 'lobby') return;
    const body = document.createElement('div');
    const intro = document.createElement('p');
    intro.className = 'smallNote';
    intro.textContent = 'Choose a saved game settings template to apply to this lobby.';
    body.appendChild(intro);
    const list = document.createElement('div');
    list.className = 'settingsTemplateSaved';
    body.appendChild(list);
    const renderList = () => {
      list.replaceChildren();
      const entries = getSavedRuleTemplates();
      if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'smallNote';
        empty.textContent = 'No saved templates in this browser yet. Use Save Settings Template to create one.';
        list.appendChild(empty);
        return;
      }
      for (const template of entries.slice().reverse()) {
        const item = document.createElement('div'); item.className = 'settingsTemplateSavedRow';
        const title = document.createElement('span'); title.textContent = template.name;
        const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'btn primary'; apply.textContent = 'Load';
        apply.addEventListener('click', () => { applyRulesTemplate(template); closeModal(); });
        const del = document.createElement('button'); del.type = 'button'; del.className = 'btn subtle'; del.textContent = 'Delete';
        del.addEventListener('click', () => { storeSavedRuleTemplates(getSavedRuleTemplates().filter(entry => entry !== template && !(entry.name === template.name && entry.savedAt === template.savedAt))); renderList(); });
        item.append(title, apply, del);
        list.appendChild(item);
      }
    };
    renderList();
    openModal({ title: 'Load Game Template', bodyNode: body, actions: [{ label: 'Close', onClick: closeModal }] });
  }
  ui.settingsAutosaveStatus = $('settingsAutosaveStatus');
  ui.saveRulesBtn?.addEventListener('click', openRulesTemplateDialog);
  $('loadRulesBtn')?.addEventListener('click', openLoadRulesTemplateDialog);

  if (ui.regenMapBtn) {
    ui.regenMapBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

    ui.classicCustomMapToggle?.addEventListener('change', () => {
      syncPlayerCountOptions();
      ui.testBuilderRow?.classList.toggle('hidden', !ui.classicCustomMapToggle.checked);
      if (ui.classicCustomMapToggle.checked && ui.randomMapAtStartToggle) ui.randomMapAtStartToggle.checked = false;
      commitLobbySettings();
    });
    if (ui.testResetBtn) {
    ui.testResetBtn.addEventListener('click', () => {
      if (!room || room.hostId !== myPlayerId) return;
      send({ type: 'generate_map' });
    });
  }

  // Portable custom maps. Uploads are validated by the server before use.
  function saveBrowserJson(filename, documentValue) {
    const blob = new Blob([JSON.stringify(documentValue)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  ui.customMapDownloadBtn?.addEventListener('click', () => send({ type: 'download_custom_map' }));
  ui.customMapUploadBtn?.addEventListener('click', () => ui.customMapUploadInput?.click());
  ui.customMapUploadInput?.addEventListener('change', async () => {
    const file = ui.customMapUploadInput.files?.[0]; ui.customMapUploadInput.value = '';
    if (!file) return;
    if (file.size > 512_000) { setError('Custom maps must be smaller than 500 KB.'); return; }
    try { send({ type: 'upload_custom_map', map: JSON.parse(await file.text()) }); }
    catch (error) { setError('Invalid custom map JSON: ' + error.message); }
  });
  // The splitter changes how much horizontal space the settings panel gets.
  const lobbySplitter = $('lobbyPanelSplitter');
  let lobbySplitWidth = (() => { try { return Number(localStorage.getItem('hexsettlers_lobby_panel_width_v34')) || 360; } catch (_) { return 360; } })();
  function setLobbyPanelWidth(next, persist=false) {
    const max = Math.max(280, Math.min(900, window.innerWidth - 300));
    lobbySplitWidth = Math.max(280, Math.min(max, Number(next) || 360));
    document.documentElement.style.setProperty('--lobby-sidebar-width', lobbySplitWidth + 'px');
    lobbySplitter?.setAttribute('aria-valuenow', String(Math.round(lobbySplitWidth)));
    if (persist) { try { localStorage.setItem('hexsettlers_lobby_panel_width_v34', String(lobbySplitWidth)); } catch (_) {} }
    // resizeCanvas() clears canvas pixels; call render() instead, which resizes
    // and repaints atomically in its scheduled animation frame.
    if (ui.canvas.getBoundingClientRect().width > 0) render();
  }
  setLobbyPanelWidth(lobbySplitWidth);
  if (lobbySplitter) {
    let pointerId = null;
    lobbySplitter.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      pointerId = ev.pointerId; lobbySplitter.setPointerCapture(ev.pointerId);
      lobbySplitter.classList.add('dragging'); ev.preventDefault();
    });
    lobbySplitter.addEventListener('pointermove', ev => {
      if (pointerId !== ev.pointerId) return;
      const layout = lobbySplitter.closest('.layout');
      const left = layout?.getBoundingClientRect().left || 0;
      setLobbyPanelWidth(ev.clientX - left - 7);
    });
    const stop = ev => { if (pointerId !== null && (ev.pointerId === pointerId || ev.type === 'lostpointercapture')) {
      pointerId = null; lobbySplitter.classList.remove('dragging'); setLobbyPanelWidth(lobbySplitWidth, true);
    } };
    lobbySplitter.addEventListener('pointerup', stop);
    lobbySplitter.addEventListener('pointercancel', stop);
    lobbySplitter.addEventListener('lostpointercapture', stop);
    lobbySplitter.addEventListener('keydown', ev => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key)) return;
      ev.preventDefault(); setLobbyPanelWidth(ev.key === 'Home' ? 280 : ev.key === 'End' ? 900 : lobbySplitWidth + (ev.key === 'ArrowLeft' ? -24 : 24), true);
    });
  }

  // Tools
  ui.logBtn.addEventListener('click', () => toggleLogPanel());
  if (ui.rulesBtn) ui.rulesBtn.addEventListener('click', () => openRulesModal());
  ui.diceBtn.addEventListener('click', () => openDiceModal());
  if (ui.texturePackBtn) ui.texturePackBtn.addEventListener('click', () => openTexturePackModal());
  ui.chatBtn.addEventListener('click', () => openChatModal());
  if (ui.audioBtn) ui.audioBtn.addEventListener('click', () => toggleAudioPanel());
  if (ui.colorblindBtn) {
    updateColorblindUi();
    ui.colorblindBtn.addEventListener('click', () => setColorblindMode(!colorblindMode));
  }
  if (ui.leaveGameBtn) ui.leaveGameBtn.addEventListener('click', () => openLeaveGameConfirm());
  if (ui.endGameVoteBtn) ui.endGameVoteBtn.addEventListener('click', () => {
    const inGame = !!(state && state.phase && state.phase !== 'lobby' && state.phase !== 'game-over');
    const canVote = !!(inGame && myPlayerId && !amRoomSpectator() && !historyReplay.active && !room?.ranked);
    if (!canVote) return;
    // If a vote is already open, just re-open the panel.
    if (state && state.endVote && state.endVote.id) {
      openEndGameVoteModal(true);
      return;
    }
    if (sendGameAction({ kind: 'propose_endgame' })) {
      toast('Requesting End Game vote…');
    }
  });
  if (ui.idsBtn) ui.idsBtn.addEventListener('click', () => openRoomIdsModal());

  if (ui.logHideBtn) {
    ui.logHideBtn.addEventListener('click', () => setGamePanelsExpanded(!gamePanelsExpanded));
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
      msg = 'Click a land tile to move the robber, or a revealed sea tile to move the pirate.';
    } else if (kind === 'move_pirate') {
      msg = 'Click a revealed sea tile to move the pirate.';
    } else if (kind === 'move_robber') {
      msg = 'Click a land tile to move the robber.';
    } else {
      msg = `Click on the board to ${kind.replaceAll('_', ' ')}.`;
    }
    ui.hintBox.textContent = msg;
  }

  function sendGameAction(action) {
    if (!action) return;
    setError(null);
    if (amRoomSpectator()) {
      setError('Spectators cannot take game actions.');
      return;
    }
    // Turn-undo voting intentionally pauses the game; the vote must still be
    // usable while paused or the unanimous approval flow could never finish.
    const undoVoteAction = action.kind === 'propose_turn_undo' || action.kind === 'respond_turn_undo';
    // End Game votes are permitted while a room is paused, too. The server
    // explicitly permits these actions; blocking them here made the button
    // silently fail for paused unranked and AI games.
    const endVoteAction = action.kind === 'propose_endgame' || action.kind === 'respond_endgame';
    if (state && state.paused && !undoVoteAction && !endVoteAction) {
      setError('Game is paused.');
      return false;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Connection interrupted. Reconnect to request an End Game vote.');
      return false;
    }
    send({ type: 'game_action', action });
    return true;
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
    const freeRoute = roadBuildingPlacementActiveClient();
    return (phase === 'main-actions' || phase === 'setup1-road' || phase === 'setup2-road' || (phase === 'main-await-roll' && freeRoute));
  }

  function roadBuildingPlacementActiveClient() {
    const special = state && state.special;
    if (!special || !myPlayerId || special.forPlayerId !== myPlayerId) return false;
    const kind = String(special.kind || '');
    return (kind === 'free_routes' || kind === 'free_roads') && Number(special.remaining || 0) > 0;
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
      if (shipWasPlacedThisOpportunityClient(edgeId)) {
        setError('A ship just placed cannot be moved until your next turn or extra turn.');
        return;
      }
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
    setError(null);
    send({ type: 'pause_game', paused: true });
  });
  ui.playBtn?.addEventListener('click', () => {
    setError(null);
    send({ type: 'pause_game', paused: false });
  });
  ui.backTurnBtn?.addEventListener('click', () => { if (!room?.ranked) sendGameAction({ kind: 'propose_turn_undo' }); });



// History / Leaderboard overlay controls
$('historyFriendsOnly')?.addEventListener('change', event => {
  historyState.friendsOnly = !!event.target.checked;
  renderHistory();
});
$('historyDownloadSelectedBtn')?.addEventListener('click', downloadChosenReplays);
$('historyUploadReplayBtn')?.addEventListener('click', () => $('historyUploadReplayInput')?.click());
$('historyUploadReplayInput')?.addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file) return;
  try { const count = await importReplayFile(file); toast(`Saved ${count} replay${count === 1 ? '' : 's'} on this device.`); openHistoryOverlay('games'); }
  catch (error) { toast(error.message || 'Unable to import replay.'); }
});
if (ui.historyBtn) ui.historyBtn.addEventListener('click', () => openHistoryOverlay('games'));
if (ui.leaderboardBtn) ui.leaderboardBtn.addEventListener('click', () => openHistoryOverlay('players'));

if (ui.historyCloseBtn) ui.historyCloseBtn.addEventListener('click', () => closeHistoryOverlay());
if (ui.historyRefreshBtn) ui.historyRefreshBtn.addEventListener('click', () => {
  historyState.loadingGames = true;
  historyState.loadingBoard = true;
  historyState.loadingChallenges = true;
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

if (ui.historyReplayExitBtn) ui.historyReplayExitBtn.addEventListener('click', stopHistoryReplay);
if (ui.historyReplayPrevBtn) ui.historyReplayPrevBtn.addEventListener('click', () => {
  cancelHistoryReplayScrub();
  showHistoryReplayFrame(historyReplay.index - 1);
});
if (ui.historyReplayNextBtn) ui.historyReplayNextBtn.addEventListener('click', () => {
  cancelHistoryReplayScrub();
  showHistoryReplayFrame(historyReplay.index + 1);
});
if (ui.historyReplaySlider) ui.historyReplaySlider.addEventListener('input', () => {
  scheduleHistoryReplayFrame(ui.historyReplaySlider.value);
});
if (ui.historyReplayLogBtn) ui.historyReplayLogBtn.addEventListener('click', () => {
  setGamePanelsExpanded(true);
  selectGamePanelTab('log');
  if (ui.logList) renderLogList(ui.logList);
});

// Post-game overlay controls
if (ui.pgMainMenuBtn) ui.pgMainMenuBtn.addEventListener('click', () => {
  if (postgameState.historyMode) {
    closePostgameSnapshot();
    return;
  }
  // Main Menu always returns to the change-game-type screen. Wait for the
  // server to unbind a connected match, but never trap a disconnected player.
  if (!room || !ws || ws.readyState !== WebSocket.OPEN) {
    returnToGameTypeSelection();
    return;
  }
  returnToModeSelectionAfterLeave = true;
  returnToUnrankedAfterLeave = false;
  ui.pgMainMenuBtn.disabled = true;
  ui.pgMainMenuBtn.textContent = 'Leaving…';
  if (ui.pgRematchBtn) ui.pgRematchBtn.disabled = true;
  send({ type: 'leave_room' });
});
if (ui.pgRematchBtn) ui.pgRematchBtn.addEventListener('click', () => {
  if (postgameState.historyMode || !ws || ws.readyState !== WebSocket.OPEN) return;
  ui.pgRematchBtn.disabled = true;
  const rankedRematch = !!room?.ranked;
  ui.pgRematchBtn.textContent = rankedRematch ? 'Returning…' : 'Joining…';
  // Ranked Rematch only returns to the ready screen; queueing is always a
  // separate, explicit click on Start Matchmaking.
  send({ type: 'rematch_room' });
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

  function resourcePanelPlayer() {
    if (!state) return null;
    if ((historyReplay.active || amRoomSpectator()) && state.spectatorViewPlayerId) {
      return (state.players || []).find((player) => player && player.id === state.spectatorViewPlayerId) || null;
    }
    return myPlayer();
  }

  // Interaction hit-testing cache (screen-space)
  let screenCache = null;


function serverNowMs() { return Date.now() + (serverTimeOffsetMs || 0); }

function timerSecondsLeft() {
  if (state && state.paused && state.pause && typeof state.pause.remainingMs === 'number') {
    return Math.max(0, Number(state.pause.remainingMs) / 1000);
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
  const isGoldChoice = phaseKey === 'production-gold' || (state && state.special && state.special.kind === 'discovery_gold');
  const phaseLabel = isGoldChoice ? 'gold choice' : phaseKey;
  const left = timerSecondsLeft();
  const sec = left == null ? '—' : String(Math.ceil(left));
  ui.timerInfo.classList.remove('hidden');
  ui.timerInfo.textContent = `${state.paused ? '⏸' : '⏱'} ${sec}s · ${phaseLabel}`;

  // Right-side clock (all players)
  if (ui.countdownClock) {
    ui.countdownClock.classList.remove('hidden');
    const timeEl = ui.countdownClock.querySelector('.clockTime');
    const metaEl = ui.countdownClock.querySelector('.clockMeta');
    if (timeEl) timeEl.textContent = formatClock(left);
    const timedPlayerId = (isGoldChoice && state && state.special && state.special.forPlayerId)
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
    const timerStatus = state.paused
      ? 'Paused'
      : (isGoldChoice ? 'Gold choice' : 'Turn');
    const meta = `${timerStatus}: ${who}${pairTag} · ${phaseLabel}`;
    if (metaEl) metaEl.textContent = meta;
    if (ui.turnInfo) {
      const actionPlayer = (state.players || []).find(p => p.id === timedPlayerId);
      const actionColor = actionPlayer?.color || '#e8eef6';
      ui.turnInfo.style.color = actionColor;
      ui.turnInfo.style.textShadow = '0 1px 2px rgba(0,0,0,.95)';
    }
  }

  if (ui.pausedOverlay) ui.pausedOverlay.classList.toggle('hidden', !state.paused);
}

function ensureTimerUiInterval() {
  if (timerUiInterval) return;
  // Update once per second so the countdown is always readable and stable.
  timerUiInterval = setInterval(() => {
    updateTimerInfo();
    // Robustness: shared prompts may have arrived while a required modal was open.
    // Keep retrying so every player reliably sees them.
    try { handlePendingTradePrompt(); } catch (_) {}
    try { handleEndGameVotePrompt(); } catch (_) {}
    try { handleTurnUndoVotePrompt(); } catch (_) {}
  }, 1000);
  // Run immediately so you don't wait up to 1s after joining.
  updateTimerInfo();
}

  function isLocalPairedExtraTurn(st = state) {
    return !!(st && myPlayerId && st.currentPlayerId === myPlayerId && st.paired && st.paired.enabled && String(st.paired.stage || '') === 'p2');
  }

  function shipMoveOpportunityKeyClient(st = state, playerId = myPlayerId) {
    const turnNumber = Math.max(0, Math.floor(Number(st?.turnNumber || 0)));
    const ownerId = String(playerId || '');
    const pairedStage = st?.paired?.enabled ? String(st.paired.stage || '') : 'solo';
    return `${turnNumber}:${ownerId}:${pairedStage}`;
  }

  function shipWasPlacedThisOpportunityClient(edgeId, st = state, playerId = myPlayerId) {
    if (!st || edgeId == null || !playerId) return false;
    const marker = st.shipPlacedOpportunityByEdge?.[String(edgeId)];
    if (!marker || String(marker.ownerId || '') !== String(playerId)) return false;
    return String(marker.opportunityKey || '') === shipMoveOpportunityKeyClient(st, playerId);
  }

  function updateButtons() {
    const phaseNow = currentRoomPhase();
    const inGame = !!state && state.phase !== 'lobby';
    const amSpectator = inGame && amRoomSpectator();
    if (ui.toolsCard) ui.toolsCard.classList.toggle('hidden', !inGame);
    if (ui.logBtn) ui.logBtn.textContent = gamePanelsExpanded ? 'Hide Game Panels' : 'Show Game Panels';

    // Hide in-game HUD cards during lobby.
    if (ui.turnCard) ui.turnCard.classList.toggle('hidden', !inGame);
    if (ui.devCard) ui.devCard.classList.toggle('hidden', !inGame);
    if (ui.resourcesCard) ui.resourcesCard.classList.toggle('hidden', !inGame);
    if (ui.logCard) ui.logCard.classList.toggle('hidden', !inGame);
    const myTurn = inGame && !historyReplay.active && !amSpectator && state.currentPlayerId === myPlayerId;
    const pairedExtraTurnActive = !!(
      inGame && !historyReplay.active && myTurn && state?.paired?.enabled &&
      String(state.paired.stage || '') === 'p2'
    );
    const pairedExtraTurnKey = pairedExtraTurnActive
      ? `${String(myPlayerId || '')}:${Math.max(0, Number(state.turnNumber || 0))}:${String(state.paired.stage || '')}`
      : '';
    if (pairedExtraTurnKey && pairedExtraTurnKey !== extraTurnAnnouncementKey) {
      extraTurnAnnouncementKey = pairedExtraTurnKey;
      extraTurnAnnouncementAcknowledged = false;
    } else if (!pairedExtraTurnActive) {
      extraTurnAnnouncementKey = '';
      extraTurnAnnouncementAcknowledged = false;
    }
    const extraTurnMainActions = pairedExtraTurnActive && state.phase === 'main-actions';
    if (ui.extraTurnBanner) {
      const showExtraTurn = !!(extraTurnMainActions && !state.paused);
      ui.extraTurnBanner.classList.toggle('hidden', !showExtraTurn);
    }
    if (ui.extraTurnCenterBanner) {
      const showCenteredExtraTurn = false; // The extra-turn badge now lives beside Roll Dice.
      ui.extraTurnCenterBanner.classList.toggle('hidden', !showCenteredExtraTurn);
    }
    if (ui.placementTurnBanner) {
      const placementTurnPhases = new Set([
        'cartographer-draft',
        'setup1-settlement', 'setup1-road',
        'setup2-settlement', 'setup2-road',
      ]);
      const showPlacementTurn = !!(myTurn && !state.paused && placementTurnPhases.has(String(state.phase || '')));
      ui.placementTurnBanner.classList.toggle('hidden', !showPlacementTurn);
    }
    if (inGame) syncTurnHudIndicatorPlacement();
    if (ui.yourRollBanner) {
      const showYourRoll = !!(myTurn && !state.paused && state.phase === 'main-await-roll');
      ui.yourRollBanner.classList.toggle('hidden', !showYourRoll);
    }

    // Global page state + HUD docking.
    try { document.body.classList.toggle('in-game', inGame); } catch (_) {}
    if (inGame) setMobileLobbyMapOpen(false);
    dockHudToBoard(inGame);
    if (!inGame) { setMobilePanelsOpen(false); setMobileActionsOpen(false); }
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

    // Ranked matches are server-controlled. Back remains a unanimous vote;
    // solo pause/resume controls are available only in unranked games.
    const isHostNow = !!(room && myPlayerId && room.hostId === myPlayerId && !room.ranked);
    ui.backTurnBtn?.classList.toggle('hidden', !(inGame && !historyReplay.active && !amSpectator && !room?.ranked));
    const timerEnabled = Number(state?.rules?.playTurnMs ?? room?.rules?.playTurnMs ?? 30000) > 0;
    for (const control of [ui.pauseBtn, ui.playBtn]) control?.classList.toggle('hidden', !(timerEnabled && inGame && !historyReplay.active && !amSpectator && !room?.ranked));
    if (ui.backTurnBtn) {
      ui.backTurnBtn.disabled = !myPlayerId || !state?.canUndoPreviousTurn || !!state?.turnUndoVote;
      ui.backTurnBtn.title = state?.canUndoPreviousTurn
        ? 'Any player can request a unanimous vote to undo the previous turn.'
        : 'The first turn must finish before Back is available.';
    }
    if (ui.pauseBtn) ui.pauseBtn.disabled = !!(state && state.paused);
    if (ui.playBtn) ui.playBtn.disabled = !(state && state.paused);

    // Host-only room ID helper
    if (ui.idsBtn) {
      ui.idsBtn.classList.toggle('hidden', !isHostNow || historyReplay.active);
      ui.idsBtn.disabled = !isHostNow || historyReplay.active;
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
      const canUseLeaveGame = !!(!historyReplay.active && myPlayerId && room && !room.ranked && room.hostId !== myPlayerId && phaseNow !== 'lobby');
      ui.leaveGameBtn.classList.toggle('hidden', !canUseLeaveGame);
      ui.leaveGameBtn.disabled = !canUseLeaveGame;
    }

    // Every active player may request the same unanimous end-game vote.
    if (ui.endGameVoteBtn) {
      const canRequestEndVote = !!(inGame && state?.phase !== 'game-over' && !amSpectator && myPlayerId && !historyReplay.active && !room?.ranked);
      ui.endGameVoteBtn.classList.toggle('hidden', !canRequestEndVote);
      ui.endGameVoteBtn.disabled = !canRequestEndVote;
      ui.endGameVoteBtn.textContent = state?.endVote?.id ? 'View End Game Vote' : 'End Game';
    }

    const paused = inGame && !!(state && state.paused);

    // Lobby room messages can arrive before their preview state. Keep every
    // action disabled until state is available instead of reading through null.
    if (!inGame || paused) {
      ui.rollBtn.disabled = true;
      ui.endBtn.disabled = true;
      if (ui.rollDockBtn) ui.rollDockBtn.disabled = true;
      if (ui.endDockBtn) ui.endDockBtn.disabled = true;
      if (ui.rollDock) ui.rollDock.classList.toggle('hidden', !inGame);
      ui.buildRoadBtn.disabled = true;
      ui.buildShipBtn.disabled = true;
      if (ui.moveShipBtn) ui.moveShipBtn.disabled = true;
      ui.buildSettlementBtn.disabled = true;
      ui.buildCityBtn.disabled = true;
      if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = true;
      updatePlayerTradeButton();
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
      ui.rollDock.classList.toggle('hidden', !inGame);
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
    const freeRoutePlacement = myTurn && roadBuildingPlacementActiveClient();
    ui.buildRoadBtn.disabled = !((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine) || freeRoutePlacement);
    if (ui.buildShipBtn) {
      ui.buildShipBtn.classList.add('hidden');
      ui.buildShipBtn.disabled = !(seafarers && ((myTurn && state.phase === 'main-actions') || (setupRoad && awaitingMine) || freeRoutePlacement));
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
    if (ui.bankTradeBtn) ui.bankTradeBtn.disabled = !(myTurn && state.phase === 'main-actions');
    updatePlayerTradeButton();

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
    } else if (freeRoutePlacement) {
      const k = inputMode && inputMode.kind;
      if (!(k === 'place_road' || k === 'place_ship')) setMode('place_road');
      const remaining = Math.max(0, Math.floor(Number(state.special?.remaining) || 0));
      ui.hintBox.textContent = seafarers
        ? `Road Building: choose a legal road or ship edge (${remaining} free placement${remaining === 1 ? '' : 's'} remaining).`
        : `Road Building: choose a legal road edge (${remaining} free placement${remaining === 1 ? '' : 's'} remaining).`;
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
      // Place a high-contrast count badge over the resource art, rather than
      // shrinking the art to make room for a number beside it.
      cell.setAttribute('role', 'img');
      cell.setAttribute('aria-label', `${k}: ${v ?? 0}`);
      cell.title = `${k}: ${v ?? 0}`;
      val.setAttribute('aria-hidden', 'true');
      img.setAttribute('aria-hidden', 'true');
      cell.appendChild(img);
      cell.appendChild(val);
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
        if ((historyReplay.active || amRoomSpectator()) && !p.departed && (state.turnOrder || []).includes(p.id)) {
          row.classList.add('spectatorSelectable');
          if (p.id === state.spectatorViewPlayerId) row.classList.add('spectatorSelected');
          row.title = `View ${p.name}'s resources`;
          row.addEventListener('click', () => {
            if (historyReplay.active) {
              historyReplay.viewPlayerId = p.id;
              state.spectatorViewPlayerId = p.id;
              renderResources();
              renderDevCards();
            } else send({ type: 'set_spectator_view', playerId: p.id });
          });
        }

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
        name.setAttribute('data-i18n-skip', '');
        name.textContent = p.name + (p.id === myPlayerId ? ' (you)' : '');
        main.appendChild(name);

        const stats = document.createElement('div');
        stats.className = 'resSummaryStats';

        const handCount = p.resources
          ? RES_KEYS.reduce((sum, k) => sum + Number(p.resources?.[k] || 0), 0)
          : Number(p.handCount || 0);
        const devCount = Array.isArray(p.devCards)
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

    const bankRow = document.createElement('div');
    bankRow.className = 'rightSidebarBankRow';
    sideBox.appendChild(bankRow);
    const bankTitle = document.createElement('div');
    bankTitle.className = 'rightSidebarBankTitle';
    bankTitle.textContent = 'Bank Resources';
    bankRow.appendChild(bankTitle);

    const bankStrip = document.createElement('div');
    bankStrip.className = 'rightSidebarResStrip';
    for (const k of RES_KEYS) bankStrip.appendChild(makeResCell(k, (state.bank && state.bank[k]) ?? 0));
    bankRow.appendChild(bankStrip);

    sideBox.appendChild(document.createElement('div')).className = 'rightSidebarSeparator';

    const me = resourcePanelPlayer();
    if (!me || !me.resources) {
      const note = document.createElement('div');
      note.className = 'rightSidebarNote';
      note.textContent = 'Spectating — private hand details stay hidden.';
      sideBox.appendChild(note);
      return;
    }

    const playerRow = document.createElement('div');
    playerRow.className = 'rightSidebarPlayerRow';
    sideBox.appendChild(playerRow);
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
    if (historyReplay.active || amRoomSpectator()) {
      const viewing = document.createElement('span');
      viewing.textContent = `VIEWING: ${me.name || 'Player'}`;
      meta.prepend(viewing);
    }
    playerRow.appendChild(meta);

    const myResStrip = document.createElement('div');
    myResStrip.className = 'rightSidebarResStrip';
    for (const k of RES_KEYS) myResStrip.appendChild(makeResCell(k, me.resources?.[k] ?? 0));
    playerRow.appendChild(myResStrip);

    const pc = pieceCounts(me.id);
    const pieceStrip = document.createElement('div');
    pieceStrip.className = 'rightSidebarPieceStrip';
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'road', pc.roadsLeft));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'ship', seafarers ? pc.shipsLeft : '--'));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'settlement', pc.settlementsLeft));
    pieceStrip.appendChild(makePieceCellForColor(me.color, 'city', pc.citiesLeft));
    playerRow.appendChild(pieceStrip);

    const cost = document.createElement('div');
    cost.className = 'rightSidebarNote';
    cost.textContent = 'Costs: Road (brick+lumber), Ship (lumber+wool), Settlement (brick+lumber+wool+grain), City (2 grain + 3 ore).';
    playerRow.appendChild(cost);
  }

  function renderDevCards() {
    if (!state) return;
    const me = resourcePanelPlayer();
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

    const myTurn = !historyReplay.active && state.currentPlayerId === myPlayerId;
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

  let lastTradePromptKeySeen = '';
  let pendingTradePromptId = 0;
  let pendingTradeModalKey = '';
  let lastEndVotePromptIdSeen = 0;
  let lastEndVotePromptRoomCode = '';
  let pendingEndVotePromptId = 0;
  // When the trade proposer hits "Revise Trade" from the proposed-trade popup,
  // we keep track of which trade is being replaced so the server can atomically
  // close the old offer and broadcast the updated one.
  let revisingTradeId = null;

  function pendingTradeKey() {
    return state?.pendingTrade?.id
      ? `${String(state.roomCode || room?.code || '')}:${state.pendingTrade.id}`
      : '';
  }

  function canViewPendingTrade() {
    const trade = state?.pendingTrade;
    return !!(trade?.id && myPlayerId && !historyReplay.active && !amRoomSpectator()
      && (myPlayerId === trade.fromId || Object.prototype.hasOwnProperty.call(trade.responses || {}, myPlayerId)));
  }

  function canOpenPlayerTrade() {
    if (canViewPendingTrade()) return true;
    return !!(state && myPlayerId && !historyReplay.active && !amRoomSpectator()
      && !state.paused && state.phase === 'main-actions' && state.currentPlayerId === myPlayerId
      && !isLocalPairedExtraTurn(state));
  }

  function updatePlayerTradeButton() {
    if (!ui.playerTradeBtn) return;
    ui.playerTradeBtn.disabled = !canOpenPlayerTrade();
    ui.playerTradeBtn.title = canViewPendingTrade() ? 'Reopen the current trade offer.' : '';
  }

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

    const resourceKinds = ['brick','lumber','wool','grain','ore'];
    const emptyResourceMap = () => Object.fromEntries(resourceKinds.map(k => [k, 0]));
    const model = {
      giveTrades: emptyResourceMap(),
      take: emptyResourceMap(),
      conflictKind: null,
    };

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
    help.textContent = 'Build one combined trade. Left-click any TOP resource to receive +1. Left-click any BOTTOM resource to add one trade at that resource’s port rate. Shift-click or right-click either row to reduce.';
    help.style.marginBottom = '6px';
    bankBox.appendChild(help);

    const rows = document.createElement('div');
    rows.className = 'gTradeRows';

    function ratioFor(k) {
      return force4.checked ? 4 : tradeRatioForClient(k);
    }

    function giveQuantity(k) {
      return Math.max(0, Number(model.giveTrades[k] || 0)) * ratioFor(k);
    }

    function makeBankChip(k, rowMode) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'resChipBtn';
      chip.title = rowMode === 'take'
        ? 'Left-click +1 received · Shift-click / Right-click −1'
        : 'Left-click adds one trade at this resource’s rate · Shift-click / Right-click removes one';

      function change(delta) {
        model.conflictKind = null;
        if (rowMode === 'take') {
          if (delta > 0 && Number(model.giveTrades[k] || 0) > 0) {
            model.conflictKind = k;
          } else {
            model.take[k] = Math.max(0, Number(model.take[k] || 0) + delta);
          }
        } else if (delta > 0 && Number(model.take[k] || 0) > 0) {
          model.conflictKind = k;
        } else {
          model.giveTrades[k] = Math.max(0, Number(model.giveTrades[k] || 0) + delta);
        }
        refresh();
      }

      chip.addEventListener('click', (ev) => change(ev.shiftKey ? -1 : 1));
      chip.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        change(-1);
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
          const quantity = rowMode === 'take'
            ? Math.max(0, Number(model.take[k] || 0))
            : giveQuantity(k);
          const shown = rowMode === 'take' ? quantity : -quantity;
          chip.classList.toggle('pos', shown > 0);
          chip.classList.toggle('neg', shown < 0);
          chip.classList.toggle('zero', shown === 0);
          val.textContent = `${shown >= 0 ? '+' : ''}${shown}`;

          const selected = quantity > 0;
          chip.style.borderColor = selected ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)';
          chip.style.boxShadow = selected
            ? '0 0 0 2px rgba(255,255,255,.10) inset, 0 0 0 1px rgba(0,0,0,.15)'
            : 'inset 0 1px 0 rgba(255,255,255,.04)';

          if (rowMode === 'give') {
            const trades = Math.max(0, Number(model.giveTrades[k] || 0));
            const ratio = ratioFor(k);
            const owned = Number(me.resources?.[k] || 0);
            chip.title = `Rate ${ratio}:1 · ${owned} owned · ${trades} trade${trades === 1 ? '' : 's'} selected`;
          } else {
            const bankAvailable = Number(state.bank?.[k] || 0);
            chip.title = `Bank has ${bankAvailable} · Left-click +1 · Shift-click / Right-click −1`;
          }
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
      for (const k of resourceKinds) {
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
    forceRow.appendChild(document.createTextNode('Force 4:1 for every offered resource (ignore ports)'));
    bankBox.appendChild(forceRow);

    wrap.appendChild(bankBox);

    let tradeBtn = null;

    function selectedGiveMap() {
      const give = emptyResourceMap();
      for (const k of resourceKinds) give[k] = giveQuantity(k);
      return give;
    }

    function selectedTakeMap() {
      const take = emptyResourceMap();
      for (const k of resourceKinds) take[k] = Math.max(0, Math.floor(Number(model.take[k] || 0)));
      return take;
    }

    function formatResources(resourceMap) {
      return resourceKinds
        .filter(k => Number(resourceMap[k] || 0) > 0)
        .map(k => `${resourceMap[k]} ${k}`)
        .join(', ');
    }

    function refresh() {
      for (const c of [...topRow.chips, ...bottomRow.chips]) c.update();

      const give = selectedGiveMap();
      const take = selectedTakeMap();
      const giveTradeCount = resourceKinds.reduce((sum, k) => sum + Math.max(0, Number(model.giveTrades[k] || 0)), 0);
      const takeTotal = resourceKinds.reduce((sum, k) => sum + Number(take[k] || 0), 0);
      const inventoryIssue = resourceKinds.find(k => Number(give[k] || 0) > Number(me.resources?.[k] || 0));
      const bankIssue = resourceKinds.find(k => Number(take[k] || 0) > Number(state.bank?.[k] || 0));
      const balanced = giveTradeCount > 0 && giveTradeCount === takeTotal;

      if (model.conflictKind) {
        bankInfo.textContent = `Remove ${model.conflictKind} from the other row first; the same resource cannot be given and received in one bank trade.`;
      } else if (inventoryIssue) {
        bankInfo.textContent = `Not enough ${inventoryIssue}: selected ${give[inventoryIssue]}, but you have ${Number(me.resources?.[inventoryIssue] || 0)}.`;
      } else if (bankIssue) {
        bankInfo.textContent = `Bank is out of enough ${bankIssue}: selected ${take[bankIssue]}, but only ${Number(state.bank?.[bankIssue] || 0)} remain.`;
      } else if (giveTradeCount === 0 && takeTotal === 0) {
        bankInfo.textContent = 'Nothing is selected. Add one or more outgoing trades, then choose the same total number of resources to receive.';
      } else if (giveTradeCount !== takeTotal) {
        const difference = giveTradeCount - takeTotal;
        bankInfo.textContent = difference > 0
          ? `Choose ${difference} more resource${difference === 1 ? '' : 's'} to receive.`
          : `Add ${Math.abs(difference)} more outgoing trade${Math.abs(difference) === 1 ? '' : 's'}.`;
      } else {
        bankInfo.textContent = `Ready: trade ${formatResources(give)} for ${formatResources(take)}.`;
      }

      if (tradeBtn) tradeBtn.disabled = !balanced || !!inventoryIssue || !!bankIssue || !!model.conflictKind;
    }

    force4.addEventListener('change', () => {
      model.conflictKind = null;
      refresh();
    });

    openModal({
      title: 'Bank Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Trade', primary: true, onClick: () => {
          const give = selectedGiveMap();
          const take = selectedTakeMap();
          closeModal();
          sendGameAction({ kind: 'bank_trade', give, take, forceRatio: force4.checked ? 4 : null });
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
    if (!canViewPendingTrade()) return;
    const t = state.pendingTrade;

    // Don't interrupt other locked flows
    if (!forceOpen && !ui.modal.classList.contains('hidden') && modalType !== 'pendingTrade') return;

    // Timer checks and unrelated state packets must not replace buttons under a
    // player's pointer or keyboard focus. Rebuild only when the offer changes.
    const contentKey = JSON.stringify([pendingTradeKey(), t, state.paused,
      (state.players || []).map(p => [p.id, p.name, p.color])]);
    lastTradePromptKeySeen = pendingTradeKey();
    pendingTradePromptId = 0;
    if (modalType === 'pendingTrade' && !ui.modal.classList.contains('hidden') && contentKey === pendingTradeModalKey) return;
    pendingTradeModalKey = contentKey;

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

    // --- Grid: player response statuses. Voting controls live in the modal's
    // bottom action row so every responder uses the same clear controls.
    const grid = document.createElement('div');
    grid.className = 'ptGrid ptStatusGrid';

    const h1 = document.createElement('div');
    h1.className = 'ptCell ptHeader';
    h1.textContent = '';
    const h2 = document.createElement('div');
    h2.className = 'ptCell ptHeader';
    h2.textContent = 'Response';
    grid.appendChild(h1); grid.appendChild(h2);

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

      const statusCell = document.createElement('div');
      const status = p.id === t.fromId ? 'offering' : (responses[p.id] || 'pending');
      statusCell.className = `ptCell ptResponseStatus ${status}`;
      statusCell.textContent = status === 'accept' ? 'Accepted'
        : status === 'reject' ? 'Rejected'
          : status === 'offering' ? 'Offering'
            : 'Pending';

      grid.appendChild(nameCell);
      grid.appendChild(statusCell);
    }

    box.appendChild(grid);
    const closeHint = document.createElement('div');
    closeHint.className = 'smallNote';
    closeHint.textContent = 'Close to keep playing. Use Player Trade to reopen this offer while it is available. Closing does not change your response.';
    box.appendChild(closeHint);
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
      const acceptedPlayers = (state.players || []).filter((player) => player && responses[player.id] === 'accept');
      for (const player of acceptedPlayers) {
        modalActions.push({
          label: `Trade with ${player.name || 'Player'}`,
          primary: true,
          onClick: () => sendGameAction({ kind: 'finalize_trade', tradeId: t.id, withPlayerId: player.id }),
        });
      }
    } else {
      const respond = (accept) => {
        sendGameAction({ kind: 'respond_trade', tradeId: t.id, accept });
      };
      modalActions.push({ label: 'Reject', onClick: () => respond(false) });
      modalActions.push({ label: 'Accept', primary: true, onClick: () => respond(true) });
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
    const allApproved = !!(v.finalizeAt && Number(v.finalizeAt) > 0);
    const secondsLeft = allApproved ? Math.max(0, Math.ceil((Number(v.finalizeAt) - Date.now()) / 1000)) : null;
    info.textContent = allApproved
      ? `All players approved. Game ends in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}. Any player (including the proposer) can withdraw approval to cancel the countdown.`
      : (proposer ? proposer.name : 'A player') + ' proposed ending the game early. Everyone must approve. You can change your approval at any time before the game ends.';
    if (allApproved) {
      const countdown = document.createElement('div');
      countdown.className = 'endVoteCountdown';
      countdown.setAttribute('role', 'status');
      countdown.textContent = `${secondsLeft}s`;
      box.appendChild(countdown);
    }
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
    h3.textContent = 'Withdraw / Reject';
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
      rowName.textContent = p.name + (p.id === v.fromId ? ' (proposer)' : '');
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
      rejectBtn.innerHTML = status === 'accept' ? '↩' : '✖';
      rejectBtn.title = status === 'accept' ? 'Withdraw approval (stop countdown)' : 'Reject end-game vote';

      const isMeRow = (p.id === myPlayerId);
      if (isMeRow) {
        approveBtn.disabled = status === 'accept';
        rejectBtn.disabled = false;

        approveBtn.addEventListener('click', () => {
          sendGameAction({ kind: 'respond_endgame', voteId: v.id, accept: true });
        });
        rejectBtn.addEventListener('click', () => {
          // An existing yes vote is revocable (including the proposer's yes).
          // A player who has not approved can explicitly reject the proposal.
          sendGameAction({ kind: 'respond_endgame', voteId: v.id,
            ...(status === 'accept' ? { withdraw: true } : { accept: false }) });
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
    if (!canOpenPlayerTrade()) return;
    if (isLocalPairedExtraTurn(state)) {
      setError('Player-to-player trades are unavailable during the extra action turn.');
      return;
    }
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

    const resourceKinds = ['brick','lumber','wool','grain','ore'];
    const recv = Object.fromEntries(resourceKinds.map(k => [k, 0]));
    const give = Object.fromEntries(resourceKinds.map(k => [k, 0]));

    const help = document.createElement('div');
    help.className = 'smallNote';
    help.textContent = 'Choose what you receive on the top row and what you give on the bottom row. A resource selected on one side is unavailable on the other side.';
    help.style.marginBottom = '6px';
    playerBox.appendChild(help);

    // Prefill when revising an existing pending trade.
    if (opts && (opts.initOffer || opts.initRequest)) {
      const io = opts.initOffer || {};
      const ir = opts.initRequest || {};
      for (const k of resourceKinds) {
        give[k] = Math.max(0, Math.floor(Number(io[k] || 0)));
        recv[k] = Math.max(0, Math.floor(Number(ir[k] || 0)));
      }
    }

    function makeChip(k, getVal, setVal, getOppositeVal, signMode) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'resChipBtn';

      function change(delta) {
        const v = Number(getVal() || 0);
        if (delta > 0 && Number(getOppositeVal() || 0) > 0) return;
        setVal(Math.max(0, v + delta));
        refresh();
      }

      chip.addEventListener('click', (ev) => change(ev.shiftKey ? -1 : 1));
      chip.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        change(-1);
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

          const blockedByOppositeSide = n === 0 && Number(getOppositeVal() || 0) > 0;
          chip.disabled = blockedByOppositeSide;
          chip.title = blockedByOppositeSide
            ? `Remove ${k} from the other side before selecting it here.`
            : 'Click +1 · Shift-click / Right-click -1';
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
      for (const k of resourceKinds) {
        const src = (arrowKind === 'down') ? recv : give;
        const opposite = (arrowKind === 'down') ? give : recv;
        const sign = (arrowKind === 'down') ? 'plus' : 'minus';
        const c = makeChip(k, () => src[k], (v) => { src[k] = v; }, () => opposite[k], sign);
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

    const tradeInfo = document.createElement('div');
    tradeInfo.className = 'smallNote';
    tradeInfo.style.marginTop = '6px';
    playerBox.appendChild(tradeInfo);
    wrap.appendChild(playerBox);

    function totals(m) {
      let t = 0;
      for (const k of resourceKinds) t += (m[k] || 0);
      return t;
    }

    function getOffer() {
      const out = {};
      for (const k of resourceKinds) {
        const n = Math.max(0, Math.floor(Number(give[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }
    function getRequest() {
      const out = {};
      for (const k of resourceKinds) {
        const n = Math.max(0, Math.floor(Number(recv[k] || 0)));
        if (n > 0) out[k] = n;
      }
      return out;
    }

    function selectedOverlapKind() {
      return resourceKinds.find(k => Number(give[k] || 0) > 0 && Number(recv[k] || 0) > 0) || null;
    }

    let proposeBtn = null;

    function refresh() {
      for (const c of [...topRow.chips, ...bottomRow.chips]) c.update();

      const offer = getOffer();
      const request = getRequest();
      const overlapKind = selectedOverlapKind();

      if (overlapKind) {
        tradeInfo.textContent = `Remove ${overlapKind} from one side. The same resource cannot be given and received in a player trade.`;
      } else {
        tradeInfo.textContent = 'The same resource cannot appear on both sides of a player trade.';
      }

      if (proposeBtn) {
        proposeBtn.disabled = totals(offer) === 0 || totals(request) === 0 || !!overlapKind;
      }
    }

    modalType = 'playerTradeCompose';
    openModal({
      title: reviseOfTradeId ? 'Revise Trade' : 'Player Trade',
      bodyNode: wrap,
      actions: [
        { label: 'Close', onClick: closeModal },
        { label: 'Propose', primary: true, onClick: () => {
          const offer = getOffer();
          const request = getRequest();
          if (selectedOverlapKind()) {
            refresh();
            return;
          }
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

    if (isLocalPairedExtraTurn(state)) {
      if (modalType === 'pendingTrade' || modalType === 'playerTradeCompose') forceCloseModal();
      return;
    }

    const t = state.pendingTrade;

    // If trade cleared, close any open trade modal
    if (!t || !t.id) {
      pendingTradePromptId = 0;
      if (modalType === 'pendingTrade') forceCloseModal();
      lastTradePromptKeySeen = '';
      pendingTradeModalKey = '';
      return;
    }

    const isTradeParticipant = myPlayerId === t.fromId || Object.prototype.hasOwnProperty.call(t.responses || {}, myPlayerId);
    if (!isTradeParticipant) {
      pendingTradePromptId = 0;
      if (modalType === 'pendingTrade') forceCloseModal();
      return;
    }

    const tradeId = Number(t.id || 0);
    const tradePromptKey = pendingTradeKey();

    // Keep the proposed-trade modal live-updated while it's open
    if (modalType === 'pendingTrade' && !ui.modal.classList.contains('hidden')) {
      pendingTradePromptId = 0;
      lastTradePromptKeySeen = tradePromptKey;
      openPendingTradeModal(true);
      return;
    }

    // A dismissed offer stays dismissed, including while another menu is open.
    if (tradePromptKey === lastTradePromptKeySeen && tradeId !== Number(pendingTradePromptId || 0)) return;

    // A revision is a new decision for every participant. Bring it back over an
    // ordinary menu immediately; mandatory locked choices remain uninterrupted
    // and will show the revised trade as soon as they finish.
    const isRevisedTrade = Number(t.replacesTradeId || 0) > 0;
    if (!ui.modal.classList.contains('hidden')) {
      if (isRevisedTrade && !modalLocked) {
        forceCloseModal();
      } else {
        pendingTradePromptId = tradeId;
        return;
      }
    }

    pendingTradePromptId = 0;
    lastTradePromptKeySeen = tradePromptKey;

    openPendingTradeModal(true);
  }



  function handleTurnUndoVotePrompt() {
    if (!state || !myPlayerId) return;
    const vote = state.turnUndoVote;
    if (!vote || !vote.id) {
      turnUndoResponsePendingVoteId = 0;
      if (modalType === 'turnUndoVote') forceCloseModal();
      return;
    }
    const voteId = Number(vote.id || 0);
    if (turnUndoResponsePendingVoteId && turnUndoResponsePendingVoteId !== voteId) turnUndoResponsePendingVoteId = 0;
    if (vote.responses && vote.responses[myPlayerId]) {
      turnUndoResponsePendingVoteId = 0;
      if (modalType === 'turnUndoVote') forceCloseModal();
      return;
    }
    // Do not reopen from a stale state packet while this player's response is
    // travelling to the server. The authoritative state will either record the
    // response, clear a rejected vote, or restore the previous turn.
    if (turnUndoResponsePendingVoteId === voteId) return;
    if (!ui.modal.classList.contains('hidden') && modalType !== 'turnUndoVote') return;
    const proposer = (state.players || []).find((player) => player.id === vote.fromId);
    const body = document.createElement('div');
    body.className = 'modalText';
    body.textContent = `${proposer?.name || 'A player'} wants to undo the current turn and return the game to the start of the previous player's turn. This requires every player to approve.`;
    modalType = 'turnUndoVote';
    openModal({
      title: 'Undo Previous Turn?',
      bodyNode: body,
      actions: [
        { label: 'Reject', onClick: () => { turnUndoResponsePendingVoteId = voteId; sendGameAction({ kind: 'respond_turn_undo', voteId, accept: false }); modalType = null; forceCloseModal(); } },
        { label: 'Approve Undo', primary: true, onClick: () => { turnUndoResponsePendingVoteId = voteId; sendGameAction({ kind: 'respond_turn_undo', voteId, accept: true }); modalType = null; forceCloseModal(); } },
      ],
    });
  }

  function handleEndGameVotePrompt() {
    if (!state || !myPlayerId) return;

    // Server vote sequences restart for each new room. Deduplication must be
    // scoped to the room, otherwise the first End Game vote in a rematch can
    // reuse a prior vote ID and never open its popup.
    const promptRoomCode = String(room?.code || state.roomCode || '');
    if (lastEndVotePromptRoomCode !== promptRoomCode) {
      lastEndVotePromptRoomCode = promptRoomCode;
      lastEndVotePromptIdSeen = 0;
      pendingEndVotePromptId = 0;
    }

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

function configuredMicroActionSeconds() {
  const rules = (state && state.rules) || {};
  if (!state?.ranked && Number(rules.playTurnMs) === 0) return 0;
  const ms = Number(rules.microPhaseMs ?? rules.microMs ?? 15000);
  if (ms === 0) return 0;
  return Math.max(1, Math.ceil((Number.isFinite(ms) ? ms : 15000) / 1000));
}

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

  const sub = document.createElement('div');
  sub.style.opacity = '0.85';
  sub.style.fontSize = '12px';
  sub.style.marginBottom = '10px';
  sub.textContent = configuredMicroActionSeconds() === 0
    ? 'Timer Off — choose a resource when you are ready.'
    : `You have ${configuredMicroActionSeconds()} seconds before the game auto-picks.`;
  wrap.appendChild(sub);

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
  const selectionDeadline = configuredMicroActionSeconds() === 0
    ? 'Timer Off — choose your resources when you are ready.'
    : `You have ${configuredMicroActionSeconds()} seconds before the game auto-picks.`;
  sub.textContent = (sp.roll != null)
    ? `Triggered by roll ${sp.roll}. ${selectionDeadline}`
    : selectionDeadline;
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

  function friendlyRobberProtectedPlayersForTileClient(tileId) {
    if (!state || state.rules?.friendlyRobber !== true) return [];
    const tile = state.geom?.tiles?.[tileId];
    if (!tile) return [];
    const protectedPlayers = new Map();
    const protectOwner = (ownerId) => {
      if (!ownerId) return;
      const player = (state.players || []).find((candidate) => candidate && candidate.id === ownerId);
      if (!player || player.departed || Math.max(0, Number(player.vp || 0)) > 2) return;
      protectedPlayers.set(player.id, player);
    };

    if (tile.type === 'sea') {
      for (const edge of (state.geom?.edges || [])) {
        if (!edge || !edge.shipOwner) continue;
        const adjacentTileIds = state.geom?.edgeAdjTiles?.[edge.id];
        if (Array.isArray(adjacentTileIds) && adjacentTileIds.includes(tileId)) protectOwner(edge.shipOwner);
      }
    } else {
      for (const nodeId of (tile.cornerNodeIds || [])) {
        protectOwner(state.geom?.nodes?.[nodeId]?.building?.owner);
      }
    }
    return Array.from(protectedPlayers.values());
  }

  function friendlyRobberTileBlockedClient(tileId) {
    return friendlyRobberProtectedPlayersForTileClient(tileId).length > 0;
  }

  function rejectFriendlyRobberTileClient(tileId) {
    const protectedPlayers = friendlyRobberProtectedPlayersForTileClient(tileId);
    if (!protectedPlayers.length) return false;
    const names = protectedPlayers.map((player) => player.name || 'Player').join(', ');
    setError(`Friendly Robber protects this ${state.geom?.tiles?.[tileId]?.type === 'sea' ? 'sea ' : ''}tile because ${names} ${protectedPlayers.length === 1 ? 'has' : 'have'} 2 VP or fewer.`);
    return true;
  }

  function thiefPlacementTileLegalClient(t, phase = state && state.phase) {
    if (!t) return false;
    const movePhase = String(phase || '');
    const isSeaTile = t.type === 'sea';
    const canRobberHere = (!isSeaTile && !t.robber && !friendlyRobberTileBlockedClient(t.id));
    const canPirateHere = (isSeaTile && !(t.fog && !t.revealed) && !t.pirate && !friendlyRobberTileBlockedClient(t.id));

    if (movePhase === 'pirate-or-robber') return canRobberHere || canPirateHere;
    if (movePhase === 'robber-move') return canRobberHere;
    if (movePhase === 'pirate-move') return canPirateHere;
    return false;
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
    if (!state || !myPlayerId || historyReplay.active) return;
    if (state.paused) { setError('Game is paused.'); return; }
    hideBuildPopup();
    hideThiefMoveConfirmPopup();
    const rect = ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!screenCache) return;

    // Custom Map tile and port painting in lobby (host only)
    if (state && state.phase === 'lobby' && room && room.hostId === myPlayerId) {
      const rr = room.rules || state.rules || {};
      const mm = String(rr.mapMode || 'classic').toLowerCase();
      const scen = String(rr.seafarersScenario || 'four_islands').toLowerCase();
      if ((mm === 'seafarers' && uiIsTestBuilderScenario(rr)) || (['classic','classic56','classic78'].includes(mm) && rr.customMap === true)) {
        const tool = String(ui.testToolSelect?.value || 'tile');
        if (tool === 'port') {
          const edgeId = pickEdge(x, y);
          if (edgeId != null) {
            const portKind = String(ui.testPortSelect?.value || 'generic');
            send({ type: 'edit_preview_port', edgeId, portKind });
          }
        } else {
          const tid = pickTile(x, y);
          if (tid != null) {
            const tileType = (ui.testBrushSelect && ui.testBrushSelect.value) ? ui.testBrushSelect.value : 'sea';
            const nstr = (ui.testNumberSelect && ui.testNumberSelect.value) ? ui.testNumberSelect.value : '';
            const num = nstr ? parseInt(nstr, 10) : null;
            send({ type: 'edit_preview_tile', tileId: tid, tileType, number: num });
          }
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
        const unrevealedFog = !!(tile?.fog && !tile?.revealed);

        if (isSea) {
          if (unrevealedFog) {
            setError('Pirate cannot be placed on an unrevealed fog tile.');
            return;
          }
          if (tile?.pirate) {
            setError('Pirate must move to a different tile.');
            return;
          }
          if (rejectFriendlyRobberTileClient(tid)) return;
          promptThiefMoveConfirm({ kind: 'move_pirate', tileId: tid }, e.clientX, e.clientY);
        } else {
          if (tile?.robber) {
            setError('Robber must move to a different tile.');
            return;
          }
          if (rejectFriendlyRobberTileClient(tid)) return;
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
        if (rejectFriendlyRobberTileClient(tid)) return;
        promptThiefMoveConfirm({ kind: 'move_robber', tileId: tid }, e.clientX, e.clientY);
      }
      return;
    }
    if (phase === 'pirate-move') {
      const tid = pickTile(x, y);
      if (tid != null) {
        const tile = state.geom?.tiles?.[tid];
        if (tile?.fog && !tile?.revealed) {
          setError('Pirate cannot be placed on an unrevealed fog tile.');
          return;
        }
        if (tile?.pirate) {
          setError('Pirate must move to a different tile.');
          return;
        }
        if (rejectFriendlyRobberTileClient(tid)) return;
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
        if (shipWasPlacedThisOpportunityClient(hit)) {
          setError('A ship just placed cannot be moved until your next turn or extra turn.');
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

    // Click-to-build menu after rolling, or before rolling while Road Building is active.
    if (phase !== 'main-actions' && !(phase === 'main-await-roll' && roadBuildingPlacementActiveClient())) return;

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
    const rect = boardRenderRect || ui.canvas.getBoundingClientRect();
    return {
      x: (pt.x * view.scale) + (rect.width / 2) + view.ox,
      y: (pt.y * view.scale) + (rect.height / 2) + view.oy,
    };
  }
  function screenToWorld(pt) {
    const rect = boardRenderRect || ui.canvas.getBoundingClientRect();
    return {
      x: (pt.x - (rect.width / 2) - view.ox) / view.scale,
      y: (pt.y - (rect.height / 2) - view.oy) / view.scale,
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
    if (scen.includes('_78') || scen === 'test_builder' || scen === 'test_builder_56' || scen === 'test_builder_78' || scen === 'cartographer_4_manual' || scen === 'cartographer_4_random' || scen === 'cartographer_4' || scen === 'cartographer_56_manual' || scen === 'cartographer_56_random' || scen === 'cartographer_56') return false;
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

  function rulesTreatOuterBoundaryAsSeaForShipsClient() {
    const rules = state?.rules || {};
    if (String(rules.mapMode || 'classic').toLowerCase() !== 'seafarers') return false;
    const scenario = String(rules.seafarersScenario || '').toLowerCase().replace(/-/g, '_');
    return scenario === 'cartographer_4_manual' || scenario === 'cartographer_4_random' || scenario === 'cartographer_4' ||
      scenario === 'cartographer_56_manual' || scenario === 'cartographer_56_random' || scenario === 'cartographer_56';
  }

  function edgeTouchesSeaAfterOuterSeaTrimClient(edgeId) {
    const rawAdj = (state && state.geom && state.geom.edgeAdjTiles && Array.isArray(state.geom.edgeAdjTiles[edgeId])) ? state.geom.edgeAdjTiles[edgeId] : [];
    const adj = edgeAdjTilesAfterOuterSeaTrimClient(edgeId);
    if (!adj.length) return false;
    const tileIsSea = (tid) => String(state.geom.tiles?.[tid]?.type || '').toLowerCase() === 'sea';
    if (adj.some(tileIsSea)) return true;
    if (rawAdj.some(tid => !adj.includes(tid) && tileIsSea(tid))) return true;
    return rawAdj.length === 1 && rulesTreatOuterBoundaryAsSeaForShipsClient();
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

  function fitBoardToViewport(width, height) {
    if (!view.autoFit || !state?.geom?.tiles?.length || width <= 0 || height <= 0) return;
    const tiles = state.geom.tiles.filter(tile => !shouldHideOuterSeaBorderTileClient(tile));
    if (!tiles.length) return;
    const minX = Math.min(...tiles.map(tile => tile.cx - Math.sqrt(3) / 2));
    const maxX = Math.max(...tiles.map(tile => tile.cx + Math.sqrt(3) / 2));
    const minY = Math.min(...tiles.map(tile => tile.cy - 1));
    const maxY = Math.max(...tiles.map(tile => tile.cy + 1));
    const inGame = state.phase !== 'lobby';
    const top = inGame ? Math.min(140, height * 0.25) : 16;
    const bottom = inGame ? Math.min(70, height * 0.15) : 16;
    const availableWidth = Math.max(1, width - 32);
    const availableHeight = Math.max(1, height - top - bottom);
    view.scale = Math.min(availableWidth / (maxX - minX), availableHeight / (maxY - minY));
    view.ox = -(minX + maxX) / 2 * view.scale;
    view.oy = (top - bottom) / 2 - (minY + maxY) / 2 * view.scale;
  }

  function render() {
    // Coalesce pointer, resize, image-load, and network bursts into one paint.
    if (boardRenderFrame !== null) return;
    boardRenderFrame = requestAnimationFrame(() => {
      boardRenderFrame = null;
      boardRenderRect = ui.canvas.getBoundingClientRect();
      // Chrome/mobile flex rows may resize without a window resize event.
      // Match the canvas backing store to its actual CSS bounds before each draw.
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const pixelsWide = Math.max(1, Math.round(boardRenderRect.width * dpr));
      const pixelsHigh = Math.max(1, Math.round(boardRenderRect.height * dpr));
      if (ui.canvas.width !== pixelsWide || ui.canvas.height !== pixelsHigh) {
        ui.canvas.width = pixelsWide;
        ui.canvas.height = pixelsHigh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { drawBoard(); } finally { boardRenderRect = null; }
    });
  }

  function drawBoard() {
    if (!state) hideShipMoveCancelPopup();
    // Clear
    const w = boardRenderRect.width;
    const h = boardRenderRect.height;
    fitBoardToViewport(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

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
      ctx.restore();
      return;
    }

    // Build cache
    screenCache = { nodes: [], edges: [], tiles: [] };

    // Draw tiles
    const activePlayerThiefMove = !historyReplay.active && (state.currentPlayerId === myPlayerId) && (state.phase === 'pirate-or-robber' || state.phase === 'robber-move' || state.phase === 'pirate-move');
    const thiefHighlightPhase = String(state.phase || '');
    const thiefPulse = 0.65 + 0.35 * Math.sin((Date.now() % 1200) / 1200 * Math.PI * 2);

    for (const t of state.geom.tiles) {
      const c = worldToScreen({ x: t.cx, y: t.cy });
      const poly = tilePolygonScreen(t);
      const hideOuterSeaBorderTile = shouldHideOuterSeaBorderTileClient(t);
      if (!hideOuterSeaBorderTile) screenCache.tiles.push({ id: t.id, poly });
      if (hideOuterSeaBorderTile) continue;
      // Skip the drawing work for fully off-screen terrain to avoid mobile GPU
      // artifacts when a zoomed map is dragged beneath the fixed control rows.
      const minDrawX = Math.min(...poly.map(p => p.x));
      const maxDrawX = Math.max(...poly.map(p => p.x));
      const minDrawY = Math.min(...poly.map(p => p.y));
      const maxDrawY = Math.max(...poly.map(p => p.y));
      if (maxDrawX < 0 || minDrawX > w || maxDrawY < 0 || minDrawY > h) continue;

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
        const showChoice = thiefPlacementTileLegalClient(t, thiefHighlightPhase);

        if (showChoice) {
          const legalFill = isSeaTile ? 'rgba(55,190,255,.88)' : 'rgba(255,201,48,.88)';
          const legalStroke = isSeaTile ? 'rgba(145,235,255,.90)' : 'rgba(255,239,145,.90)';

          // Keep the destination wash clearly visible while drawing it with the
          // terrain so roads, ships, settlements, cities, and tokens remain above it.
          ctx.save();
          ctx.globalAlpha = 0.26 + 0.12 * thiefPulse;
          ctx.fillStyle = legalFill;
          ctx.beginPath();
          poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // A dark halo separates the legal outline from bright terrain and sea artwork.
          ctx.save();
          ctx.globalAlpha = 0.60;
          ctx.strokeStyle = 'rgba(0,0,0,.70)';
          ctx.lineWidth = Math.max(6, view.scale * 0.065);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // Bright pulsing double border marks the exact clickable hex.
          ctx.save();
          ctx.globalAlpha = 0.72 + 0.16 * thiefPulse;
          ctx.strokeStyle = legalStroke;
          ctx.lineWidth = Math.max(4, view.scale * 0.045);
          ctx.lineJoin = 'round';
          ctx.shadowColor = legalStroke;
          ctx.shadowBlur = Math.max(6, view.scale * 0.08);
          ctx.beginPath();
          poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.55 + 0.12 * thiefPulse;
          ctx.strokeStyle = 'rgba(255,255,255,.72)';
          ctx.lineWidth = Math.max(2, view.scale * 0.022);
          ctx.setLineDash([Math.max(7, view.scale * 0.085), Math.max(4, view.scale * 0.05)]);
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

        // Place every marker on the true sea-facing normal of its shoreline.
        // Irregular scenarios such as Scattered Tiles can put a port on an open
        // board boundary, where there is a land tile but no explicit sea tile.
        // Using absolute board coordinates as the old fallback made those ports
        // drift sideways. The land-center -> edge-midpoint vector is the exact
        // outward normal for those boundary edges and works on every board shape.
        const tiles = state.geom.tiles || [];
        const sea = p.seaTileId != null ? tiles[p.seaTileId] : null;
        const land = p.landTileId != null ? tiles[p.landTileId] : null;
        let dx = 0; let dy = 0;
        if (sea && land) {
          dx = sea.cx - land.cx;
          dy = sea.cy - land.cy;
        } else if (land) {
          dx = mid.x - land.cx;
          dy = mid.y - land.cy;
        } else if (sea) {
          dx = sea.cx - mid.x;
          dy = sea.cy - mid.y;
        } else {
          // Defensive fallback for old/custom saved maps missing tile ids: pick
          // the edge normal pointing away from the center of the rendered board.
          const boardCenter = tiles.reduce((sum, tile) => ({ x: sum.x + Number(tile?.cx || 0), y: sum.y + Number(tile?.cy || 0) }), { x: 0, y: 0 });
          const tileCount = Math.max(1, tiles.length);
          boardCenter.x /= tileCount; boardCenter.y /= tileCount;
          const edgeX = nb.x - na.x; const edgeY = nb.y - na.y;
          const normalA = { x: -edgeY, y: edgeX };
          const awayX = mid.x - boardCenter.x; const awayY = mid.y - boardCenter.y;
          const sign = (normalA.x * awayX + normalA.y * awayY) >= 0 ? 1 : -1;
          dx = normalA.x * sign; dy = normalA.y * sign;
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
          drawVisibleImageCentered(ctx, portImg, ps.x, ps.y, sz * 0.94);
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
    const myTurn = !historyReplay.active && (state.currentPlayerId === myPlayerId);
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
          const adjacentTiles = state.geom.nodeAdjTiles?.[n.id] || [];
          const touchesVisibleLand = adjacentTiles.some((tileId) => {
            const tile = state.geom.tiles?.[tileId];
            return !!(tile && tile.type !== 'sea' && !(tile.fog && !tile.revealed));
          });
          if (!touchesVisibleLand) continue;
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
        const placementScale = structurePlacementScale('road', e.id, e.roadOwner);
        if (!drawEdgeStructureSprite('road', colIdx, as.x, as.y, bs.x, bs.y, placementScale)) {
          const mx = (as.x + bs.x) / 2;
          const my = (as.y + bs.y) / 2;
          ctx.save();
          ctx.translate(mx, my);
          ctx.scale(placementScale, placementScale);
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(as.x - mx, as.y - my);
          ctx.lineTo(bs.x - mx, bs.y - my);
          ctx.stroke();
          ctx.restore();

          if (colorblindMode) {
            const ang = Math.atan2(bs.y - as.y, bs.x - as.x);
            drawColorblindMark(colIdx, mx, my, 18 * placementScale, ang);
          }
        }
      }

      if (e.shipOwner) {
        const p = state.players.find(pp => pp.id === e.shipOwner);
        const colIdx = playerColorIndex(p?.color);
        const placementScale = structurePlacementScale('ship', e.id, e.shipOwner);
        if (!drawEdgeStructureSprite('ship', colIdx, as.x, as.y, bs.x, bs.y, placementScale)) {
          const mx = (as.x + bs.x) / 2;
          const my = (as.y + bs.y) / 2;
          ctx.save();
          ctx.translate(mx, my);
          ctx.scale(placementScale, placementScale);
          ctx.strokeStyle = p?.color || '#ffffff';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(as.x - mx, as.y - my);
          ctx.lineTo(bs.x - mx, bs.y - my);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          if (colorblindMode) {
            const ang = Math.atan2(bs.y - as.y, bs.x - as.x);
            drawColorblindMark(colIdx, mx, my, 16 * placementScale, ang);
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
        drawSettlement(s.x, s.y, col, structurePlacementScale('settlement', n.id, n.building.owner));
      } else {
        drawCity(s.x, s.y, col, structurePlacementScale('city', n.id, n.building.owner));
      }
    }

    // Keep the actual robber/pirate pieces above structures. Legal destination
    // highlights stay in the terrain pass below every player-built piece.
    drawThiefMarkersOverlayPass(activePlayerThiefMove, thiefHighlightPhase, thiefPulse);
    drawColorblindPieceMarksOverlayPass();
    drawThiefPlacementMarksOverlayPass(activePlayerThiefMove, thiefHighlightPhase, thiefPulse);

    // Overlay current selection mode
    if (state.currentPlayerId === myPlayerId) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(10, 10, 260, 40);
      ctx.fillStyle = '#e8eef6';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.fillText(`${window.HexSettlersLanguages?.t('Mode') || 'Mode'}: ${window.HexSettlersLanguages?.t(inputMode.kind ? inputMode.kind.replaceAll('_',' ') : 'view') || (inputMode.kind ? inputMode.kind.replaceAll('_',' ') : 'view')}`, 20, 34);
      ctx.restore();
    }

    updateShipMoveCancelPopupPosition();
    ctx.restore();
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

  function drawThiefPlacementMarksOverlayPass(activePlayerThiefMove, thiefHighlightPhase, thiefPulse) {
    if (!activePlayerThiefMove || !state || !state.geom || !Array.isArray(state.geom.tiles)) return;

    const drawMarkPath = (legal, x, y, size) => {
      ctx.beginPath();
      if (legal) {
        ctx.moveTo(x - size * 0.58, y - size * 0.02);
        ctx.lineTo(x - size * 0.16, y + size * 0.42);
        ctx.lineTo(x + size * 0.64, y - size * 0.52);
      } else {
        ctx.moveTo(x - size * 0.52, y - size * 0.52);
        ctx.lineTo(x + size * 0.52, y + size * 0.52);
        ctx.moveTo(x + size * 0.52, y - size * 0.52);
        ctx.lineTo(x - size * 0.52, y + size * 0.52);
      }
    };

    for (const tile of state.geom.tiles) {
      if (!tile || shouldHideOuterSeaBorderTileClient(tile)) continue;
      const legal = thiefPlacementTileLegalClient(tile, thiefHighlightPhase);
      const center = worldToScreen({ x: tile.cx, y: tile.cy });
      const isSeaTile = tile.type === 'sea';
      const hexHeight = 2 * view.scale;
      const numberSize = Math.round(hexHeight / 3);
      const hasVisibleNumber = !!(tile.number && !(tile.fog && !tile.revealed));
      const markX = center.x;
      const markY = (!isSeaTile && hasVisibleNumber) ? center.y - numberSize * 0.76 : center.y;
      const markSize = Math.max(10, Math.min(27, hexHeight * 0.13));
      const markColor = legal ? '#35e66b' : '#ff3347';

      ctx.save();
      ctx.globalAlpha = 0.92 + 0.08 * thiefPulse;
      ctx.fillStyle = 'rgba(6,12,20,.78)';
      ctx.strokeStyle = markColor;
      ctx.lineWidth = Math.max(2, markSize * 0.12);
      ctx.shadowColor = 'rgba(0,0,0,.9)';
      ctx.shadowBlur = Math.max(4, markSize * 0.34);
      ctx.beginPath();
      ctx.arc(markX, markY, markSize * 0.84, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,.92)';
      ctx.lineWidth = Math.max(5, markSize * 0.38);
      drawMarkPath(legal, markX, markY, markSize);
      ctx.stroke();
      ctx.strokeStyle = markColor;
      ctx.lineWidth = Math.max(3, markSize * 0.22);
      drawMarkPath(legal, markX, markY, markSize);
      ctx.stroke();
      ctx.restore();
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
          const placementScale = structurePlacementScale('road', e.id, e.roadOwner);
          const s = Math.max(10, Math.round(base * 0.5 * placementScale));
          drawColorblindMark(colIdx, mx, my, s, ang);
        }
        if (e.shipOwner) {
          const p = state.players.find(pp => pp.id === e.shipOwner);
          const colIdx = playerColorIndex(p?.color);
          const len = Math.max(16, Math.round(dist * 0.5));
          const thick = Math.max(10, Math.round(hexH * 0.08));
          const base = Math.min(len, Math.max(thick * 2.5, thick + 8));
          const placementScale = structurePlacementScale('ship', e.id, e.shipOwner);
          const s = Math.max(10, Math.round(base * 0.5 * placementScale));
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
        const placementScale = structurePlacementScale(n.building.type === 'city' ? 'city' : 'settlement', n.id, n.building.owner);
        const sz = Math.max(22, Math.round(hexH / 3)) * placementScale;
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

  function drawEdgeStructureSprite(kind, colorIdx, ax, ay, bx, by, scale = 1) {
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
    const safeScale = Math.max(1, Number(scale || 1));
    const len = Math.max(16, Math.round(dist * 0.5)) * safeScale;
    const thick = Math.max(10, Math.round(hexH * (isShip ? 0.08 : 0.07))) * safeScale;

    return drawStructureSprite(kind, colorIdx, mx, my, len, thick, ang);
  }

  function drawSettlement(x, y, color, scale = 1) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const safeScale = Math.max(1, Number(scale || 1));
    const sz = Math.max(22, Math.round(hexH / 3)) * safeScale; // newly placed pieces briefly render 50% larger
    if (drawStructureSprite('settlement', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10 * safeScale);
    ctx.lineTo(x + 10 * safeScale, y + 8 * safeScale);
    ctx.lineTo(x - 10 * safeScale, y + 8 * safeScale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (colorblindMode) {
      drawColorblindMark(colIdx, x, y, Math.max(12, Math.round(sz * 0.55)), 0);
    }
  }

  function drawCity(x, y, color, scale = 1) {
    const colIdx = playerColorIndex(color);
    const hexH = 2 * view.scale;
    const safeScale = Math.max(1, Number(scale || 1));
    const sz = Math.max(22, Math.round(hexH / 3)) * safeScale; // newly placed pieces briefly render 50% larger
    if (drawStructureSprite('city', colIdx, x, y, sz, sz, 0)) return;

    // Fallback simple shape
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    const w = 18 * safeScale, h = 14 * safeScale;
    ctx.beginPath();
    ctx.rect(x - w/2, y - h/2, w, h);
    ctx.fill();
    ctx.stroke();
    // little roof
    ctx.beginPath();
    ctx.moveTo(x - w/2, y - h/2);
    ctx.lineTo(x, y - h/2 - 10 * safeScale);
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
      if (isCasualTextureMode()) return;
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
      if (isCasualTextureMode()) return;
      try { ui.texturePackFileInput.value = ''; } catch (_) {}
      ui.texturePackFileInput.click();
    });
    ui.texturePackFileInput.addEventListener('change', () => {
      const file = (ui.texturePackFileInput.files && ui.texturePackFileInput.files[0]) ? ui.texturePackFileInput.files[0] : null;
      if (!file || isCasualTextureMode()) return;
      setTexturePackStatus('Importing texture pack ZIP…');
      void importTexturePackZipFile(file).catch((err) => {
        setError(err && err.message ? err.message : 'Failed to import texture pack ZIP.');
        refreshTexturePackUi();
      });
    });
  }

  if (ui.deleteTexturePackBtn) {
    ui.deleteTexturePackBtn.addEventListener('click', () => {
      if (isCasualTextureMode()) return;
      const active = activeTexturePackMeta();
      if (!active || !active.id || active.builtin) return;
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
