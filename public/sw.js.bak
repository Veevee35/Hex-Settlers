/* Hex Settlers asset cache service worker (auto-generated) */
const CACHE_PREFIX = 'hexsettlers-asset-cache-';
const CACHE_NAME = CACHE_PREFIX + 'texturepack-v2';
const PRECACHE_URLS = [
  "/assets/sfx/dev_card.wav",
  "/assets/sfx/dice_roll.wav",
  "/assets/sfx/end_turn.wav",
  "/assets/sfx/paired_turn.wav",
  "/assets/sfx/robber_pirate.wav",
  "/assets/sfx/structure.wav",
  "/assets/sfx/trade_proposed.wav",
  "/assets/sfx/trade_success.wav",
  "/assets/sfx/turn_bell.wav",
  "/favicon.png",
  "/texture%20pack/Dev%20Cards/Invention.png",
  "/texture%20pack/Dev%20Cards/Knight.png",
  "/texture%20pack/Dev%20Cards/Monopoly.png",
  "/texture%20pack/Dev%20Cards/RoadBuilding.png",
  "/texture%20pack/Dev%20Cards/VictoryPoint.png",
  "/texture%20pack/Numbers/10.png",
  "/texture%20pack/Numbers/11.png",
  "/texture%20pack/Numbers/12.png",
  "/texture%20pack/Numbers/2.png",
  "/texture%20pack/Numbers/3.png",
  "/texture%20pack/Numbers/4.png",
  "/texture%20pack/Numbers/5.png",
  "/texture%20pack/Numbers/6.png",
  "/texture%20pack/Numbers/8.png",
  "/texture%20pack/Numbers/9.png",
  "/texture%20pack/Ports/brick.png",
  "/texture%20pack/Ports/generic.png",
  "/texture%20pack/Ports/grain.png",
  "/texture%20pack/Ports/lumber.png",
  "/texture%20pack/Ports/ore.png",
  "/texture%20pack/Ports/wool.png",
  "/texture%20pack/Resource%20Hexes/Desert.png",
  "/texture%20pack/Resource%20Hexes/Field.png",
  "/texture%20pack/Resource%20Hexes/Forest.png",
  "/texture%20pack/Resource%20Hexes/GoldFields.png",
  "/texture%20pack/Resource%20Hexes/Hills.png",
  "/texture%20pack/Resource%20Hexes/Mountains.png",
  "/texture%20pack/Resource%20Hexes/Pasture.png",
  "/texture%20pack/Resource%20Hexes/Seas.png",
  "/texture%20pack/Resource%20Hexes/Unexplored.png",
  "/texture%20pack/Robber%20Pirate/thief_pirate.png",
  "/texture%20pack/Robber%20Pirate/thief_robber.png",
  "/texture%20pack/Tokens/tokens_blue.png",
  "/texture%20pack/Tokens/tokens_green.png",
  "/texture%20pack/Tokens/tokens_orange.png",
  "/texture%20pack/Tokens/tokens_purple.png",
  "/texture%20pack/Tokens/tokens_red.png",
  "/texture%20pack/Tokens/tokens_teal.png",
  "/texture%20pack/Tokens/tokens_white.png",
  "/texture%20pack/Tokens/tokens_yellow.png",
];
const ASSET_EXT_RE = /\.(?:png|wav)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Precache best-effort so one bad fetch does not fail SW install.
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (err) {
        // ignore and rely on runtime fetch fallback
      }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) return caches.delete(name);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

async function cacheFirstStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const key = url.pathname; // normalize so query strings do not create duplicate entries

  // Prefer the normalized pathname entry (used by precache), then fall back to the request.
  let cached = await cache.match(key);
  if (!cached) cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
  if (cached) return cached;

  // Only go to network on a real cache miss.
  try {
    const net = await fetch(request);
    if (net && net.ok) {
      try { await cache.put(key, net.clone()); } catch (_) {}
    }
    return net;
  } catch (_) {
    // Final fallback in case another key form exists.
    return (await cache.match(request.url)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!ASSET_EXT_RE.test(url.pathname)) return;
  event.respondWith(cacheFirstStaticAsset(request));
});

self.addEventListener('message', (event) => {
  if (event && event.data === 'SKIP_WAITING') self.skipWaiting();
});
