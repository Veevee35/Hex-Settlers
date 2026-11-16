'use strict';

const { createHash } = require('node:crypto');
const { deterministicRandom } = require('../server/challenge-maps');

function withRandom(random, work) {
  const original = Math.random;
  Math.random = random;
  try { return work(); }
  finally { Math.random = original; }
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function runMatch(engine, task, policies) {
  const { map, seed, candidateSeat, candidate, opponent, maxTurns, replay } = task;
  const actions = [];
  const invalid = [];
  let actionCount = 0;
  let decisions = 0;
  let longestDecisionMs = 0;
  let decisionMs = 0;
  const stream = name => deterministicRandom(`hex-benchmark-v1:${seed}:${name}`);
  const models = {};
  const seats = Array.from({ length: map.players }, (_, index) => {
    const policy = policies[index === candidateSeat ? candidate : opponent];
    const id = `seat-${index + 1}`;
    models[id] = policy.model;
    return { id, name: id, color: engine.colors[index], isAI: true, aiDifficulty: policy.difficulty };
  });
  const metrics = Object.fromEntries(seats.map(({ id }) => [id, {
    fogReveals: 0, settlementPips: 0, nearWinThiefTargets: 0, nearWinTradePartners: 0,
    newSettlementSites: 0, routesOpeningSites: 0, turnsPassingAffordableSettlement: 0, nearWinRobberBlocks: 0,
    longestRoadClaims: 0, largestArmyClaims: 0, firstCityTurn: null, firstDevelopmentTurn: null,
  }]));
  const room = {
    code: 'BENCH', players: seats, sockets: new Map(), _dryRun: true,
    rules: {
      ...engine.rules, playerCount: map.players, mapMode: map.mapMode, seafarersScenario: map.scenario,
      victoryPointsToWin: map.victoryPoints, randomMapAtStart: true,
    },
    _benchmark: {
      models, withRandom, deck: stream('deck'), dice: stream('dice'), probe: stream('probe'),
      beforeAction(game, id, action) {
        const { kind } = action;
        const isRoute = ['place_road', 'place_ship', 'move_ship'].includes(kind);
        const tracksThreat = ['move_robber', 'robber_steal', 'pirate_steal', 'finalize_trade'].includes(kind);
        return {
          turn: game.turnNumber, phase: game.phase,
          fog: isRoute ? game.geom.tiles.filter(tile => tile.fog && tile.revealed).length : null,
          expansionSites: isRoute ? new Set(engine.expansionSites(game, id, false)) : null,
          passedSite: kind === 'end_turn' && engine.expansionSites(game, id, true).length > 0,
          road: game.longestRoad?.playerId, army: game.largestArmy?.playerId,
          threats: tracksThreat ? game.players.filter(p => p.id !== id && p.vp >= map.victoryPoints - 2).map(p => p.id) : [],
        };
      },
      afterAction(game, id, action, result, before) {
        actionCount++;
        const entry = { seat: seats.findIndex(seat => seat.id === id), turn: before.turn, phase: before.phase, action };
        if (!result?.ok) {
          invalid.push({ ...entry, error: result?.error || 'Action rejected' });
          return;
        }
        const data = metrics[id];
        if (replay) actions.push({ ...entry, vp: game.players.map(p => p.vp),
          ...(action.kind === 'roll_dice' ? { roll: game.lastRoll } : {}) });
        if (before.fog !== null) data.fogReveals += game.geom.tiles.filter(tile => tile.fog && tile.revealed).length - before.fog;
        if (before.expansionSites) {
          const opened = engine.expansionSites(game, id, false).filter(site => !before.expansionSites.has(site)).length;
          data.newSettlementSites += opened;
          data.routesOpeningSites += Number(opened > 0);
        }
        if (before.passedSite) data.turnsPassingAffordableSettlement++;
        if (game.longestRoad?.playerId === id && before.road !== id) data.longestRoadClaims++;
        if (game.largestArmy?.playerId === id && before.army !== id) data.largestArmyClaims++;
        if (action.kind === 'upgrade_city') data.firstCityTurn ??= before.turn;
        if (action.kind === 'buy_dev_card') data.firstDevelopmentTurn ??= before.turn;
        if (action.kind === 'place_settlement') {
          for (const tileId of game.geom.nodeAdjTiles[action.nodeId] || []) {
            const number = game.geom.tiles[tileId]?.number;
            if (number >= 2 && number <= 12 && number !== 7) data.settlementPips += 6 - Math.abs(number - 7);
          }
        }
        if (action.kind.endsWith('_steal') && before.threats.includes(action.victimId)) data.nearWinThiefTargets++;
        if (action.kind === 'finalize_trade' && before.threats.includes(action.withPlayerId)) data.nearWinTradePartners++;
        if (action.kind === 'move_robber' && game.geom.tiles[action.tileId]?.cornerNodeIds?.some(nodeId =>
          before.threats.includes(game.geom.nodes[nodeId]?.building?.owner))) data.nearWinRobberBlocks++;
      },
    },
  };
  const started = performance.now();
  const cpu = process.cpuUsage();
  withRandom(stream('board'), () => engine.startGame(room));
  const { game } = room;
  const board = { tiles: game.geom.tiles, ports: game.geom.ports, nodes: game.geom.nodes, edges: game.geom.edges };
  const boardHash = hash(board);
  const initialBoard = replay ? JSON.parse(JSON.stringify(board)) : undefined;
  let status = 'completed';
  withRandom(stream('play'), () => {
    while (game.phase !== 'game-over') {
      if (game.turnNumber > maxTurns || decisions >= maxTurns * 50) {
        status = 'turn-limit';
        break;
      }
      const start = performance.now();
      const progressed = engine.handleAI(room);
      const elapsed = performance.now() - start;
      decisions++;
      decisionMs += elapsed;
      longestDecisionMs = Math.max(longestDecisionMs, elapsed);
      if (!progressed) {
        status = 'stalled';
        break;
      }
    }
  });
  const standings = game.players.map(p => {
    const id = p.id;
    const { byTurn, ...resources } = game.stats.resources.byPlayer[id];
    return {
      seat: seats.findIndex(seat => seat.id === id), vp: p.vp,
      strategy: {
        ...metrics[id], builds: game.stats.builds.byPlayer[id], trades: game.stats.trades.byPlayer[id],
        development: game.stats.dev.byPlayer[id], resources, unspentResources: p.resources,
        longestRoadLength: p.longestRoadLen || 0, army: p.army || 0,
      },
    };
  });
  const winnerSeat = seats.findIndex(seat => seat.id === game.winnerId);
  for (const row of standings) {
    row.rank = winnerSeat < 0 ? null : row.seat === winnerSeat ? 1
      : 2 + standings.filter(other => other.seat !== winnerSeat && other.vp > row.vp).length;
  }
  const { user, system } = process.cpuUsage(cpu);
  return {
    status, phase: game.phase, turn: game.turnNumber, winnerSeat, standings, boardHash, invalid, actionCount,
    technical: { durationMs: performance.now() - started, cpuMs: (user + system) / 1000,
      rssBytes: process.memoryUsage().rss, decisions, decisionMs, longestDecisionMs },
    ...(replay ? { replay: { board: initialBoard, rules: game.rules, actions } } : {}),
  };
}

function attachBenchmarkWorker(engine) {
  let policies;
  process.once('disconnect', () => process.exit(0));
  process.on('message', message => {
    if (message.type === 'configure') {
      policies = message.policies;
      process.send({ type: 'ready', buildId: engine.buildId });
    } else if (message.type === 'match' && policies) {
      try {
        process.send({ type: 'result', result: runMatch(engine, message.task, policies) });
      } catch (error) {
        process.send({ type: 'result', result: { status: 'crashed', error: error.stack } });
      }
    }
  });
}

module.exports = { attachBenchmarkWorker };
