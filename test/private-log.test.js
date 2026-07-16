'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { sanitizeLogEntriesForViewer } = require('../server/private-log');

const privateStealEntry = {
  id: 7,
  text: 'Alice stole 1 resource from Bob.',
  data: {
    victimId: 'bob',
    privateSteal: { thiefId: 'alice', victimId: 'bob', resourceKind: 'ore' },
  },
};

test('thief and victim see the stolen resource in their game log', () => {
  for (const viewerId of ['alice', 'bob']) {
    const [entry] = sanitizeLogEntriesForViewer([privateStealEntry], viewerId);
    assert.equal(entry.text, 'Alice stole 1 ore from Bob.');
    assert.equal(entry.data.privateSteal, undefined);
  }
});

test('other players and public history retain the private generic steal text', () => {
  for (const viewerId of ['charlie', null]) {
    const [entry] = sanitizeLogEntriesForViewer([privateStealEntry], viewerId);
    assert.equal(entry.text, 'Alice stole 1 resource from Bob.');
    assert.equal(entry.data.privateSteal, undefined);
  }
});
