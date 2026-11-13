#include "setup_turn.hpp"
#include <cstdlib>

using hex_server::SetupPhase;
using hex_server::advance_setup;

int main() {
  for (std::size_t seats = 2; seats <= 8; ++seats) {
    for (std::size_t i = 0; i < seats; ++i) {
      const auto forward = advance_setup({SetupPhase::first_route, i, 1, 1}, seats);
      const auto backward = advance_setup({SetupPhase::second_route, i, 2, -1}, seats);
      const bool last = i == seats - 1;
      if (forward.phase != (last ? SetupPhase::second_settlement : SetupPhase::first_settlement) ||
          forward.index != (last ? i : i + 1) || forward.round != (last ? 2 : 1) ||
          forward.direction != (last ? -1 : 1) ||
          backward.phase != (i == 0 ? SetupPhase::await_roll : SetupPhase::second_settlement) ||
          backward.index != (i == 0 ? 0 : i - 1) || backward.round != 2 || backward.direction != -1)
        return EXIT_FAILURE;
    }
  }
  try {
    advance_setup({SetupPhase::first_route, 4, 1, 1}, 4);
    return EXIT_FAILURE;
  } catch (const std::invalid_argument&) {
    return EXIT_SUCCESS;
  }
}
