'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { consumeDevelopmentCard } = require('../server/dev-cards');

test('played development card is removed from the hand', () => {
  const player = { devCards: [{ id: 1, type: 'knight' }, { id: 2, type: 'monopoly' }] };
  assert.equal(consumeDevelopmentCard(player, 1), true);
  assert.deepEqual(player.devCards, [{ id: 2, type: 'monopoly' }]);
  assert.equal(consumeDevelopmentCard(player, 99), false);
});
