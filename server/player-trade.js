'use strict';

const DEFAULT_RESOURCE_KINDS = Object.freeze(['brick', 'lumber', 'wool', 'grain', 'ore']);

function overlappingPlayerTradeResource(offer, request, resourceKinds = DEFAULT_RESOURCE_KINDS) {
  for (const kind of resourceKinds) {
    const offered = Math.max(0, Number(offer?.[kind] || 0));
    const requested = Math.max(0, Number(request?.[kind] || 0));
    if (offered > 0 && requested > 0) return kind;
  }
  return null;
}

function validatePlayerTradeSides(offer, request, resourceKinds = DEFAULT_RESOURCE_KINDS) {
  const overlap = overlappingPlayerTradeResource(offer, request, resourceKinds);
  if (overlap) {
    return {
      ok: false,
      error: `You cannot give and receive ${overlap} in the same player trade.`,
    };
  }
  return { ok: true };
}

module.exports = {
  DEFAULT_RESOURCE_KINDS,
  overlappingPlayerTradeResource,
  validatePlayerTradeSides,
};
