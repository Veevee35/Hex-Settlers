#include "main_turn.hpp"
#include <cstdlib>

using hex_server::end_turn;
using hex_server::Json;

int main() {
  Json game = {{"phase", "main-actions"}, {"currentPlayerId", "a"}, {"turnNumber", 10},
               {"turnOrder", {"a", "b", "c", "d", "e", "f"}}, {"pendingTrade", {{"id", 4}}}};
  for (const auto* id : {"a", "b", "c", "d", "e", "f"})
    game["players"].push_back({{"id", id}, {"name", id}});
  const auto original = game;
  try {
    end_turn(game, "b", true);
    return EXIT_FAILURE;
  } catch (const std::invalid_argument&) {
    if (game != original) return EXIT_FAILURE;
  }
  end_turn(game, "a", true);
  if (game["phase"] != "main-actions" || game["currentPlayerId"] != "d" ||
      game["paired"]["stage"] != "p2" || game["turnNumber"] != 10 || !game["pendingTrade"].is_null())
    return EXIT_FAILURE;

  // Exercise resume from the persisted paired-turn fields.
  game = Json::parse(game.dump());
  end_turn(game, "d", true);
  if (game["phase"] != "main-await-roll" || game["currentPlayerId"] != "b" ||
      game["paired"]["stage"] != "p1" || game["paired"]["p2Id"] != "e" || game["turnNumber"] != 11)
    return EXIT_FAILURE;
  game = original;
  end_turn(game, "a", false);
  return game["currentPlayerId"] == "b" && game["turnNumber"] == 11 &&
      game["phase"] == "main-await-roll" ? EXIT_SUCCESS : EXIT_FAILURE;
}
