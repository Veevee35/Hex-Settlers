'use strict';

function serializeRoom(room) {
  if (!room || typeof room !== 'object') return null;
  return {
    code: String(room.code || ''), hostId: String(room.hostId || ''), createdAt: Number(room.createdAt || Date.now()),
    lastActiveAt: Number(room.lastActiveAt || room.createdAt || Date.now()),
    players: Array.isArray(room.players) ? room.players : [], spectators: Array.isArray(room.spectators) ? room.spectators : [],
    game: room.game || null, rules: room.rules || {}, chat: Array.isArray(room.chat) ? room.chat : [],
    chatSeq: Math.max(1, Math.floor(Number(room.chatSeq || 1))), aiSeq: Math.max(1, Math.floor(Number(room.aiSeq || 1))),
    aiDifficulty: String(room.aiDifficulty || 'test'), expertAiTuning: room.expertAiTuning || null,
    sharedTexturePacks: room.sharedTexturePacks || {}, pendingLeaveRequests: room.pendingLeaveRequests || {},
  };
}

function restoreRoom(record, defaultRules) {
  if (!record || typeof record !== 'object') return null;
  const code = String(record.code || '').trim().toUpperCase();
  const hostId = String(record.hostId || '').trim();
  const players = Array.isArray(record.players) ? record.players : [];
  const spectators = Array.isArray(record.spectators) ? record.spectators : [];
  if (!/^[A-Z2-9]{3,8}$/.test(code) || !hostId || !players.some((player) => player && String(player.id) === hostId)) return null;
  const game = record.game && typeof record.game === 'object' ? record.game : null;
  if (game) game.roomCode = code;
  return {
    code, hostId, createdAt: Number(record.createdAt || Date.now()),
    lastActiveAt: Number(record.lastActiveAt || record.createdAt || Date.now()),
    players, spectators, sockets: new Map(), game, preview: null,
    rules: { ...(defaultRules || {}), ...(record.rules || {}) }, chat: Array.isArray(record.chat) ? record.chat : [],
    chatSeq: Math.max(1, Math.floor(Number(record.chatSeq || 1))), aiSeq: Math.max(1, Math.floor(Number(record.aiSeq || 1))),
    aiDifficulty: String(record.aiDifficulty || 'test'),
    expertAiTuning: record.expertAiTuning && typeof record.expertAiTuning === 'object' ? record.expertAiTuning : null,
    sharedTexturePacks: record.sharedTexturePacks && typeof record.sharedTexturePacks === 'object' ? record.sharedTexturePacks : Object.create(null),
    pendingLeaveRequests: record.pendingLeaveRequests && typeof record.pendingLeaveRequests === 'object' ? record.pendingLeaveRequests : Object.create(null),
  };
}

module.exports = { restoreRoom, serializeRoom };
