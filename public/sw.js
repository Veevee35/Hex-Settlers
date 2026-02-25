/* Hex Settlers asset cache service worker (auto-generated) */
const CACHE_PREFIX = 'hexsettlers-asset-cache-';
const CACHE_NAME = CACHE_PREFIX + '9addbdc761a81ff3';
const PRECACHE_URLS = [
  "/assets/Desert.png",
  "/assets/Field.png",
  "/assets/Forest.png",
  "/assets/GoldFields.png",
  "/assets/Hills.png",
  "/assets/Mountains.png",
  "/assets/Pasture.png",
  "/assets/Seas.png",
  "/assets/Unexplored.png",
  "/assets/devcards/Invention.png",
  "/assets/devcards/Knight.png",
  "/assets/devcards/Monopoly.png",
  "/assets/devcards/RoadBuilding.png",
  "/assets/devcards/VictoryPoint.png",
  "/assets/num/10.png",
  "/assets/num/11.png",
  "/assets/num/12.png",
  "/assets/num/2.png",
  "/assets/num/3.png",
  "/assets/num/4.png",
  "/assets/num/5.png",
  "/assets/num/6.png",
  "/assets/num/8.png",
  "/assets/num/9.png",
  "/assets/ports/brick.png",
  "/assets/ports/generic.png",
  "/assets/ports/grain.png",
  "/assets/ports/lumber.png",
  "/assets/ports/ore.png",
  "/assets/ports/wool.png",
  "/assets/sfx/dev_card.wav",
  "/assets/sfx/dice_roll.wav",
  "/assets/sfx/end_turn.wav",
  "/assets/sfx/paired_turn.wav",
  "/assets/sfx/robber_pirate.wav",
  "/assets/sfx/structure.wav",
  "/assets/sfx/trade_proposed.wav",
  "/assets/sfx/trade_success.wav",
  "/assets/sfx/turn_bell.wav",
  "/assets/thief_pirate.png",
  "/assets/thief_robber.png",
  "/favicon.png",
  "/tokens_blue.png",
  "/tokens_green.png",
  "/tokens_orange.png",
  "/tokens_purple.png",
  "/tokens_red.png",
  "/tokens_teal.png",
  "/tokens_white.png",
  "/tokens_yellow.png"
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

async function cacheFirstRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });
  const networkPromise = fetch(request).then((res) => {
    if (res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);

  if (cached) {
    // Update in background; keep response instant.
    networkPromise.catch(() => {});
    return cached;
  }
  const net = await networkPromise;
  if (net) return net;
  // Last fallback: try URL string variant in cache.
  return (await cache.match(request.url)) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!ASSET_EXT_RE.test(url.pathname)) return;
  event.respondWith(cacheFirstRevalidate(request));
});

self.addEventListener('message', (event) => {
  if (event && event.data === 'SKIP_WAITING') self.skipWaiting();
});
