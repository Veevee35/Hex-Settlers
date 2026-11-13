#pragma once
#include "main_turn.hpp"
#include "hex_exact_common.h"
#include <array>

namespace hex_server {
inline constexpr std::array<const char*, 5> resource_names{"brick", "lumber", "wool", "grain", "ore"};

inline int quantity(const Json& value) {
  if (!value.is_number_integer() || value < 0 || value > 10000)
    throw std::invalid_argument("Invalid resource quantity");
  return value.get<int>();
}

inline std::size_t resource_index(const std::string& name) {
  const auto found = std::find(resource_names.begin(), resource_names.end(), name);
  if (found == resource_names.end()) throw std::invalid_argument("Invalid resource kind");
  return found - resource_names.begin();
}

// Replay uses an explicitly supplied bank cap (the scenario's resolved rule).
inline void bank_trade(Json& game, const Json& action, const std::string& actor, int cap) {
  if (cap < 1 || cap > 40 || game.at("phase") != "main-actions" ||
      game.at("currentPlayerId") != actor || game.value("paused", false) ||
      !game.value("special", Json(nullptr)).is_null())
    throw std::invalid_argument("Bank trade unavailable");
  auto& players = game.at("players");
  const auto player = std::find_if(players.begin(), players.end(), [&](const Json& p) {
    return p.at("id") == actor;
  });
  if (player == players.end() || player->value("departed", false))
    throw std::invalid_argument("Invalid trade actor");

  std::array<int, 5> ratios{4, 4, 4, 4, 4};
  if (action.value("forceRatio", 0) != 4 && game.contains("geom")) {
    const auto& geom = game.at("geom");
    for (const auto& port : geom.value("ports", Json::array())) {
      bool owns = false;
      for (const auto& id : port.at("nodeIds")) {
        const auto& node = geom.at("nodes").at(id.get<std::size_t>());
        const auto building = node.value("building", Json(nullptr));
        if (building.is_object() && building.at("owner") == actor) owns = true;
      }
      if (!owns) continue;
      const auto kind = port.at("kind").get<std::string>();
      if (kind == "generic") {
        for (auto& ratio : ratios) ratio = std::min(ratio, 3);
      } else {
        ratios[resource_index(kind)] = 2;
      }
    }
  }
  hex_exact::Game inventory{};
  inventory.player_count = 1;
  inventory.actor = 0;
  inventory.bank_max = cap;
  if (action.contains("give") || action.contains("take")) {
    const auto& give = action.at("give");
    const auto& take = action.at("take");
    if (!give.is_object() || !take.is_object()) throw std::invalid_argument("Invalid trade basket");
    for (std::size_t i = 0; i < resource_names.size(); ++i) {
      inventory.give[i] = quantity(give.value(resource_names[i], Json(0)));
      inventory.take[i] = quantity(take.value(resource_names[i], Json(0)));
    }
  } else {
    const auto give = resource_index(action.at("giveKind").get<std::string>());
    const auto take = resource_index(action.at("takeKind").get<std::string>());
    inventory.take[take] = std::max(1, quantity(action.value("takeQty", Json(1))));
    inventory.give[give] = ratios[give] * inventory.take[take];
  }
  auto next_bank = game.value("bank", Json::object());
  auto next_hand = player->at("resources");
  int offers = 0, wanted = 0;
  for (std::size_t i = 0; i < resource_names.size(); ++i) {
    const auto kind = resource_names[i];
    const int give = inventory.give[i], take = inventory.take[i];
    if ((give && take) || give % ratios[i]) throw std::invalid_argument("Invalid port exchange");
    offers += give / ratios[i];
    wanted += take;
    inventory.bank[i] = quantity(next_bank.value(kind, Json(cap)));
    inventory.hand[0][i] = quantity(next_hand.value(kind, Json(0)));
  }
  if (!offers || offers != wanted) throw std::invalid_argument("Unbalanced bank trade");
  hex_exact::bank_trade(&inventory);
  if (!inventory.trade_ok) throw std::invalid_argument("Insufficient bank or hand inventory");
  for (std::size_t i = 0; i < resource_names.size(); ++i) {
    next_bank[resource_names[i]] = inventory.bank[i];
    if (inventory.give[i] || inventory.take[i]) next_hand[resource_names[i]] = inventory.hand[0][i];
  }
  game["bank"] = std::move(next_bank);
  (*player)["resources"] = std::move(next_hand);
}

inline void replay_actions(Json& game, const Json& fixture) {
  const auto& actions = fixture.at("actions");
  if (!actions.is_array()) throw std::invalid_argument("Expected action array");
  for (const auto& action : actions) {
    const auto actor = action.at("playerId").get<std::string>();
    if (action.at("kind") == "end_turn") end_turn(game, actor, fixture.at("pairedTurns").get<bool>());
    else if (action.at("kind") == "bank_trade") bank_trade(game, action, actor, fixture.at("bankCap").get<int>());
    else throw std::invalid_argument("Unsupported replay action");
  }
}
}
