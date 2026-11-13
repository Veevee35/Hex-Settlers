#include <curl/curl.h>
#include "replay_actions.hpp"
#include <nlohmann/json.hpp>
#include <sys/stat.h>
#include <unistd.h>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <regex>
#include <set>
#include <stdexcept>
#include <string>

namespace fs = std::filesystem;
using Json = nlohmann::json;

constexpr std::size_t max_state_bytes = 128 * 1024 * 1024;

struct Response {
  long status = 0;
  std::string body;
};

std::size_t receive(char* data, std::size_t size, std::size_t count, void* context) noexcept {
  auto& body = *static_cast<std::string*>(context);
  if (size && count > (max_state_bytes - body.size()) / size) return 0;
  try {
    body.append(data, size * count);
    return size * count;
  } catch (...) {
    return 0;
  }
}

class StateClient {
 public:
  explicit StateClient(std::string endpoint) : endpoint_(std::move(endpoint)) {
    if (endpoint_.empty()) throw std::runtime_error("CLOUDFLARE_STATE_ENDPOINT is required");
    while (!endpoint_.empty() && endpoint_.back() == '/') endpoint_.pop_back();
    if (!handle_) throw std::runtime_error("Cannot initialize state client");
    curl_easy_setopt(handle_.get(), CURLOPT_PROTOCOLS_STR, "http,https");
    curl_easy_setopt(handle_.get(), CURLOPT_PROXY, "");
    curl_easy_setopt(handle_.get(), CURLOPT_CONNECTTIMEOUT, 10L);
    curl_easy_setopt(handle_.get(), CURLOPT_TIMEOUT, 60L);
    curl_easy_setopt(handle_.get(), CURLOPT_WRITEFUNCTION, receive);
  }

  std::string encode(const std::string& value) {
    std::unique_ptr<char, decltype(&curl_free)> encoded(
        curl_easy_escape(handle_.get(), value.c_str(), 0), curl_free);
    if (!encoded) throw std::runtime_error("Cannot encode state request");
    return encoded.get();
  }

  Response get(const std::string& resource) {
    return request(resource, nullptr);
  }

  void put(const std::string& resource, const std::string& body) {
    const auto response = request(resource, &body);
    if (response.status != 201)
      throw std::runtime_error("State write rejected (HTTP " + std::to_string(response.status) + ")");
  }

 private:
  Response request(const std::string& resource, const std::string* body) {
    Response response;
    const auto url = endpoint_ + resource;
    curl_easy_setopt(handle_.get(), CURLOPT_URL, url.c_str());
    curl_easy_setopt(handle_.get(), CURLOPT_WRITEDATA, &response.body);
    curl_easy_setopt(handle_.get(), CURLOPT_CUSTOMREQUEST, body ? "PUT" : nullptr);
    if (body) {
      curl_easy_setopt(handle_.get(), CURLOPT_POSTFIELDSIZE_LARGE, static_cast<curl_off_t>(body->size()));
      curl_easy_setopt(handle_.get(), CURLOPT_POSTFIELDS, body->data());
    } else {
      curl_easy_setopt(handle_.get(), CURLOPT_HTTPGET, 1L);
    }
    const auto result = curl_easy_perform(handle_.get());
    if (result != CURLE_OK) throw std::runtime_error(std::string("State bridge request failed: ") + curl_easy_strerror(result));
    curl_easy_getinfo(handle_.get(), CURLINFO_RESPONSE_CODE, &response.status);
    return response;
  }

  std::string endpoint_;
  std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> handle_{curl_easy_init(), curl_easy_cleanup};
};

Json parse(const std::string& body, const std::string& name) {
  auto data = Json::parse(body, nullptr, false);
  if (data.is_discarded()) throw std::runtime_error("Invalid JSON in " + name);
  return data;
}

Json read_envelope(const std::string& body, const std::string& name, const char* field) {
  auto data = parse(body, name);
  if (!data.is_object() || !data.contains(field) || !data.at(field).is_array())
    throw std::runtime_error("Invalid saved state shape in " + name);
  return data;
}

struct SavedState {
  Json accounts;
  Json rooms;

  static SavedState load(const fs::path& snapshot) {
    return {read_envelope(read(snapshot / "users.json"), "users.json", "users"),
            read_envelope(read(snapshot / "active_rooms.json"), "active_rooms.json", "rooms")};
  }

  static std::string read(const fs::path& path) {
    std::ifstream input(path, std::ios::binary);
    if (!input) throw std::runtime_error("Cannot read " + path.filename().string());
    std::string body;
    char chunk[8192];
    while (input.read(chunk, sizeof(chunk)) || input.gcount()) {
      if (body.size() + input.gcount() > max_state_bytes)
        throw std::runtime_error("Saved state exceeds the bridge limit");
      body.append(chunk, input.gcount());
    }
    if (input.bad()) throw std::runtime_error("Cannot finish reading saved state");
    return body;
  }
};

void write_file(const fs::path& root, const fs::path& relative, const std::string& body) {
  const auto path = root / relative;
  fs::create_directories(path.parent_path());
  std::ofstream output(path, std::ios::binary);
  output.exceptions(std::ios::failbit | std::ios::badbit);
  output.write(body.data(), body.size());
  output.close();
}

void restore(StateClient& client, const fs::path& staging, bool allow_empty) {
  for (const std::string name : {"users.json", "active_rooms.json", "game_history.json",
                                 "game_analytics.json", "beta_program.json",
                                 "rating_policy.json", "neural_ai_model.json"}) {
    const auto response = client.get("/state/" + name);
    if (response.status == 404) {
      if (name == "users.json") {
        if (!allow_empty) throw std::runtime_error("Required users.json is missing");
        write_file(staging, name, R"({"version":2,"users":[]})");
      } else if (name == "active_rooms.json") {
        write_file(staging, name, R"({"rooms":[]})");
      }
      continue;
    }
    if (response.status != 200) throw std::runtime_error(name + ": HTTP " + std::to_string(response.status));
    const auto field = name == "users.json" ? "users" : name == "active_rooms.json" ? "rooms" : "";
    if (*field) read_envelope(response.body, name, field);
    else parse(response.body, name);
    write_file(staging, name, response.body);
  }

  const std::regex texture("^state/texture-packs/[a-f0-9]{36}(/[A-Za-z0-9 ._-]+)+$");
  std::set<std::string> cursors;
  std::string cursor;
  do {
    auto response = client.get("/state/?list=textures" + (cursor.empty() ? "" : "&cursor=" + client.encode(cursor)));
    if (response.status != 200) throw std::runtime_error("Texture listing: HTTP " + std::to_string(response.status));
    auto page = parse(response.body, "texture listing");
    if (!page.is_object() || !page.contains("keys") || !page["keys"].is_array())
      throw std::runtime_error("Invalid texture listing");
    for (const auto& entry : page["keys"]) {
      const auto key = entry.get<std::string>();
      if (!std::regex_match(key, texture)) throw std::runtime_error("Unsafe texture key");
      std::string url;
      for (const auto& part : fs::path(key)) {
        if (part == "." || part == "..") throw std::runtime_error("Unsafe texture path");
        url += "/" + client.encode(part.string());
      }
      response = client.get(url);
      if (response.status != 200) throw std::runtime_error("Texture read: HTTP " + std::to_string(response.status));
      write_file(staging, key.substr(6), response.body);
    }
    cursor = !page.contains("cursor") || page["cursor"].is_null() ? "" : page["cursor"].get<std::string>();
    if (!cursor.empty() && !cursors.insert(cursor).second) throw std::runtime_error("Repeated texture listing cursor");
  } while (!cursor.empty());
}

// Explicit offline import. The caller must have exclusive ownership of the
// destination state; the existing bridge uses whole-object replacements.
void publish_state_file(const fs::path& path) {
  const auto name = path.filename().string();
  const char* field = name == "users.json" ? "users" : name == "active_rooms.json" ? "rooms" : nullptr;
  if (!field) throw std::runtime_error("Only users.json and active_rooms.json can be published");
  const auto body = SavedState::read(path);
  read_envelope(body, name, field);
  const auto* endpoint = std::getenv("CLOUDFLARE_STATE_ENDPOINT");
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) throw std::runtime_error("Cannot initialize libcurl");
  try {
    StateClient client(endpoint ? endpoint : "");
    client.put("/state/" + name, body);
  } catch (...) {
    curl_global_cleanup();
    throw;
  }
  curl_global_cleanup();
}

void replay_room(const fs::path& path) {
  const auto fixture = parse(SavedState::read(path), "action fixture");
  const auto code = fixture.at("roomCode").get<std::string>();
  const auto* endpoint = std::getenv("CLOUDFLARE_STATE_ENDPOINT");
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) throw std::runtime_error("Cannot initialize libcurl");
  try {
    StateClient client(endpoint ? endpoint : "");
    const auto response = client.get("/state/active_rooms.json");
    if (response.status != 200) throw std::runtime_error("Cannot read current room state");
    auto state = read_envelope(response.body, "active_rooms.json", "rooms");
    auto& rooms = state.at("rooms");
    const auto room = std::find_if(rooms.begin(), rooms.end(), [&](const Json& candidate) {
      return candidate.at("code") == code;
    });
    if (room == rooms.end()) throw std::runtime_error("Saved room does not exist");
    auto& game = room->at("game");
    if (game != fixture.at("game")) throw std::runtime_error("Saved game differs from the replay fixture");
    hex_server::replay_actions(game, fixture);
    const auto body = state.dump();
    if (body.size() > max_state_bytes) throw std::runtime_error("Saved rooms exceed the bridge limit");
    client.put("/state/active_rooms.json", body);
  } catch (...) {
    curl_global_cleanup();
    throw;
  }
  curl_global_cleanup();
}

#include "replay_service.hpp"

int main(int argc, char** argv) {
  umask(0077);
  if (argc == 4 && std::string(argv[1]) == "--serve-local") {
    try {
      serve_replay(argv[2], argv[3]);
      return 0;
    } catch (const std::exception& error) {
      std::cerr << "Local replay service failed: " << error.what() << '\n';
      return 1;
    }
  }
  if (argc == 3 && std::string(argv[1]) == "--replay-room") {
    try {
      replay_room(argv[2]);
      std::cout << "Replay write acknowledged\n";
      return 0;
    } catch (const std::exception& error) {
      std::cerr << "Room replay failed: " << error.what() << '\n';
      return 1;
    }
  }
  if (argc == 3 && std::string(argv[1]) == "--publish") {
    try {
      publish_state_file(argv[2]);
      std::cout << "Private state write acknowledged\n";
      return 0;
    } catch (const std::exception& error) {
      std::cerr << "State publish failed: " << error.what() << '\n';
      return 1;
    }
  }
  if (argc == 3 && std::string(argv[1]) == "--check") {
    try {
      const auto state = SavedState::load(argv[2]);
      std::cout << Json{{"accounts", state.accounts.at("users").size()},
                        {"rooms", state.rooms.at("rooms").size()}}.dump() << '\n';
      return 0;
    } catch (const std::exception& error) {
      std::cerr << "Snapshot check failed: " << error.what() << '\n';
      return 1;
    }
  }
  if (argc != 2) {
    std::cerr << "Usage: hex_state_restore [--check] SNAPSHOT_DIRECTORY or --publish STATE_FILE or --replay-room FIXTURE.json\n";
    return 2;
  }
  const auto output = fs::absolute(argv[1]).lexically_normal();
  fs::path staging;
  bool curl_initialized = false;
  try {
    if (fs::exists(output)) throw std::runtime_error("Snapshot destination already exists");
    fs::create_directories(output.parent_path());
    std::string pattern = (output.parent_path() / ".hex-restore-XXXXXX").string();
    if (!mkdtemp(pattern.data())) throw std::runtime_error("Cannot create private staging directory");
    staging = pattern;
    if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) throw std::runtime_error("Cannot initialize libcurl");
    curl_initialized = true;
    const char* endpoint = std::getenv("CLOUDFLARE_STATE_ENDPOINT");
    const char* allow_empty = std::getenv("ALLOW_EMPTY_DATABASE");
    {
      StateClient client(endpoint ? endpoint : "");
      restore(client, staging, allow_empty && std::string(allow_empty) == "1");
    }
    fs::rename(staging, output);
    curl_global_cleanup();
    std::cout << "Private state snapshot restored\n";
    return 0;
  } catch (const std::exception& error) {
    std::error_code ignored;
    if (!staging.empty()) fs::remove_all(staging, ignored);
    if (curl_initialized) curl_global_cleanup();
    std::cerr << "State restore failed: " << error.what() << '\n';
    return 1;
  }
}
