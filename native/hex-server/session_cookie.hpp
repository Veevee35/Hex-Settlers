#pragma once
#include <openssl/crypto.h>
#include <openssl/sha.h>
#include <chrono>
#include <string_view>

inline std::int64_t session_now() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()).count();
}

inline std::string session_cookie(std::string_view header) {
  constexpr std::string_view key = "hexsettlers_session=";
  std::string token;
  while (!header.empty()) {
    const auto end = header.find(';');
    auto part = header.substr(0, end);
    while (!part.empty() && part.front() == ' ') part.remove_prefix(1);
    if (part.substr(0, key.size()) == key) {
      if (!token.empty()) return {};
      part.remove_prefix(key.size());
      if (part.empty() || part.size() > 128 ||
          part.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-") != std::string_view::npos)
        return {};
      token = part;
    }
    if (end == std::string_view::npos) break;
    header.remove_prefix(end + 1);
  }
  return token;
}

inline Json cookie_user(const Json& accounts, const std::string& token) {
  if (token.empty()) return nullptr;
  unsigned char digest[SHA256_DIGEST_LENGTH];
  SHA256(reinterpret_cast<const unsigned char*>(token.data()), token.size(), digest);
  constexpr char hex[] = "0123456789abcdef";
  std::string hash;
  for (const auto byte : digest) {
    hash += hex[byte >> 4];
    hash += hex[byte & 15];
  }
  const auto now = session_now();
  for (const auto& account : accounts.at("users")) {
    if (!account.is_object()) continue;
    for (const auto& session : account.value("tokens", Json::array())) {
      if (!session.is_object()) continue;
      const auto stored = session.value("tokenHash", std::string{});
      if (stored.size() != hash.size() || CRYPTO_memcmp(stored.data(), hash.data(), hash.size()) != 0 ||
          session.value("expiresAt", std::int64_t{0}) <= now) continue;
      return {{"id", account.at("id")}, {"username", account.at("username")},
              {"displayName", account.value("displayName", std::string{})}};
    }
  }
  return nullptr;
}
