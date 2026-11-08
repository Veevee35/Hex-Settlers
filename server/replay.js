'use strict';

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

function replaySnapshot(game) {
  const snapshot = {};
  for (const [key, value] of Object.entries(game || {})) {
    if (key === 'replay' || key === 'log' || key === 'stats' || key === 'chat' || key === 'ai' || key === 'devDeck' || key.startsWith('_')) continue;
    snapshot[key] = value;
  }
  snapshot.devDeckCount = Array.isArray(game && game.devDeck) ? game.devDeck.length : 0;
  return clone(snapshot);
}

function diffReplayState(previous, next, path = [], operations = []) {
  if (Object.is(previous, next)) return operations;
  const previousArray = Array.isArray(previous);
  const nextArray = Array.isArray(next);
  if (previousArray || nextArray) {
    if (!previousArray || !nextArray || previous.length !== next.length) {
      operations.push({ op: 'set', path, value: clone(next) });
      return operations;
    }
    for (let index = 0; index < next.length; index++) {
      diffReplayState(previous[index], next[index], path.concat(index), operations);
    }
    return operations;
  }
  if (isObject(previous) && isObject(next)) {
    for (const key of Object.keys(previous)) {
      if (!(key in next)) operations.push({ op: 'delete', path: path.concat(key) });
    }
    for (const key of Object.keys(next)) {
      if (!(key in previous)) operations.push({ op: 'set', path: path.concat(key), value: clone(next[key]) });
      else diffReplayState(previous[key], next[key], path.concat(key), operations);
    }
    return operations;
  }
  operations.push({ op: 'set', path, value: clone(next) });
  return operations;
}

function applyReplayPatch(state, operations) {
  let root = clone(state);
  for (const operation of (operations || [])) {
    const path = Array.isArray(operation.path) ? operation.path : [];
    if (!path.length) {
      root = operation.op === 'delete' ? undefined : clone(operation.value);
      continue;
    }
    let target = root;
    for (let index = 0; index < path.length - 1; index++) target = target[path[index]];
    const key = path[path.length - 1];
    if (operation.op === 'delete') {
      if (Array.isArray(target)) target.splice(Number(key), 1);
      else delete target[key];
    } else target[key] = clone(operation.value);
  }
  return root;
}

function materializeReplayFrame(replay, stepIndex) {
  if (!replay || !replay.initial) return null;
  let state = clone(replay.initial);
  const steps = Array.isArray(replay.steps) ? replay.steps : [];
  const last = Math.min(Math.max(-1, Math.floor(Number(stepIndex))), steps.length - 1);
  for (let index = 0; index <= last; index++) state = applyReplayPatch(state, steps[index].patch);
  return state;
}

function setLastState(game, state) {
  Object.defineProperty(game, '_replayLastState', { configurable: true, enumerable: false, writable: true, value: state });
}

function ensureReplay(game) {
  if (!game.replay || game.replay.version !== 1 || !game.replay.initial) {
    const initial = replaySnapshot(game);
    game.replay = {
      version: 1,
      initial,
      initialLogCount: Array.isArray(game.log) ? game.log.length : 0,
      log: clone(Array.isArray(game.log) ? game.log : []),
      lastLogId: Array.isArray(game.log) && game.log.length ? Number(game.log[game.log.length - 1].id || 0) : 0,
      steps: [],
    };
    setLastState(game, initial);
  } else if (!game._replayLastState) {
    setLastState(game, materializeReplayFrame(game.replay, game.replay.steps.length - 1));
  }
  if (!Array.isArray(game.replay.log)) game.replay.log = clone(Array.isArray(game.log) ? game.log : []);
  if (!Number.isFinite(Number(game.replay.lastLogId))) {
    game.replay.lastLogId = game.replay.log.length ? Number(game.replay.log[game.replay.log.length - 1].id || 0) : 0;
  }
  return game.replay;
}

function recordReplayStep(game, { actorId = null, action = null, at = Date.now() } = {}) {
  if (!game) return null;
  const replay = ensureReplay(game);
  const unseenLogEntries = (Array.isArray(game.log) ? game.log : [])
    .filter((entry) => entry && Number(entry.id || 0) > Number(replay.lastLogId || 0));
  if (unseenLogEntries.length) {
    replay.log.push(...clone(unseenLogEntries));
    replay.lastLogId = Number(unseenLogEntries[unseenLogEntries.length - 1].id || replay.lastLogId || 0);
  }
  const next = replaySnapshot(game);
  const patch = diffReplayState(game._replayLastState, next);
  const step = {
    seq: replay.steps.length + 1,
    at: Number(at || Date.now()),
    actorId: actorId ? String(actorId) : null,
    action: clone(action),
    logCount: replay.log.length,
    patch,
  };
  replay.steps.push(step);
  setLastState(game, next);
  return step;
}

module.exports = { applyReplayPatch, diffReplayState, ensureReplay, materializeReplayFrame, recordReplayStep, replaySnapshot };
