#pragma once
#include <cstddef>
#include <stdexcept>

namespace hex_server {
enum class SetupPhase { first_route, second_route, first_settlement, second_settlement, await_roll };

struct SetupTurn {
  SetupPhase phase;
  std::size_t index;
  int round;
  int direction;
};

// Apply only after an accepted setup route and any pending gold choice.
inline SetupTurn advance_setup(SetupTurn turn, std::size_t seats) {
  if (seats == 0 || turn.index >= seats)
    throw std::invalid_argument("Invalid setup seat index");
  switch (turn.phase) {
    case SetupPhase::first_route:
      if (turn.index == seats - 1) return {SetupPhase::second_settlement, turn.index, 2, -1};
      return {SetupPhase::first_settlement, turn.index + 1, 1, 1};
    case SetupPhase::second_route:
      if (turn.index == 0) return {SetupPhase::await_roll, 0, 2, -1};
      return {SetupPhase::second_settlement, turn.index - 1, 2, -1};
    default:
      throw std::invalid_argument("Setup advance requires a route phase");
  }
}
}
