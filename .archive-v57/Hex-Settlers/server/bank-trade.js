'use strict';

const DEFAULT_RESOURCE_KINDS = Object.freeze(['brick', 'lumber', 'wool', 'grain', 'ore']);

function emptyResourceMap(resourceKinds = DEFAULT_RESOURCE_KINDS) {
  return Object.fromEntries(resourceKinds.map((kind) => [kind, 0]));
}

function parseResourceMap(raw, label, resourceKinds = DEFAULT_RESOURCE_KINDS) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `${label} must be a resource quantity map.` };
  }

  const map = emptyResourceMap(resourceKinds);
  for (const kind of resourceKinds) {
    const value = Object.prototype.hasOwnProperty.call(raw, kind) ? Number(raw[kind]) : 0;
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return { ok: false, error: `Invalid ${kind} quantity in ${label.toLowerCase()}.` };
    }
    map[kind] = value;
  }
  return { ok: true, map };
}

function normalizeBankTradeAction(action, options = {}) {
  const resourceKinds = options.resourceKinds || DEFAULT_RESOURCE_KINDS;
  const ratioFor = typeof options.ratioFor === 'function' ? options.ratioFor : (() => 4);
  const forced = Math.floor(Number(action?.forceRatio || 0));
  const forceRatio = forced === 4 ? 4 : null;
  const hasBasket = !!(
    action?.give && typeof action.give === 'object' && !Array.isArray(action.give) &&
    action?.take && typeof action.take === 'object' && !Array.isArray(action.take)
  );

  let give;
  let take;
  let legacy = false;

  if (hasBasket) {
    const parsedGive = parseResourceMap(action.give, 'Give', resourceKinds);
    if (!parsedGive.ok) return parsedGive;
    const parsedTake = parseResourceMap(action.take, 'Take', resourceKinds);
    if (!parsedTake.ok) return parsedTake;
    give = parsedGive.map;
    take = parsedTake.map;
  } else {
    legacy = true;
    const giveKind = action?.giveKind;
    const takeKind = action?.takeKind;
    const takeQty = Math.max(1, Math.floor(Number(action?.takeQty || 1)));

    if (!resourceKinds.includes(giveKind) || !resourceKinds.includes(takeKind)) {
      return { ok: false, error: 'Invalid resource type.' };
    }
    if (giveKind === takeKind) return { ok: false, error: 'Choose two different resources.' };

    const ratio = forceRatio || ratioFor(giveKind);
    give = emptyResourceMap(resourceKinds);
    take = emptyResourceMap(resourceKinds);
    give[giveKind] = ratio * takeQty;
    take[takeKind] = takeQty;
  }

  const ratios = {};
  let tradeCount = 0;
  let takeTotal = 0;

  for (const kind of resourceKinds) {
    const giveQty = give[kind] || 0;
    const takeQty = take[kind] || 0;
    if (giveQty > 0 && takeQty > 0) {
      return { ok: false, error: `You cannot give and receive ${kind} in the same bank trade.` };
    }

    if (giveQty > 0) {
      const ratio = forceRatio || ratioFor(kind);
      if (!Number.isInteger(ratio) || ratio < 2 || ratio > 4) {
        return { ok: false, error: `Invalid bank trade ratio for ${kind}.` };
      }
      if (giveQty % ratio !== 0) {
        return { ok: false, error: `${giveQty} ${kind} does not make a complete ${ratio}:1 trade.` };
      }
      ratios[kind] = ratio;
      tradeCount += giveQty / ratio;
    }
    takeTotal += takeQty;
  }

  if (tradeCount < 1 || takeTotal < 1) {
    return { ok: false, error: 'Choose at least one resource to give and receive.' };
  }
  if (tradeCount !== takeTotal) {
    return {
      ok: false,
      error: `Bank trade is unbalanced: ${tradeCount} trade${tradeCount === 1 ? '' : 's'} offered for ${takeTotal} resource${takeTotal === 1 ? '' : 's'}.`,
    };
  }

  return {
    ok: true,
    plan: { give, take, ratios, tradeCount, takeTotal, forceRatio, legacy },
  };
}

function validateBankTradeAvailability(plan, playerResources, bank, resourceKinds = DEFAULT_RESOURCE_KINDS) {
  for (const kind of resourceKinds) {
    const needed = Number(plan?.give?.[kind] || 0);
    const owned = Number(playerResources?.[kind] || 0);
    if (owned < needed) return { ok: false, error: `Not enough ${kind} to trade.` };
  }

  for (const kind of resourceKinds) {
    const needed = Number(plan?.take?.[kind] || 0);
    const available = Number(bank?.[kind] || 0);
    if (available < needed) return { ok: false, error: `Bank is out of ${kind}.` };
  }

  return { ok: true };
}

module.exports = {
  DEFAULT_RESOURCE_KINDS,
  emptyResourceMap,
  normalizeBankTradeAction,
  parseResourceMap,
  validateBankTradeAvailability,
};
