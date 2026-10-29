# -*- coding: utf-8 -*-
"""스킬 서버 응답을 서버 실행 없이 확인하는 간단한 점검 스크립트.

    python tools/smoke_test.py
"""

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from bot import content                            # noqa: E402
from bot.dispatcher import handle_skill_request    # noqa: E402
from bot.session import SessionStore               # noqa: E402


def run(sessions, utterance, label=None):
    payload = {"userRequest": {"utterance": utterance, "user": {"id": "tester"}}}
    response = handle_skill_request(payload, sessions)
    outputs = response["template"]["outputs"]
    replies = [r["label"] for r in response["template"].get("quickReplies", [])]
    shown = label if label is not None else utterance
    print("-" * 60)
    print("[USER] %s" % (shown if shown != "" else "(처음 진입)"))
    for output in outputs:
        if "simpleText" in output:
            print("[BOT] " + output["simpleText"]["text"].replace("\n", "\n      "))
        elif "basicCard" in output:
            card = output["basicCard"]
            print("[CARD] " + (card.get("title") or ""))
            for line in (card.get("description") or "").split("\n"):
                print("       " + line)
        else:
            print("[BOT] " + json.dumps(output, ensure_ascii=False))
    if replies:
        print("[BTN] " + " | ".join(replies))
    return response


def main():
    print("=" * 60)
    print("콘텐츠 규모: 주제 %d개 / 상황 %d개 / 문장 %d개 / 단어 %d개"
          % (len(content.CATEGORIES), len(content.SCENARIOS),
             content.total_step_count(), len(content.WORDS)))
    print("커리큘럼 규모: %d단계 / %d과"
          % (len(content.LEVELS), content.total_lessons()))
    print("=" * 60)

    sessions = SessionStore()
    run(sessions, "", "(처음 진입)")
    run(sessions, "여성")
    run(sessions, "도움말")

    # ── 커리큘럼: 가나 과 ────────────────────────────────────────
    run(sessions, "커리큘럼")
    run(sessions, "1", "(1단계: 글자와 발음)")
    run(sessions, "1", "(1과: 히라가나 ①)")
    run(sessions, "읽기 연습")
    for _ in range(6):
        run(sessions, "1", "(가나 퀴즈 정답)")
    run(sessions, "이어서 학습")
    run(sessions, "그만하기")

    # ── 커리큘럼: 회화 과 ────────────────────────────────────────
    run(sessions, "커리큘럼")
    run(sessions, "2", "(2단계: 첫 만남)")
    run(sessions, "1", "(1과: 때와 상황별 인사)")
    while sessions.get("tester").mode == "speaking":
        run(sessions, "다음")
    run(sessions, "커리큘럼")

    run(sessions, "회화 연습")
    run(sessions, "2", "(주제 2번: 먹고 마시기)")
    run(sessions, "1", "(상황 1번: 카페)")
    run(sessions, "다음 문장")
    run(sessions, "다시 보기")
    run(sessions, "그만하기")
    run(sessions, "말하기 퀴즈")
    run(sessions, "1")
    run(sessions, "그만하기")
    run(sessions, "단어 퀴즈")
    run(sessions, "2")
    run(sessions, "그만하기")
    run(sessions, "오늘의 한마디")
    run(sessions, "선생님 바꾸기")
    run(sessions, "남성")
    run(sessions, "학습 기록")
    run(sessions, "아무말이나")
    print("-" * 60)
    print("점검 완료")


if __name__ == "__main__":
    main()
