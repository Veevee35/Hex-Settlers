'use strict';
// Privacy-conscious authenticated account usage. No IP addresses, device IDs,
// cookies, or user agents are persisted. Count one account per client/day.
const TYPES = Object.freeze(['browser', 'discord', 'mobile']);
const RETENTION_DAYS = 90;
const DAY_MS = 86400000;
function clientType(req, { activity = false } = {}) {
  // Only the dedicated Discord Activity hostname receives Discord proxy traffic.
  if (activity) return 'discord';
  const headers = req?.headers || {};
  const agent = String(headers['user-agent'] || '').slice(0, 350);
  const mobileHint = String(headers['sec-ch-ua-mobile'] || '').trim();
  if (mobileHint === '?1' || /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(agent)) return 'mobile';
  return 'browser';
}
function dayKey(at) { return new Date(at).toISOString().slice(0,10); }
function recordClientDay(user, type, at = Date.now()) {
  if (!user || !TYPES.includes(type) || !Number.isFinite(at)) return false;
  const day = dayKey(at);
  if (!user.clientDays || typeof user.clientDays !== 'object' || Array.isArray(user.clientDays)) user.clientDays = {};
  const earliest = dayKey(at - (RETENTION_DAYS - 1) * DAY_MS);
  let changed = false;
  for (const category of TYPES) {
    const items = Array.isArray(user.clientDays[category]) ? user.clientDays[category] : [];
    const kept = [...new Set(items.filter(v => typeof v === 'string' && v >= earliest && v <= day && /^\d{4}-\d\d-\d\d$/.test(v)))].sort();
    if (category === type && !kept.includes(day)) { kept.push(day); changed = true; }
    if (kept.join('|') !== items.join('|')) changed = true;
    user.clientDays[category] = kept;
  }
  return changed;
}
function clientReport(users = [], sockets = new Map(), at = Date.now(), range = 'week') {
  const days = { day:1, week:7, month:30, quarter:90 }[range] || 7;
  const dayNames = Array.from({length: days}, (_, i) => dayKey(at - (days - 1 - i)*DAY_MS));
  const daily = dayNames.map(day => ({ day, browser:0, discord:0, mobile:0, totalAccounts:0 }));
  const totals = Object.fromEntries(TYPES.map(k=>[k,new Set()]));
  const allAccounts = new Set();
  for (const user of users) {
    if (!user?.id) continue;
    for (const bucket of daily) {
      let active = false;
      for (const type of TYPES) {
        if (Array.isArray(user.clientDays?.[type]) && user.clientDays[type].includes(bucket.day)) {
          bucket[type]++;
          totals[type].add(user.id);
          active = true;
        }
      }
      if (active) { bucket.totalAccounts++; allAccounts.add(user.id); }
    }
  }
  const current = Object.fromEntries(TYPES.map(k => [k, new Set()]));
  const connections = Object.fromEntries(TYPES.map(k => [k, 0]));
  for (const [userId, set] of sockets) for (const ws of set || []) {
    if (ws.readyState !== 1) continue;
    const type = TYPES.includes(ws._clientType) ? ws._clientType : 'browser';
    current[type].add(userId); connections[type]++;
  }
  return {
    sampledAt:at, range, retentionDays:RETENTION_DAYS,
    live:Object.fromEntries(TYPES.map(t=>[t,{accounts:current[t].size, connections:connections[t]}])),
    uniqueAccounts:Object.fromEntries(TYPES.map(t=>[t,totals[t].size])),
    totalUniqueAccounts: allAccounts.size, daily,
    note:'Client categories are based on trusted Activity hostname and device hints; one account may use several categories.'
  };
}
module.exports={TYPES,clientType,recordClientDay,clientReport};
