'use strict';
// Lightweight, privacy-conscious beta operations. No IP addresses, auth tokens,
// chat, or user-entered game content is collected in the analytics archive.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { CoalescingJsonFileWriter } = require('./persistence');

const RETENTION_MS = 90 * 86400000;
const MAX_FEEDBACK = 300;
const MAX_EVENTS = 32;
const EVENT_FIELDS = Object.freeze(['visits', 'accounts', 'tutorialStarts', 'tutorialFinishes', 'gamesStarted', 'gamesFinished', 'disconnects', 'reconnects', 'abandonedGames', 'clientErrors', 'feedback', 'signups']);
const cleanReferral = value => {
  const v = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v) ? v : 'direct';
};
const cleanText = (value, length) => String(value || '').trim().slice(0, length).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
const validVisitor = value => /^[a-f0-9-]{20,50}$/i.test(String(value || ''));
const hashed = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
const dateKey = at => new Date(at).toISOString().slice(0, 10);
const normalizeEvent = v => EVENT_FIELDS.includes(v) ? v : null;
const EMPTY_METRICS = () => Object.fromEntries(EVENT_FIELDS.map(k => [k, 0]));

class BetaProgram {
  constructor(filePath, { now = Date.now, writer = null } = {}) {
    this.now = now;
    this.filePath = filePath;
    this.writer = writer || new CoalescingJsonFileWriter(filePath, { space: 0 });
    this.state = { version: 1, startedAt: now(), visitors: {}, accounts: {}, daily: {}, feedback: [], sessions: [] };
    this.dirty = false;
    this.load();
  }
  load() {
    try {
      if (this.filePath && fs.existsSync(this.filePath)) {
        const old = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (old?.version === 1) this.state = { ...this.state, ...old };
      }
    } catch (err) { console.warn('[beta] Failed to read beta state:', err.message); }
    this.prune();
  }
  prune() {
    const at = this.now(), min = at - RETENTION_MS;
    for (const [id, visit] of Object.entries(this.state.visitors || {})) if ((visit.lastAt || visit.at || 0) < min) delete this.state.visitors[id];
    for (const [id, account] of Object.entries(this.state.accounts || {})) if ((account.lastAt || account.at || 0) < min) delete this.state.accounts[id];
    for (const day of Object.keys(this.state.daily || {})) if (day < dateKey(min)) delete this.state.daily[day];
    for (const [id, at] of Object.entries(this.state.finishedRooms || {})) if (at < min) delete this.state.finishedRooms[id];
    this.state.feedback = (this.state.feedback || []).slice(-MAX_FEEDBACK);
    this.state.sessions = (this.state.sessions || []).filter(s => Number(s.endAt) >= at - 86400000).slice(-MAX_EVENTS);
  }
  count(field, at = this.now()) {
    if (!normalizeEvent(field)) return;
    const day = dateKey(at);
    const row = this.state.daily[day] || (this.state.daily[day] = EMPTY_METRICS());
    row[field] = (Number(row[field]) || 0) + 1;
    this.dirty = true;
  }
  visit(visitor, referral) {
    if (!validVisitor(visitor)) return { ok: false };
    const at = this.now(), id = hashed(`v:${visitor}`), existing = this.state.visitors[id];
    if (!existing) {
      this.state.visitors[id] = { at, lastAt: at, referral: cleanReferral(referral) };
      this.count('visits', at);
    } else if (at - (existing.lastAt || existing.at) >= 86400000) {
      // Once per browser per day; a refreshed page is not a new visitor.
      existing.lastAt = at;
      this.count('visits', at);
    }
    return { ok: true };
  }
  account(userId, visitor, referral, createdAt = 0) {
    if (!userId) return false;
    const at = this.now(), id = hashed(`a:${userId}`), record = this.state.accounts[id];
    const fromVisit = validVisitor(visitor) ? this.state.visitors[hashed(`v:${visitor}`)] : null;
    const source = fromVisit?.referral || cleanReferral(referral);
    if (!record) {
      this.state.accounts[id] = { at, lastAt: at, referral: source, stages: { account: at }, gamesStarted: 0, gamesFinished: 0 };
      this.count('accounts', at);
    } else {
      record.lastAt = at;
      if (record.referral === 'direct' && source !== 'direct') record.referral = source;
      this.dirty = true;
    }
    const active = this.state.accounts[id];
    const registered = Number(createdAt);
    if (registered >= this.state.startedAt && registered <= at && !active.stages?.registered) {
      active.stages ||= {}; active.stages.registered = registered; this.count('signups', at);
    }
    return true;
  }
  stage(userId, stage) {
    if (!userId || !['tutorialStarts','tutorialFinishes','gamesStarted','gamesFinished'].includes(stage)) return;
    this.account(userId);
    const rec = this.state.accounts[hashed(`a:${userId}`)];
    const at = this.now();
    rec.stages = rec.stages || {};
    if (!rec.stages[stage]) { rec.stages[stage] = at; if (stage.startsWith('tutorial')) this.count(stage, at); }
    if (stage === 'gamesStarted' || stage === 'gamesFinished') rec[stage] = (rec[stage] || 0) + 1;
    rec.lastAt = at;
    this.dirty = true;
  }
  // The room is counted once even when multiple people participate.
  gameFinished(roomId, userIds) {
    if (!this.state.finishedRooms) this.state.finishedRooms = {};
    const key = hashed(`r:${roomId}`);
    if (this.state.finishedRooms[key]) return;
    this.state.finishedRooms[key] = this.now();
    this.count('gamesFinished');
    for (const id of userIds) this.stage(id, 'gamesFinished');
  }
  disconnect() { this.count('disconnects'); }
  reconnect() { this.count('reconnects'); }
  abandoned() { this.count('abandonedGames'); }
  clientError() { this.count('clientErrors'); }
  feedback({ userId = null, category, description, steps = '', roomCode = '', build = '', device = '' }) {
    const type = ['bug', 'idea', 'ui', 'balance', 'other'].includes(category) ? category : 'other';
    const body = cleanText(description, 1500);
    if (body.length < 12) throw new Error('Please describe the issue in at least 12 characters.');
    const entry = { id: crypto.randomUUID(), createdAt: this.now(), type, description: body,
      steps: cleanText(steps, 1000), roomCode: /^[A-Z0-9]{4,8}$/.test(String(roomCode || '')) ? roomCode : '',
      build: cleanText(build, 40), device: ['desktop', 'mobile', 'tablet', 'other'].includes(device) ? device : 'other',
      reporter: userId ? hashed(`a:${userId}`) : 'anonymous', status: 'new',
      notification: { status: 'pending', attempts: 0, nextAttemptAt: this.now() } };
    this.state.feedback.push(entry);
    this.state.feedback = this.state.feedback.slice(-MAX_FEEDBACK);
    this.count('feedback');
    return entry.id;
  }
  markFeedbackEmailSent(id, at = this.now()) {
    const entry = this.state.feedback.find(f => f.id === id && f.notification);
    if (!entry) throw new Error('Feedback notification not found.');
    entry.notification = { status: 'sent', attempts: (entry.notification.attempts || 0) + 1, sentAt: at };
    this.dirty = true;
    return entry;
  }
  markFeedbackEmailFailure(id, attempts, nextAttemptAt, reason = '', at = this.now()) {
    const entry = this.state.feedback.find(f => f.id === id && f.notification);
    if (!entry) throw new Error('Feedback notification not found.');
    const details = { attempts, lastError: cleanText(reason, 360), lastErrorAt: at };
    entry.notification = nextAttemptAt ? { ...details, status: 'retrying', nextAttemptAt } : { ...details, status: 'failed' };
    this.dirty = true;
    return entry;
  }
  retryFeedbackEmail(id) {
    const entry = this.state.feedback.find(f => f.id === id && f.notification);
    if (!entry) throw new Error('Feedback notification not found.');
    if (entry.notification.status === 'sent') throw new Error('This report has already been emailed.');
    entry.notification = { status: 'pending', attempts: 0, nextAttemptAt: this.now() };
    this.dirty = true;
    return entry;
  }
  setFeedbackStatus(id, status) {
    if (!['new', 'triaged', 'fixed', 'closed'].includes(status)) throw new Error('Invalid feedback status.');
    const item = this.state.feedback.find(f => f.id === id);
    if (!item) throw new Error('Feedback not found.');
    item.status = status; this.dirty = true;
    return item;
  }
  setSession(input) {
    const title = cleanText(input.title, 90), notes = cleanText(input.notes, 400);
    const startAt = Number(input.startAt), endAt = Number(input.endAt);
    if (title.length < 3 || !Number.isSafeInteger(startAt) || !Number.isSafeInteger(endAt) ||
      startAt < this.now() - 3600000 || endAt <= startAt || endAt - startAt > 86400000 ||
      startAt > this.now() + 120 * 86400000) throw new Error('Enter a title and valid future start/end time (maximum 24 hours).');
    const id = String(input.id || '');
    const existing = this.state.sessions.findIndex(s => s.id === id);
    const entry = { id: existing >= 0 ? id : crypto.randomUUID(), title, notes, startAt, endAt };
    if (existing >= 0) this.state.sessions[existing] = entry;
    else this.state.sessions.push(entry);
    this.state.sessions.sort((a, b) => a.startAt - b.startAt);
    this.state.sessions = this.state.sessions.slice(0, MAX_EVENTS);
    this.dirty = true; return entry;
  }
  removeSession(id) {
    const size = this.state.sessions.length;
    this.state.sessions = this.state.sessions.filter(s => s.id !== id);
    this.dirty ||= size !== this.state.sessions.length;
    return size !== this.state.sessions.length;
  }
  setDiscordInvite(value) {
    const text = String(value || '').trim();
    if (text) {
      let url;
      try { url = new URL(text); } catch (_) { throw new Error('Enter a valid Discord invite URL or clear the field.'); }
      if (url.protocol !== 'https:' || !['discord.gg', 'discord.com'].includes(url.hostname) ||
        !/^\/(?:invite\/)?[a-zA-Z0-9_-]{2,80}\/?$/.test(url.pathname) || url.search || url.hash) {
        throw new Error('Use an https://discord.gg/code or https://discord.com/invite/code URL.');
      }
      this.state.discordInvite = url.href;
    } else this.state.discordInvite = '';
    this.dirty = true;
    return this.state.discordInvite;
  }
  upcoming() { return this.state.sessions.filter(s => s.endAt >= this.now()).sort((a, b) => a.startAt - b.startAt); }
  report(range = 'week') {
    const spans = { day: 1, week: 7, month: 30, quarter: 90 };
    const days = spans[range] || 7;
    // Aggregates are UTC calendar-day buckets, not rolling 24h samples.
    // Align the account/visitor/funnel windows to those same calendar days.
    const currentUtcDay = Date.parse(dateKey(this.now()) + 'T00:00:00.000Z');
    const since = currentUtcDay - (days - 1) * 86400000;
    const daily = Object.entries(this.state.daily).filter(([date]) => date >= dateKey(since))
      .sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...EMPTY_METRICS(), ...v }));
    const totals = EMPTY_METRICS();
    for (const row of daily) for (const k of EVENT_FIELDS) totals[k] += Number(row[k] || 0);
    const visitors = Object.values(this.state.visitors).filter(v => v.lastAt >= since);
    const accounts = Object.values(this.state.accounts).filter(a => a.lastAt >= since);
    const referrals = {};
    for (const v of visitors) { const r = v.referral || 'direct'; (referrals[r] ||= { visits: 0, accounts: 0 }).visits++; }
    for (const a of accounts) { const r = a.referral || 'direct'; (referrals[r] ||= { visits: 0, accounts: 0 }).accounts++; }
    return { startedAt: this.state.startedAt, days, totals, daily,
      uniqueVisitors: visitors.length, activeAccounts: accounts.length,
      funnel: Object.fromEntries(['account','registered','tutorialStarts','tutorialFinishes','gamesStarted','gamesFinished'].map(stage =>
        [stage, accounts.filter(a => !!a.stages?.[stage] && a.stages[stage] >= since).length])),
      repeatPlayers: accounts.filter(a => (a.gamesStarted || 0) >= 2).length,
      referrals: Object.entries(referrals).map(([source, counts]) => ({ source, ...counts }))
        .sort((a, b) => b.accounts - a.accounts || b.visits - a.visits).slice(0, 30),
      feedback: [...this.state.feedback].reverse(), sessions: this.upcoming(), discordInvite: this.state.discordInvite || '' };
  }
  async save() {
    if (!this.dirty) return;
    this.prune(); this.dirty = false;
    try { await this.writer.write(this.state); }
    catch (e) { this.dirty = true; throw e; }
  }
  async flush() { await this.save(); await this.writer.flush(); }
}
module.exports = { BetaProgram, cleanReferral, validVisitor, cleanText };
