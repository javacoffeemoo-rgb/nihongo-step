# -*- coding: utf-8 -*-
"""웹 학습 진도 저장소.

닉네임 하나로 진도를 찾습니다. 비밀번호가 없는 대신
개인정보는 받지 않고, 학습 진도만 JSON 파일로 저장합니다.

    data/progress/p_9f2c1a7b3d.json

파일명은 닉네임의 SHA-1 앞 10자리라서 한글·공백·특수문자도 안전합니다.
"""

import hashlib
import json
import os
import re
import threading
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Render 같은 배포 환경에서는 영구 디스크 경로를 PROGRESS_DIR 로 지정할 수 있다.
PROGRESS_DIR = os.environ.get("PROGRESS_DIR") or os.path.join(BASE_DIR, "data", "progress")

MAX_NAME_LENGTH = 20
MAX_PAYLOAD_BYTES = 200 * 1024  # 진도 파일 하나의 상한 (200KB)

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_SPACES = re.compile(r"\s+")


class ProgressError(Exception):
    """진도 저장/조회 중 사용자에게 알려줄 수 있는 오류."""

    def __init__(self, code, message):
        Exception.__init__(self, message)
        self.code = code
        self.message = message


def normalize_name(name):
    """닉네임을 저장 키로 쓸 수 있게 정리한다."""
    text = _CONTROL.sub("", name or "")
    text = _SPACES.sub(" ", text).strip()
    return text[:MAX_NAME_LENGTH]


def key_for(name):
    """닉네임 -> 파일명. 한글도 안전하도록 해시를 쓴다."""
    normalized = normalize_name(name).lower()
    digest = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:10]
    return "p_" + digest + ".json"


class ProgressStore(object):
    def __init__(self, directory=PROGRESS_DIR):
        self._dir = directory
        self._lock = threading.Lock()
        if not os.path.isdir(self._dir):
            os.makedirs(self._dir)

    def _path(self, name):
        return os.path.join(self._dir, key_for(name))

    # ------------------------------------------------------------- 조회
    def load(self, name):
        name = normalize_name(name)
        if not name:
            raise ProgressError("no_name", "닉네임을 입력해주세요.")

        path = self._path(name)
        with self._lock:
            if not os.path.isfile(path):
                return {"found": False, "user": name}
            try:
                with open(path, encoding="utf-8") as fp:
                    data = json.load(fp)
            except (ValueError, OSError):
                return {"found": False, "user": name, "broken": True}

        if not isinstance(data, dict):
            return {"found": False, "user": name, "broken": True}
        data["found"] = True
        data["user"] = name
        return data

    def exists(self, name):
        name = normalize_name(name)
        if not name:
            return False
        with self._lock:
            return os.path.isfile(self._path(name))

    # ------------------------------------------------------------- 저장
    def save(self, name, progress):
        name = normalize_name(name)
        if not name:
            raise ProgressError("no_name", "닉네임을 입력해주세요.")
        if not isinstance(progress, dict):
            raise ProgressError("bad_payload", "진도 형식이 올바르지 않습니다.")

        payload = dict(progress)
        payload["version"] = 1
        payload["user"] = name
        payload["savedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        if len(raw) > MAX_PAYLOAD_BYTES:
            raise ProgressError("too_large", "저장할 진도가 너무 큽니다.")

        path = self._path(name)
        temp = path + ".tmp"
        with self._lock:
            with open(temp, "wb") as fp:
                fp.write(raw)
            os.replace(temp, path)  # 원자적 교체: 중간에 꺼져도 파일이 깨지지 않음

        return payload

    # ------------------------------------------------------------- 초기화
    def reset(self, name):
        name = normalize_name(name)
        if not name:
            raise ProgressError("no_name", "닉네임을 입력해주세요.")

        path = self._path(name)
        with self._lock:
            if os.path.isfile(path):
                os.remove(path)
        return {"ok": True, "user": name}

    # ------------------------------------------------------------- 목록
    def users(self):
        """저장된 진도 파일 목록 (통계용, 닉네임 포함)."""
        result = []
        with self._lock:
            names = sorted(os.listdir(self._dir))
            for filename in names:
                if not filename.endswith(".json"):
                    continue
                path = os.path.join(self._dir, filename)
                try:
                    with open(path, encoding="utf-8") as fp:
                        data = json.load(fp)
                except (ValueError, OSError):
                    continue
                result.append(
                    {
                        "user": data.get("user"),
                        "savedAt": data.get("savedAt"),
                        "lessons": len(data.get("lessons") or {}),
                    }
                )
        return result
