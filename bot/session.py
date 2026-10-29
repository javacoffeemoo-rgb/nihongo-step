# -*- coding: utf-8 -*-
"""사용자별 대화 상태 저장소 (메모리 기반).

카카오는 사용자마다 고유 id 를 주기 때문에, 그 id 로 상태를 기억하면
"지금 몇 번 문제를 풀고 있는지" 같은 문맥을 유지할 수 있습니다.
서버를 재시작하면 초기화됩니다.
"""

import threading
import time

DEFAULT_TTL = 60 * 60  # 1시간 동안 대화가 없으면 상태 삭제


class Session(object):
    def __init__(self):
        # 프로필 (메뉴로 돌아가도 유지)
        self.teacher = None       # "female" 또는 "male"
        # 누적 학습 기록 (메뉴로 돌아가도 유지)
        self.correct = 0
        self.total = 0
        self.mastered = {}        # 상황 id -> 마지막으로 끝낸 문장 수
        self.completed = {}       # 커리큘럼 과 id -> 완료 여부 (가나 과)
        # 진행 중인 흐름 상태 (메뉴로 돌아가면 초기화)
        self.mode = None
        self.category = None
        self.scenario = None      # 상황 id
        self.level = None         # 커리큘럼 단계 id
        self.lesson = None        # 커리큘럼 과 id
        self.step = 0
        self.question = None
        self.kana = None          # 가나 퀴즈 상태
        self.updated = time.time()

    def reset_flow(self):
        self.mode = None
        self.category = None
        self.scenario = None
        self.level = None
        self.lesson = None
        self.step = 0
        self.question = None
        self.kana = None
        self.touch()

    def record(self, is_correct):
        self.total += 1
        if is_correct:
            self.correct += 1
        self.touch()

    def touch(self):
        self.updated = time.time()


class SessionStore(object):
    def __init__(self, ttl=DEFAULT_TTL):
        self._ttl = ttl
        self._items = {}
        self._lock = threading.Lock()

    def get(self, user_id):
        key = user_id or "anonymous"
        with self._lock:
            self._cleanup()
            session = self._items.get(key)
            if session is None:
                session = Session()
                self._items[key] = session
            session.touch()
            return session

    def _cleanup(self):
        now = time.time()
        expired = [k for k, v in self._items.items() if now - v.updated > self._ttl]
        for key in expired:
            del self._items[key]
