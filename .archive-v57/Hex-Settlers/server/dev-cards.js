'use strict';

function consumeDevelopmentCard(player, cardId) {
  if (!player || !Array.isArray(player.devCards)) return false;
  const before = player.devCards.length;
  player.devCards = player.devCards.filter((card) => !card || card.id !== cardId);
  return player.devCards.length < before;
}

module.exports = { consumeDevelopmentCard };
