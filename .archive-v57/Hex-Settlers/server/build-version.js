'use strict';
const { nextVersion } = require('../scripts/bump-version.cjs');
function applyBuild(previous, revision, seed) {
  const stored = previous && typeof previous === 'object' ? previous : seed;
  const base = stored.major !== seed.major ? { ...stored, major: seed.major } : stored;
  if (base.lastRevision === revision) return base;
  return { ...nextVersion(base), lastRevision: revision };
}
function displayVersion(state) { return `V${state.major}.${state.minor}.${state.patch}`; }
module.exports = { applyBuild, displayVersion };
