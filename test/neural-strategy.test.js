'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { strategicNeuralBonus, riskyOpponentTrade, tradeIsWorthAccepting } = require('../server/neural-strategy');
const { priorityMultipliers } = require('../server/neural-priorities');
const defaultIncome = { brick: 7, lumber: 7, wool: 7, grain: 7, ore: 7 };
const state = (vp = 8) => ({
  player: { id: 'ai', vp: 4, hasCityUpgrade: true, resources: { brick: 2, lumber: 2, wool: 1, grain: 1, ore: 2 } },
  proposer: { id: 'leader', vp, resources: { grain: 1, ore: 3, brick: 1, lumber: 1, wool: 1 } },
  victoryTarget: 10,
});

test('high-value settlement sites survive the neural state-feature abstraction', () => {
  const poor = strategicNeuralBonus({ kind: 'place_settlement', siteScore: 6 });
  const strong = strategicNeuralBonus({ kind: 'place_settlement', siteScore: 24 });
  assert.ok(strong > poor + 200);
  assert.ok(strategicNeuralBonus({ kind: 'upgrade_city', siteScore: 20 }) > strategicNeuralBonus({ kind: 'upgrade_city', siteScore: 2 }));
});

test('fog exploration is rewarded with extra urgency when expansion is blocked', () => {
  const base = { kind: 'place_ship', routeLengthBefore: 2, routeLengthAfter: 3 };
  const noFog = strategicNeuralBonus({ ...base, availableSpots: 0 });
  const fog = strategicNeuralBonus({ ...base, fogRevealed: 1, availableSpots: 3 });
  const urgent = strategicNeuralBonus({ ...base, fogRevealed: 1, availableSpots: 0 });
  assert.ok(fog > noFog + 100);
  assert.ok(urgent > fog + 70);
  assert.ok(strategicNeuralBonus({ kind: 'place_road', newlyAvailableSpots: 2, availableSpots: 0 }) >
    strategicNeuralBonus({ kind: 'place_road', availableSpots: 0 }));
});

test('road title pursuit and army development investment are rewarded', () => {
  assert.ok(strategicNeuralBonus({ kind: 'place_road', routeLengthBefore: 3, routeLengthAfter: 4, longestRoadLength: 5 }) >
    strategicNeuralBonus({ kind: 'place_road', routeLengthBefore: 1, routeLengthAfter: 2, longestRoadLength: 8 }));
  assert.ok(strategicNeuralBonus({ kind: 'buy_dev_card', vpGap: 1, army: 2, largestArmySize: 3, devDeckSize: 10 }) >
    strategicNeuralBonus({ kind: 'buy_dev_card', vpGap: 6, army: 0, largestArmySize: 4, devDeckSize: 10 }));
});

test('candidate priorities scale independently and retain the standard tactical score at 100%', () => {
  const move = { kind: 'place_ship', fogRevealed: 1, availableSpots: 3, routeLengthBefore: 1, routeLengthAfter: 2 };
  const base = strategicNeuralBonus(move);
  assert.equal(strategicNeuralBonus(move, priorityMultipliers()), base);
  assert.equal(strategicNeuralBonus(move, priorityMultipliers({ exploration: 0, routes: 200 })), base - 135 + 28);
  const settlement = { kind: 'place_settlement', siteScore: 12 };
  assert.equal(strategicNeuralBonus(settlement, priorityMultipliers({ settlements: 0 })), 0);
  assert.equal(strategicNeuralBonus(settlement, priorityMultipliers({ exploration: 0 })), strategicNeuralBonus(settlement));
});

test('near-winning leader cannot be handed winning grain or ore', () => {
  const s = state(9);
  const trade = { request: { grain: 1 }, offer: { brick: 2 } };
  assert.equal(riskyOpponentTrade({ ...s, trade, income: defaultIncome, proposerCanCity: true }), true);
  assert.equal(tradeIsWorthAccepting({ ...s, trade, income: defaultIncome, enabling: true, proposerCanCity: true, diff: 'neural_net' }), false);
});

test('two points from victory: low-income resources are protected', () => {
  const s = state(8);
  const trade = { request: { lumber: 1 }, offer: { brick: 2 } };
  assert.equal(riskyOpponentTrade({ ...s, trade, income: { ...defaultIncome, lumber: 1 } }), true);
  assert.equal(riskyOpponentTrade({ ...s, trade, income: defaultIncome }), false);
});

test('a trade that creates an immediate winning settlement is rejected', () => {
  const s = state(9);
  s.proposer.resources = { brick: 1, lumber: 1, wool: 0, grain: 1, ore: 0 };
  const trade = { request: { wool: 1 }, offer: { brick: 2 } };
  assert.equal(riskyOpponentTrade({ ...s, trade, income: defaultIncome, proposerCanSettle: true }), true);
});

test('non-enabling trades require a substantially larger positive exchange', () => {
  const s = state(4);
  const weak = { request: { brick: 1 }, offer: { lumber: 1 } };
  const good = { request: { brick: 1 }, offer: { lumber: 2, wool: 1 } };
  assert.equal(tradeIsWorthAccepting({ ...s, trade: weak, income: defaultIncome, enabling: false, diff: 'neural_net' }), false);
  assert.equal(tradeIsWorthAccepting({ ...s, trade: good, income: defaultIncome, enabling: false, diff: 'neural_net' }), true);
});

test('local headless training has explicit isolated-only lobby exemptions', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /AI_TRAINING_MODE && process\.env\.NODE_ENV === 'test' && HOST === '127\.0\.0\.1'/);
  assert.match(server, /Another human player must join before the host can spectate/);
  assert.match(server, /strategicNeuralBonus\(/);
  assert.match(server, /tradeIsWorthAccepting\(/);
});
