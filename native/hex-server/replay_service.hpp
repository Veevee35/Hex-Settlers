#pragma once
#include "session_cookie.hpp"
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/beast/websocket.hpp>

namespace net = boost::asio;
namespace beast = boost::beast;
namespace http = beast::http;
namespace ws = beast::websocket;

// Local harness uses an owner-only Unix socket. Rules are supplied by a
// local fixture, and the player and room are fixed by the operator.
void serve_replay(const fs::path& socket_path, const fs::path& config_path) {
  const auto config = parse(SavedState::read(config_path), "service configuration");
  const auto actor = config.at("playerId").get<std::string>();
  const auto code = config.at("roomCode").get<std::string>();
  if (actor.empty() || code.empty()) throw std::runtime_error("Room and player are required");
  const char* endpoint = std::getenv("CLOUDFLARE_STATE_ENDPOINT");
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) throw std::runtime_error("Cannot initialize libcurl");
  const std::unique_ptr<void, void(*)(void*)> curl_scope(reinterpret_cast<void*>(1),
      [](void*) { curl_global_cleanup(); });
  StateClient client(endpoint ? endpoint : "");
  auto load = [&]() {
    const auto response = client.get("/state/active_rooms.json");
    if (response.status != 200) throw std::runtime_error("Cannot read current room state");
    return read_envelope(response.body, "active_rooms.json", "rooms");
  };
  auto find_room = [&](Json& state) -> Json& {
    for (auto& room : state.at("rooms"))
      if (room.at("code") == code && room.at("game").is_object()) return room;
    throw std::runtime_error("Saved room does not exist");
  };
  auto authenticate = [&](const std::string& token) -> Json {
    if (token.empty()) return nullptr;
    const auto response = client.get("/state/users.json");
    if (response.status != 200) return nullptr;
    const auto user = cookie_user(read_envelope(response.body, "users.json", "users"), token);
    return user.is_object() && user.at("id") == actor ? user : Json(nullptr);
  };
  auto initial = load();
  find_room(initial);

  net::io_context context;
  net::local::stream_protocol::acceptor acceptor(context, net::local::stream_protocol::endpoint(socket_path.string()));
  for (;;) {
    try {
      auto socket = acceptor.accept();
      beast::flat_buffer buffer;
      http::request_parser<http::empty_body> parser;
      parser.header_limit(8192);
      http::read(socket, buffer, parser);
      const auto& request = parser.get();
      if (request.target() != "/ws" || !ws::is_upgrade(request)) {
        const bool health = request.method() == http::verb::get && request.target() == "/health";
        http::response<http::string_body> reply{health ? http::status::ok : http::status::not_found, request.version()};
        reply.set(http::field::content_type, "application/json");
        reply.body() = health ? R"({"ok":true,"mode":"local-native-replay"})" : R"({"ok":false})";
        reply.prepare_payload();
        http::write(socket, reply);
        continue;
      }
      const auto cookie = request[http::field::cookie];
      const auto token = session_cookie(std::string_view(cookie.data(), cookie.size()));
      ws::stream<net::local::stream_protocol::socket> stream(std::move(socket));
      stream.read_message_max(8192);
      stream.accept(request);
      stream.text(true);
      const auto send = [&](const Json& message) { stream.write(net::buffer(message.dump())); };
      send({{"type", "hello"}, {"version", 2}, {"serverTime", session_now()}});
      const auto user = authenticate(token);
      if (user.is_object()) send({{"type", "auth_ok"}, {"user", user}, {"token", nullptr}, {"cookieAuth", true}});
      for (;;) {
        buffer.consume(buffer.size());
        stream.read(buffer);
        Json reply;
        try {
          const auto msg = parse(beast::buffers_to_string(buffer.data()), "action message");
          if (!stream.got_text()) throw std::invalid_argument("Expected a text message");
          if (msg.at("type") == "client_ping") {
            send({{"type", "server_pong"}, {"clientTime", msg.value("clientTime", 0LL)},
                  {"serverTime", session_now()}, {"roomCode", user.is_object() ? Json(code) : Json(nullptr)}});
            continue;
          }
          if (authenticate(token).is_null()) {
            send({{"type", "auth_required"}});
            continue;
          }
          if (msg.at("type") != "game_action") throw std::invalid_argument("Expected game_action");
          auto action = msg.at("action");
          action["playerId"] = actor;
          auto state = load();
          auto& game = find_room(state).at("game");
          auto fixture = config;
          fixture["actions"] = Json::array({action});
          hex_server::replay_actions(game, fixture);
          const auto body = state.dump();
          if (body.size() > max_state_bytes) throw std::runtime_error("Saved rooms exceed the bridge limit");
          client.put("/state/active_rooms.json", body);
          reply = {{"type", "action_committed"}, {"turnNumber", game.at("turnNumber")}};
        } catch (const std::exception&) {
          reply = {{"type", "error"}, {"error", "Action rejected or persistence unconfirmed; reload saved state before retrying"}};
        }
        stream.write(net::buffer(reply.dump()));
      }
    } catch (const boost::system::system_error& error) {
      if (error.code() != ws::error::closed)
        std::cerr << "Local connection closed: " << error.code().message() << '\n';
    } catch (const std::exception&) {
      std::cerr << "Local connection rejected\n";
    }
  }
}
