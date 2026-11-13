import http.server
import hashlib
import json
import os
import pathlib
import socket
import time
import subprocess
import tempfile
import threading
import unittest

KEY = "state/texture-packs/" + "a" * 36 + "/nested/image one.png"


class MockState(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        mode = self.server.mode
        status, body = 200, b""
        if self.path == "/state/users.json":
            if mode == "missing":
                status = 404
            elif mode == "corrupt":
                body = b'{"users":null}'
            elif self.path in self.server.objects:
                body = self.server.objects[self.path]
            else:
                body = b'{"version":2,"users":[{"id":"u1"}]}'
        elif self.path == "/state/active_rooms.json":
            body = self.server.objects.get(self.path, b'{"rooms":[{"code":"ABCD"}]}')
        elif self.path == "/state/?list=textures":
            keys = [KEY.replace("nested", "..")] if mode == "unsafe" else [KEY]
            body = json.dumps({"keys": keys, "cursor": "next page"}).encode()
        elif self.path == "/state/?list=textures&cursor=next%20page":
            body = b'{"keys":[],"cursor":null}'
        elif self.path == "/" + KEY.replace(" ", "%20"):
            body = b"\x00\xff"
        else:
            status = 404
        self.send_response(status)
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        length = int(self.headers["Content-Length"])
        body = self.rfile.read(length)
        if self.server.mode == "write_failure":
            self.send_response(502)
        else:
            self.server.objects[self.path] = body
            self.send_response(201)
        self.end_headers()

    def log_message(self, *_):
        pass


class RestoreTest(unittest.TestCase):
    def test_snapshot_and_failure_paths(self):
        with http.server.ThreadingHTTPServer(("127.0.0.1", 0), MockState) as server:
            server.objects = {}
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    root = pathlib.Path(tmp)
                    env = dict(os.environ, CLOUDFLARE_STATE_ENDPOINT=f"http://127.0.0.1:{server.server_port}",
                               ALLOW_EMPTY_DATABASE="0")
                    for mode in ("missing", "corrupt", "unsafe", "ok"):
                        with self.subTest(mode=mode):
                            server.mode = mode
                            dest = root / mode
                            result = subprocess.run(["hex_state_restore", str(dest)], env=env,
                                                    capture_output=True, timeout=10)
                            self.assertEqual(result.returncode, 0 if mode == "ok" else 1, result.stderr)
                            self.assertEqual(dest.exists(), mode == "ok")
                            self.assertEqual(list(root.glob(".hex-restore-*")), [])
                    self.assertEqual(json.loads((dest / "users.json").read_bytes())["users"][0]["id"], "u1")
                    self.assertEqual(json.loads((dest / "active_rooms.json").read_bytes())["rooms"][0]["code"], "ABCD")
                    self.assertEqual((dest / KEY.removeprefix("state/")).read_bytes(), b"\x00\xff")
                    check = subprocess.run(["hex_state_restore", "--check", str(dest)], env=env,
                                           capture_output=True, check=True, timeout=10)
                    self.assertEqual(json.loads(check.stdout), {"accounts": 1, "rooms": 1})
                    self.assertEqual(dest.stat().st_mode & 0o777, 0o700)
                    room_file = dest / "active_rooms.json"
                    changed = b'{"rooms":[{"code":"ABCD","game":{"turnNumber":7}}]}'
                    room_file.write_bytes(changed)
                    server.mode = "write_failure"
                    command = ["hex_state_restore", "--publish", str(room_file)]
                    failed = subprocess.run(command, env=env, capture_output=True, timeout=10)
                    self.assertEqual(failed.returncode, 1)
                    self.assertEqual(server.objects, {})
                    server.mode = "ok"
                    subprocess.run(command, env=env, capture_output=True, check=True, timeout=10)
                    reopened = root / "reopened"
                    subprocess.run(["hex_state_restore", str(reopened)], env=env, capture_output=True,
                                   check=True, timeout=10)
                    self.assertEqual((reopened / "active_rooms.json").read_bytes(), changed)
                    room_file.write_bytes(b'{"rooms":null}')
                    invalid = subprocess.run(command, env=env, capture_output=True, timeout=10)
                    self.assertEqual(invalid.returncode, 1)
                    self.assertEqual(server.objects["/state/active_rooms.json"], changed)
                    game = {"phase": "main-actions", "currentPlayerId": "a", "turnNumber": 7,
                            "turnOrder": ["a", "b"], "players": [
                                {"id": "a", "resources": {"brick": 2}},
                                {"id": "b", "resources": {}}],
                            "geom": {"ports": [{"kind": "brick", "nodeIds": [0]}],
                                     "nodes": [{"building": {"owner": "a"}}]}}
                    key = "/state/active_rooms.json"
                    before = json.dumps({"rooms": [{"code": "ABCD", "game": game}]}).encode()
                    server.objects[key] = before
                    fixture = root / "actions.json"
                    actions = {"roomCode": "ABCD", "game": game, "bankCap": 19, "pairedTurns": False,
                               "actions": [{"kind": "bank_trade", "playerId": "a", "giveKind": "brick",
                                            "takeKind": "ore"}, {"kind": "end_turn", "playerId": "a"}]}
                    fixture.write_text(json.dumps(actions))
                    replay = ["hex_state_restore", "--replay-room", str(fixture)]
                    server.mode = "write_failure"
                    result = subprocess.run(replay, env=env, capture_output=True, timeout=10)
                    self.assertEqual(result.returncode, 1)
                    self.assertEqual(server.objects[key], before)
                    server.mode = "ok"
                    subprocess.run(replay, env=env, capture_output=True, check=True, timeout=10)
                    after = server.objects[key]
                    result = subprocess.run(replay, env=env, capture_output=True, timeout=10)
                    self.assertEqual(result.returncode, 1, "Stale replay must not write twice")
                    self.assertEqual(server.objects[key], after)
                    played = root / "played"
                    subprocess.run(["hex_state_restore", str(played)], env=env, capture_output=True,
                                   check=True, timeout=10)
                    saved = json.loads((played / "active_rooms.json").read_bytes())["rooms"][0]["game"]
                    self.assertEqual(saved["players"][0]["resources"], {"brick": 0, "ore": 1})
                    self.assertEqual(saved["bank"]["ore"], 18)
                    self.assertEqual(saved["currentPlayerId"], "b")
                    self.assertEqual(saved["turnNumber"], 8)
                    socket_path = root / "game.sock"
                    actions["playerId"] = "a"
                    fixture.write_text(json.dumps(actions))
                    service = subprocess.Popen(["hex_state_restore", "--serve-local", str(socket_path), str(fixture)],
                                               env=env, stderr=subprocess.PIPE)
                    try:
                        for _ in range(100):
                            if socket_path.exists():
                                break
                            time.sleep(0.02)
                        self.assertEqual(socket_path.stat().st_mode & 0o777, 0o700)
                        server.objects[key] = before
                        server.objects["/state/users.json"] = json.dumps({"users": [
                            {"id": "a", "username": "alpha", "tokens": [
                                {"tokenHash": hashlib.sha256(b"test_cookie").hexdigest(),
                                 "expiresAt": int(time.time() * 1000) + 60_000}]}]}).encode()
                        with socket.socket(socket.AF_UNIX) as peer:
                            peer.settimeout(5)
                            peer.connect(str(socket_path))
                            peer.sendall(b"GET /ws HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\n"
                                         b"Upgrade: websocket\r\nSec-WebSocket-Version: 13\r\n"
                                         b"Cookie: hexsettlers_session=test_cookie\r\n"
                                         b"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n")
                            reader = peer.makefile("rb")
                            self.assertIn(b"101", reader.readline())
                            while True:
                                line = reader.readline()
                                self.assertTrue(line, "Connection closed before the handshake ended")
                                if line == b"\r\n":
                                    break
                            def read_message():
                                header = reader.read(2)
                                size = header[1] & 127
                                if size == 126:
                                    size = int.from_bytes(reader.read(2), "big")
                                return json.loads(reader.read(size))

                            self.assertEqual(read_message()["type"], "hello")
                            auth = read_message()
                            self.assertEqual(auth["type"], "auth_ok")
                            self.assertEqual(auth["user"]["id"], "a")
                            self.assertNotIn("tokens", auth["user"])
                            payload = b'{"type":"game_action","action":{"kind":"end_turn"}}'
                            mask = b"mask"
                            frame = bytes([0x81, 0x80 | len(payload)]) + mask + bytes(
                                byte ^ mask[i % 4] for i, byte in enumerate(payload))
                            server.mode = "write_failure"
                            peer.sendall(frame)
                            self.assertEqual(read_message()["type"], "error")
                            self.assertEqual(server.objects[key], before)
                            server.mode = "ok"
                            peer.sendall(frame)
                            self.assertEqual(read_message(),
                                             {"type": "action_committed", "turnNumber": 8})
                            server.objects["/state/users.json"] = b'{"users":[]}'
                            peer.sendall(frame)
                            self.assertEqual(read_message()["type"], "auth_required")
                            reader.close()
                        live = root / "live"
                        subprocess.run(["hex_state_restore", str(live)], env=env, capture_output=True,
                                       check=True, timeout=10)
                        self.assertEqual(json.loads((live / "active_rooms.json").read_bytes())
                                         ["rooms"][0]["game"]["currentPlayerId"], "b")
                    finally:
                        service.terminate()
                        service.communicate(timeout=5)
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    unittest.main()
