#pragma once
#include <algorithm>
#include <cstdint>
#include <limits>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <string>
#include <vector>

namespace hex_server {
using Json = nlohmann::json;

// Caller supplies whether the existing scenario uses paired turns. This
// updates the turn state only. Timers, statistics and logs are external.
inline void end_turn(Json& game, const std::string& actor, bool paired_enabled) {
  if (game.at("phase") != "main-actions" || game.at("currentPlayerId") != actor ||
      game.value("paused", false))
    throw std::invalid_argument("Cannot end this turn");

  const auto order = game.at("turnOrder").get<std::vector<std::string>>();
  const auto acting = std::find(order.begin(), order.end(), actor);
  if (acting == order.end() || (paired_enabled && order.size() < 5))
    throw std::invalid_argument("Invalid turn order");
  const auto& players = game.at("players");
  const auto find_player = [&](const std::string& id) -> const Json& {
    const auto player = std::find_if(players.begin(), players.end(), [&](const Json& p) {
      return p.is_object() && p.value("id", std::string{}) == id;
    });
    if (player == players.end()) throw std::invalid_argument("Missing player");
    return *player;
  };
  if (find_player(actor).value("departed", false))
    throw std::invalid_argument("Departed player cannot act");

  auto index = static_cast<std::size_t>(acting - order.begin());
  const auto& special = game.value("special", Json(nullptr));
  if (special.is_object() &&
      (special.value("kind", std::string{}) == "production_gold" ||
       (special.value("kind", std::string{}) == "discovery_gold" && special.value("forPlayerId", std::string{}) == actor)))
    throw std::invalid_argument("Resolve pending gold choice");
  const auto& paired = game.value("paired", Json(nullptr));
  const bool second = paired_enabled && paired.is_object() && paired.value("stage", std::string{}) == "p2";
  const bool handoff = paired_enabled && !second;
  std::size_t offset = 3;
  if (second) {
    const auto first = paired.at("p1Id").get<std::string>();
    const auto seat = std::find(order.begin(), order.end(), first);
    if (seat == order.end()) throw std::invalid_argument("Invalid paired turn owner");
    index = static_cast<std::size_t>(seat - order.begin());
    offset = paired.value("offset", 3);
    if (offset >= order.size()) throw std::invalid_argument("Invalid paired turn offset");
  }

  const auto next_index = handoff ? (index + offset) % order.size() : (index + 1) % order.size();
  const auto& next = order[next_index];
  const auto& player = find_player(next);
  const auto name = player.value("name", next);
  auto turn_number = game.at("turnNumber").get<std::int64_t>();
  if (!handoff) {
    if (turn_number == std::numeric_limits<std::int64_t>::max())
      throw std::invalid_argument("Turn counter overflow");
    ++turn_number;
  }

  Json next_pair;
  if (paired_enabled) {
    const auto first_index = handoff ? index : next_index;
    next_pair = {{"enabled", true}, {"stage", handoff ? "p2" : "p1"},
                 {"p1Id", order[first_index]}, {"p2Id", order[(first_index + offset) % order.size()]},
                 {"p1Idx", first_index}, {"offset", offset}};
  }
  game["pendingTrade"] = nullptr;
  if (special.is_object() && special.value("forPlayerId", std::string{}) == actor) game["special"] = nullptr;
  game["robberContext"] = nullptr;
  game["thiefChoice"] = nullptr;
  game["pirateSteal"] = nullptr;
  game["currentPlayerId"] = next;
  game["turnNumber"] = turn_number;
  if (paired_enabled) game["paired"] = std::move(next_pair);
  if (!handoff) game["phase"] = "main-await-roll";
  game["message"] = handoff ? "Paired turn: " + name + " may act (bank trade only), or end turn."
                            : name + ": Roll the dice.";
}
}
