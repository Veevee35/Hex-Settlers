'use strict';

function serializeRoom(room) {
  if (!room || typeof room !== 'object') return null;
  return {
    code: String(room.code || ''), hostId: String(room.hostId || ''), createdAt: Number(room.createdAt || Date.now()),
    lastActiveAt: Number(room.lastActiveAt || room.createdAt || Date.now()),
    lastHumanActivityAt: Number(room.lastHumanActivityAt || room.lastActiveAt || room.createdAt || Date.now()),
    rematchRoomCode: String(room.rematchRoomCode || ''), finishedAt: Number(room.finishedAt || 0),
    ranked: !!room.ranked, casual: !!room.casual, challenge: room.challenge || null, tutorial: room.tutorial || null, visibility: room.visibility === 'public' ? 'public' : 'private', friendsOnly: !!room.friendsOnly, bossIds: Array.isArray(room.bossIds) ? room.bossIds : [],
    rankedPreferences: room.rankedPreferences || null,
    rankedScenarioVote: room.rankedScenarioVote || null,
    players: Array.isArray(room.players) ? room.players : [], spectators: Array.isArray(room.spectators) ? room.spectators : [],
    game: room.game || null, ...(room.preview && (room.rules?.customMap || String(room.rules?.seafarersScenario || "").startsWith("test_builder")) ? { preview: room.preview } : {}), rules: room.rules || {}, chat: Array.isArray(room.chat) ? room.chat : [],
    chatSeq: Math.max(1, Math.floor(Number(room.chatSeq || 1))), aiSeq: Math.max(1, Math.floor(Number(room.aiSeq || 1))),
    aiDifficulty: String(room.aiDifficulty || 'easy'), expertAiTuning: room.expertAiTuning || null,
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
    lastHumanActivityAt: Number(record.lastHumanActivityAt || record.lastActiveAt || record.createdAt || Date.now()),
    rematchRoomCode: String(record.rematchRoomCode || ''), finishedAt: Number(record.finishedAt || 0),
    ranked: !!record.ranked, casual: !!record.casual, tutorial: record.tutorial && record.tutorial.ownerId === hostId ? { ownerId: hostId, version: 1 } : null, challenge: record.challenge && Number.isInteger(record.challenge.playerCount) && record.challenge.playerCount >= 4 && record.challenge.playerCount <= 8 && /^\d{4}-\d{2}-\d{2}$/.test(record.challenge.kind === 'daily' ? record.challenge.dayId : record.challenge.weekId) ? (record.challenge.kind === 'daily' ? { kind:'daily', dayId: record.challenge.dayId, playerCount: record.challenge.playerCount } : { kind:'weekly', weekId: record.challenge.weekId, playerCount: record.challenge.playerCount }) : null, visibility: record.visibility === 'public' ? 'public' : 'private', friendsOnly: !!record.friendsOnly, bossIds: Array.isArray(record.bossIds) ? record.bossIds.filter(id => typeof id === 'string' && id !== hostId && players.some(p => p && p.id === id)).slice(0,8) : [],
    rankedPreferences: record.rankedPreferences || null,
    rankedScenarioVote: record.rankedScenarioVote && typeof record.rankedScenarioVote === 'object' ? record.rankedScenarioVote : null,
    players, spectators, sockets: new Map(), game, preview: record.preview && (record.rules?.customMap || String(record.rules?.seafarersScenario || "").startsWith("test_builder")) ? record.preview : null,
    rules: { ...(defaultRules || {}), ...(record.rules || {}) }, chat: Array.isArray(record.chat) ? record.chat : [],
    chatSeq: Math.max(1, Math.floor(Number(record.chatSeq || 1))), aiSeq: Math.max(1, Math.floor(Number(record.aiSeq || 1))),
    aiDifficulty: String(record.aiDifficulty || 'easy'),
    expertAiTuning: record.expertAiTuning && typeof record.expertAiTuning === 'object' ? record.expertAiTuning : null,
    sharedTexturePacks: record.sharedTexturePacks && typeof record.sharedTexturePacks === 'object' ? record.sharedTexturePacks : Object.create(null),
    pendingLeaveRequests: record.pendingLeaveRequests && typeof record.pendingLeaveRequests === 'object' ? record.pendingLeaveRequests : Object.create(null),
  };
}

module.exports = { restoreRoom, serializeRoom };
