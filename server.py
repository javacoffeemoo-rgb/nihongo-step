#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""카카오톡 일본어 회화봇 - 스킬 서버.

표준 라이브러리만 사용합니다. (pip install 필요 없음)

  python server.py

  · http://localhost:8000        로컬 테스트용 카톡 스타일 화면
  · POST /skill                  카카오 i 오픈빌더가 호출하는 스킬 엔드포인트
  · POST /api/chat               위 화면이 사용하는 테스트용 엔드포인트
  · GET  /health                 상태 확인
"""

import http.client
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from bot import content as content_data                  # noqa: E402
from bot import teacher as teacher_data                  # noqa: E402
from bot.dispatcher import handle_skill_request          # noqa: E402
from bot.session import SessionStore                     # noqa: E402
from webstore import ProgressError, ProgressStore        # noqa: E402

PUBLIC_DIR = os.path.join(BASE_DIR, "public")
PORT = int(os.environ.get("PORT", "8000"))

SESSIONS = SessionStore()
STORE = ProgressStore()

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
}


def _json_bytes(obj):
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def _content_payload():
    """웹 학습 앱이 한 번에 받아가는 콘텐츠 묶음."""
    return {
        "curriculum": content_data.CURRICULUM,
        "categories": content_data.CATEGORIES,
        "scenarios": content_data.SCENARIOS,
        "words": content_data.WORDS,
        "kana": content_data.KANA,
        "teachers": list(teacher_data.TEACHERS.values()),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "KakaoJapaneseBot/1.0"

    # ------------------------------------------------------------- 유틸
    def _send_json(self, obj, status=200):
        body = _json_bytes(obj)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        if not os.path.isfile(path):
            self._send_json({"error": "not found"}, 404)
            return
        ext = os.path.splitext(path)[1].lower()
        with open(path, "rb") as fp:
            body = fp.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME_TYPES.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    # ------------------------------------------------------------- 라우팅
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/health":
            self._send_json({"status": "ok"})
            return

        if path == "/api/content":
            self._send_json(_content_payload())
            return

        if path == "/api/progress":
            query = parse_qs(parsed.query)
            name = (query.get("user") or [""])[0]
            try:
                data = STORE.load(name)
            except ProgressError as error:
                self._send_json({"error": error.message, "code": error.code}, 400)
                return
            self._send_json(data)
            return

        if path in ("/legacy", "/legacy/"):
            self._send_file(os.path.join(PUBLIC_DIR, "legacy", "index.html"))
            return

        if path in ("/", ""):
            self._send_file(os.path.join(PUBLIC_DIR, "index.html"))
            return

        target = os.path.normpath(os.path.join(PUBLIC_DIR, path.lstrip("/\\")))
        if not target.startswith(PUBLIC_DIR):
            self._send_json({"error": "forbidden"}, 403)
            return
        self._send_file(target)

    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        payload = self._read_json()

        if path == "/skill":
            # 오픈빌더가 보내는 원본 요청을 그대로 처리 (카톡봇 - 동결)
            self._send_json(handle_skill_request(payload, SESSIONS))
            return

        if path == "/api/chat":
            # 카톡 테스트 화면용: 간단한 {user, utterance} 를 오픈빌더 형식으로 감싼다
            user_id = payload.get("user") or "local-test-user"
            utterance = payload.get("utterance") or ""
            wrapped = {
                "userRequest": {
                    "utterance": utterance,
                    "lang": "ko",
                    "user": {"id": user_id, "type": "accountId"},
                    "block": {"id": "local", "name": "로컬 테스트"},
                }
            }
            self._send_json(handle_skill_request(wrapped, SESSIONS))
            return

        if path == "/api/progress":
            try:
                saved = STORE.save(payload.get("user"), payload.get("progress"))
            except ProgressError as error:
                self._send_json({"error": error.message, "code": error.code}, 400)
                return
            self._send_json({"ok": True, "user": saved["user"], "savedAt": saved["savedAt"]})
            return

        if path == "/api/reset":
            try:
                self._send_json(STORE.reset(payload.get("user")))
            except ProgressError as error:
                self._send_json({"error": error.message, "code": error.code}, 400)
            return

        self._send_json({"error": "not found"}, 404)

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def _probe_port(port):
    """포트가 다른 프로그램(http.server 등)에 잡혀 있는지 미리 확인."""
    try:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=1.5)
        conn.request("GET", "/health")
        response = conn.getresponse()
        is_ours = "KakaoJapaneseBot" in (response.headers.get("Server") or "")
        conn.close()
    except ConnectionRefusedError:
        return "free"
    except OSError:
        return "unknown"
    return "mine" if is_ours else "stranger"


def main():
    port_state = _probe_port(PORT)

    if port_state == "stranger":
        print("=" * 56)
        print(" [오류] 포트 %d 를 다른 프로그램이 사용하고 있어요." % PORT)
        print(" 예전에 남긴 `python -m http.server` 같은 서버가 같은 포트를")
        print(" 공유하면 화면·정적 파일이 이상하게 열립니다.")
        print(" 해결: 그 프로그램을 끄거나, 다른 포트로 여세요.")
        print("   PowerShell: $env:PORT=\"8010\"; python server.py")
        print("=" * 56)
        sys.exit(1)

    if port_state == "mine":
        print("이미 이 학습 서버가 실행 중이에요. → http://localhost:%d" % PORT)
        print("새로 띄우지 않습니다. 끄려면 기존 창에서 Ctrl + C.")
        return

    if port_state == "unknown":
        print("[참고] 포트 %d 상태를 확인하지 못해 그대로 시작합니다." % PORT)

    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 56)
    print(" 일본어 회화 학습 서버 실행 중")
    print("=" * 56)
    print(" 웹 학습장        : http://localhost:%d" % PORT)
    print(" 카톡 테스트 화면 : http://localhost:%d/legacy" % PORT)
    print(" 스킬 엔드포인트  : POST /skill")
    print(" 진도 저장 폴더   : data/progress/")
    print(" 종료하려면 Ctrl + C")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
