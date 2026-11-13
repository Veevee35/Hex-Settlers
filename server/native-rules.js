'use strict';

const { resourceKindForTileType } = require('./resource-summary');
const { evaluate, produce, trade } = require('../native/hex-core/hex_rules_v4.node');
if (typeof produce !== 'function' || typeof trade !== 'function') {
  throw new Error('Rebuild the C++ addon with native/hex-core/Build-Node-Windows.cmd to enable production and bank trades');
}

const maxPlayers = 8;
const maxNodes = 512;
const maxEdges = 1024;
const nodeOwner = 5 + maxPlayers * 10;
const nodeCity = nodeOwner + maxNodes;
const edgeA = nodeCity + maxNodes;
const edgeB = edgeA + maxEdges;
const edgeOwner = edgeB + maxEdges;
const roadTitle = edgeOwner + maxEdges * 2;
const armyTitle = roadTitle + 2;
const routeOutput = armyTitle + 2;
const vpOutput = routeOutput + maxPlayers;
const queryCount = vpOutput + maxPlayers * 9;
const buffer = Buffer.alloc((queryCount + 1 + 48 * 5) * 4);
const state = new Int32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
const ROUTE_LENGTHS = 1;
const VICTORY_POINTS = 2;
const ARMY_TITLE = 3;
const KNIGHT_ARMY_TITLE = 4;
const queryPlayer = queryCount + 1 + 48 * 2;

function run(game, operation) {
  const { players, geom: { nodes, edges } } = game;
  const routes = operation === ROUTE_LENGTHS;
  if (players.length > maxPlayers || nodes.length > maxNodes) {
    throw new RangeError('Board exceeds the native rules ABI capacity');
  }

  const seats = new Map(players.map((player, i) => [player.id, i]));
  const seat = id => seats.get(id) ?? -1;
  state[0] = players.length;
  state[1] = nodes.length;

  state[4] = 1; // Live victory eligibility is handled by the turn state machine.
  state[roadTitle] = seat(game.longestRoad?.playerId);
  state[armyTitle] = seat(game.largestArmy?.playerId);
  for (let i = 0; i < nodes.length; i++) {
    const building = nodes[i].building;
    state[nodeOwner + i] = building ? seat(building.owner) : -1;
    if (!routes) state[nodeCity + i] = Number(building?.type === 'city');
  }
  let edgeCount = 0;
  if (routes) {
    for (const edge of edges) {
      const owner = edge.roadOwner || edge.shipOwner;
      if (!owner) continue;
      const ownerSeat = seat(owner);
      if (ownerSeat < 0) continue;
      if (edgeCount === maxEdges) throw new RangeError('Too many occupied routes for the native rules ABI');
      state[edgeA + edgeCount] = edge.a;
      state[edgeB + edgeCount] = edge.b;
      state[edgeOwner + edgeCount++] = ownerSeat;
    }
  }
  state[2] = edgeCount;
  if (operation === VICTORY_POINTS) {
    for (let i = 0; i < players.length; i++) {
      state[5 + maxPlayers * 6 + i] = players[i].vpDev || 0;
      state[5 + maxPlayers * 7 + i] = players[i].newIslandVP || 0;
      state[5 + maxPlayers * 8 + i] = players[i].ttdFarSideVP || 0;
    }
  }
  evaluate(buffer, operation);
  const output = operation === VICTORY_POINTS ? vpOutput : routeOutput;
  return players.map((_, i) => state[output + i]);
}

// Layout of hex_exact::Game in hex_exact_common.h. Only matching tiles
// need encoding, and hand deltas are applied by the server's stats helpers.
const kinds = ['brick', 'lumber', 'wool', 'grain', 'ore', 'gold'];
const maxTiles = 256;
const departed = 9 + maxPlayers * 5;
const gainsOffset = departed + maxPlayers;
const blockedOffset = gainsOffset + maxPlayers * 5;
const goldAmount = blockedOffset + maxPlayers * 6;
const goldCount = goldAmount + maxPlayers;
const goldTiles = goldCount + maxPlayers;
const tilesOffset = goldTiles + maxPlayers * maxTiles;
const tileWords = 17;
const productionBuffer = Buffer.alloc((tilesOffset + maxTiles * tileWords + 13) * 4);
const production = new Int32Array(productionBuffer.buffer, productionBuffer.byteOffset, productionBuffer.length / 4);

function rollProduction(game, roll, bankMax) {
  const { players, bank, geom: { tiles, nodes } } = game;
  if (players.length > maxPlayers || tiles.length > maxTiles) return null;
  const seats = new Map(players.map((player, index) => [player.id, index]));
  production[0] = players.length;
  production[2] = roll;
  production[3] = bankMax;
  for (let i = 0; i < 5; i++) production[4 + i] = bank[kinds[i]];
  for (let i = 0; i < players.length; i++) production[departed + i] = Number(!!players[i].departed);

  let count = 0;
  for (const tile of tiles) {
    if (tile.number !== roll) continue;
    const kind = kinds.indexOf(resourceKindForTileType(tile.type));
    if (kind < 0) continue;
    const corners = tile.cornerNodeIds || [];
    if (corners.length > 6) return null;
    const offset = tilesOffset + count++ * tileWords;
    production[offset] = tile.id;
    production[offset + 1] = roll;
    production[offset + 2] = kind;
    production[offset + 3] = Number(!!tile.robber);
    production[offset + 4] = corners.length;
    for (let i = 0; i < corners.length; i++) {
      const building = nodes[corners[i]].building;
      production[offset + 5 + i] = seats.get(building?.owner) ?? -1;
      production[offset + 11 + i] = Number(building?.type === 'city');
    }
  }
  production[1] = count;
  produce(productionBuffer);

  const gains = {}, blocked = {}, goldPending = {};
  for (let i = 0; i < 5; i++) bank[kinds[i]] = production[4 + i];
  for (let p = 0; p < players.length; p++) {
    const id = players[p].id;
    for (let i = 0; i < kinds.length; i++) {
      const gain = i < 5 ? production[gainsOffset + p * 5 + i] : 0;
      const loss = production[blockedOffset + p * 6 + i];
      if (gain) (gains[id] ??= { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 })[kinds[i]] = gain;
      if (loss) (blocked[id] ??= {})[kinds[i]] = loss;
    }
    const amount = production[goldAmount + p];
    if (amount) {
      const offset = goldTiles + p * maxTiles;
      goldPending[id] = { amount, tileIds: production.slice(offset, offset + production[goldCount + p]) };
    }
  }
  return { gains, blocked, goldPending };
}

const tradeBuffer = Buffer.alloc(21 * 4);
const tradeState = new Int32Array(tradeBuffer.buffer, tradeBuffer.byteOffset, 21);

function applyBankTrade(bank, hand, plan, bankMax) {
  tradeState[0] = bankMax;
  for (let i = 0; i < 5; i++) {
    const kind = kinds[i];
    tradeState[1 + i] = bank[kind];
    tradeState[6 + i] = hand[kind] || 0;
    tradeState[11 + i] = plan.give[kind] || 0;
    tradeState[16 + i] = plan.take[kind] || 0;
  }
  if (!trade(tradeBuffer)) return false;
  for (let i = 0; i < 5; i++) {
    bank[kinds[i]] = tradeState[1 + i];
    if (tradeState[11 + i] || tradeState[16 + i]) hand[kinds[i]] = tradeState[6 + i];
  }
  return true;
}

function largestArmy(game, knightPlayerId) {
  const { players } = game;
  if (players.length > maxPlayers) return null;
  state[0] = players.length;
  state[1] = 0;
  state[2] = 0;
  state[4] = 1;
  state[roadTitle] = -1;
  state[armyTitle] = players.findIndex(player => player.id === game.largestArmy?.playerId);
  state[armyTitle + 1] = game.largestArmy?.size || 0;
  for (let i = 0; i < players.length; i++) {
    state[5 + maxPlayers * 5 + i] = Number(!!players[i].departed);
    state[5 + maxPlayers * 9 + i] = players[i].army || 0;
  }
  if (knightPlayerId !== undefined) {
    state[queryPlayer] = players.findIndex(player => player.id === knightPlayerId);
  }
  evaluate(buffer, knightPlayerId === undefined ? ARMY_TITLE : KNIGHT_ARMY_TITLE);
  return { playerId: players[state[armyTitle]]?.id ?? null, size: state[armyTitle + 1] };
}

module.exports = {
  largestArmy,
  applyBankTrade,
  rollProduction,
  routeLengths: game => run(game, ROUTE_LENGTHS),
  victoryPoints: game => run(game, VICTORY_POINTS),
};
