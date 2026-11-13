#include "replay_actions.hpp"
#include <fstream>
#include <iostream>

int main(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "Usage: hex_turn_replay FIXTURE.json\n";
    return 2;
  }
  try {
    std::ifstream input(argv[1]);
    if (!input) throw std::runtime_error("Cannot open replay fixture");
    const auto fixture = hex_server::Json::parse(input);
    auto game = fixture.at("game");
    hex_server::replay_actions(game, fixture);
    std::cout << game.dump() << '\n';
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "Replay failed: " << error.what() << '\n';
    return 1;
  }
}
