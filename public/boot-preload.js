/* V63 startup gate. Preloads the artwork used throughout the game and its
 * pre-lobby screens, and waits until the normal game image loader is ready.
 * Counters reflect settled network/image tasks, not a simulated percentage. */
(() => {
  'use strict';
  const layer = document.getElementById('gameBootLoader');
  if (!layer || location.hostname.toLowerCase() === 'admin.hexsettlers.org') {
    layer?.remove();
    return;
  }
  const progressBar = document.getElementById('gameBootProgressFill');
  const progressTrack = document.getElementById('gameBootProgressTrack');
  const progressValue = document.getElementById('gameBootProgressValue');
  const status = document.getElementById('gameBootStatus');
  const detail = document.getElementById('gameBootDetail');
  const escapeBtn = document.getElementById('gameBootContinue');
  const imageRel = [
    'gold-resource.png',
    ...['Invention','Knight','Monopoly','RoadBuilding','VictoryPoint'].map(x => `Dev Cards/${x}.png`),
    ...[2,3,4,5,6,8,9,10,11,12].map(n => `Numbers/${n}.png`),
    ...['brick','generic','grain','lumber','ore','wool'].map(x => `Ports/${x}.png`),
    ...['Desert','Field','Forest','GoldFields','Hills','Mountains','Pasture','Seas','Unexplored'].map(x => `Resource Hexes/${x}.png`),
    'Robber Pirate/thief_pirate.png','Robber Pirate/thief_robber.png',
    ...['black','blue','green','orange','pink','purple','red','teal','white','yellow'].map(x => `Tokens/tokens_${x}.png`),
  ];
  const audioNames = ['dev_card','dice_roll','gold_field_production','game_loser','game_winner',
    'end_turn','paired_turn','robber_pirate','stolen_from','structure','trade_proposed',
    'trade_success','turn_bell'];
  let packId = 'default';
  try {
    const meta = JSON.parse(localStorage.getItem('hexsettlers_texture_pack_meta_v1') || 'null');
    if (meta?.activeId === 'simplified') packId = 'simplified';
  } catch (_) {}
  const textureBase = packId === 'simplified' ? '/texture-packs/simplified/' : '/texture%20pack/';
  const urls = [
    '/favicon.png',
    ...imageRel.map(rel => textureBase + rel.split('/').map(encodeURIComponent).join('/')),
    ...audioNames.map(name => `/assets/sfx/${name}.wav`),
  ];
  let settled = 0, failures = 0, appReady = false, assetsReady = false, closed = false;
  const total = urls.length;
  const retainedImages = [];
  const update = () => {
    // The final 5% requires the game itself to finish setting up.
    const percent = assetsReady && appReady && failures === 0 ? 100 : Math.min(95, Math.floor(settled / total * 95));
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressValue) progressValue.textContent = `${percent}%`;
    progressTrack?.setAttribute('aria-valuenow', String(percent));
    if (detail) detail.textContent = `${settled} of ${total} assets checked${failures ? ` · ${failures} unavailable` : ''}`;
    if (status) status.textContent = !assetsReady ? 'Loading board textures, menus, and audio…'
      : !appReady ? 'Preparing the game interface…' : 'Ready to play';
  };
  const close = () => {
    if (closed) return;
    closed = true;
    layer.classList.add('gameBootDone');
    layer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('game-booting');
    retainedImages.length = 0;
    // New texture-pack selections must load fresh art, not reuse boot-time
    // URLs after the player changes or replaces a custom pack.
    if (window.hexSettlersBootLoadImage === loadImage) delete window.hexSettlersBootLoadImage;
    imageJobs.clear();
    setTimeout(() => layer.remove(), 350);
  };
  const finishIfReady = () => {
    update();
    if (assetsReady && appReady && failures === 0) {
      if (status) status.textContent = 'Ready to play';
      close();
    } else if (assetsReady && failures > 0) {
      if (status) status.textContent = 'Some assets could not be preloaded';
      if (escapeBtn) escapeBtn.hidden = false;
    }
  };
  window.addEventListener('hexsettlers:game-images-ready', () => {
    appReady = true;
    finishIfReady();
  }, { once: true });
  // The normal game renderer shares these in-flight image requests, avoiding
  // duplicate texture transfers while the preloader and app initialize together.
  const imageJobs = new Map();
  function loadImage(url) {
    if (imageJobs.has(url)) return imageJobs.get(url);
    const job = new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        img.onload = img.onerror = null;
        if (ok) retainedImages.push(img);
        resolve(ok ? img : null);
      };
      const watchdog = setTimeout(() => finish(false), 15000);
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
    });
    imageJobs.set(url, job);
    return job;
  }
  window.hexSettlersBootLoadImage = loadImage;
  const checkImage = async url => !!(await loadImage(url));
  const checkAudio = async url => {
    const controller = new AbortController();
    const watchdog = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await fetch(url, { cache: 'force-cache', signal: controller.signal });
      if (!result.ok) return false;
      await result.arrayBuffer();
      return true;
    } catch (_) { return false; }
    finally { clearTimeout(watchdog); }
  };
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length && !closed) {
      const index = cursor++;
      const url = urls[index];
      const ok = url.endsWith('.wav') ? await checkAudio(url) : await checkImage(url);
      if (!ok) failures++;
      settled++;
      update();
    }
  }
  document.body.classList.add('game-booting');
  escapeBtn?.addEventListener('click', close);
  update();
  // If the connection stalls, never leave users imprisoned behind the gate.
  setTimeout(() => {
    if (!closed) {
      if (status) status.textContent = 'Still loading? You can continue while remaining assets finish.';
      if (escapeBtn) escapeBtn.hidden = false;
    }
  }, 22000);
  Promise.all(Array.from({length: Math.min(8, urls.length)}, worker)).then(() => {
    assetsReady = true;
    finishIfReady();
  });
})();
