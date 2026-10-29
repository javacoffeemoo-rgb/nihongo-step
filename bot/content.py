# -*- coding: utf-8 -*-
"""학습 콘텐츠(단어 / 상황별 회화) 로더."""

import json
import os
import random

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# 회화 상황을 묶는 큰 주제. 시나리오의 "cat" 값과 짝을 이룬다.
CATEGORIES = [
    {"id": "basic", "emoji": "🙋", "title": "기초 인사", "desc": "인사, 감사, 가벼운 잡담"},
    {"id": "food", "emoji": "🍜", "title": "먹고 마시기", "desc": "카페, 식당, 이자카야"},
    {"id": "shop", "emoji": "🛍️", "title": "사고 사기", "desc": "편의점, 옷 가게, 환전"},
    {"id": "move", "emoji": "🚃", "title": "길과 교통", "desc": "길 묻기, 전철, 택시"},
    {"id": "travel", "emoji": "🏨", "title": "여행과 숙박", "desc": "호텔, 관광, 와이파이"},
    {"id": "daily", "emoji": "🏥", "title": "생활과 비상", "desc": "전화, 병원, 도움 요청"},
]


def _load(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, encoding="utf-8") as fp:
        return json.load(fp)


WORDS = _load("words.json")
SCENARIOS = _load("scenarios.json")
KANA = _load("kana.json")
CURRICULUM = _load("curriculum.json")

_BY_ID = dict((sc["id"], sc) for sc in SCENARIOS)
CATEGORY_BY_ID = dict((c["id"], c) for c in CATEGORIES)

KANA_LESSONS = KANA["lessons"]
KANA_READINGS = KANA["readings"]

LEVELS = CURRICULUM["levels"]
LEVEL_BY_ID = dict((lv["id"], lv) for lv in LEVELS)
LESSON_BY_ID = {}
for _level in LEVELS:
    for _lesson in _level["lessons"]:
        _lesson["level"] = _level["id"]
        LESSON_BY_ID[_lesson["id"]] = _lesson


def level_by_id(level_id):
    return LEVEL_BY_ID.get(level_id)


# 가나 콘텐츠 id -> 커리큘럼 과 id (진도 기록용)
KANA_TO_LESSON = dict(
    (_lesson["content"], _lesson["id"])
    for _lesson in LESSON_BY_ID.values()
    if _lesson.get("type") == "kana"
)


def lesson_by_id(lesson_id):
    return LESSON_BY_ID.get(lesson_id)


def total_lessons():
    return len(LESSON_BY_ID)



# --------------------------------------------------------------- 시나리오 탐색

def scenario_by_id(scenario_id):
    return _BY_ID.get(scenario_id)


def scenario_at(index):
    if 0 <= index < len(SCENARIOS):
        return SCENARIOS[index]
    return None


def scenarios_in(category_id):
    return [sc for sc in SCENARIOS if sc.get("cat") == category_id]


def random_step():
    """아무 상황에서 문장 하나를 뽑아온다."""
    scenario = random.choice(SCENARIOS)
    return scenario, random.choice(scenario["steps"])


def all_steps():
    steps = []
    for scenario in SCENARIOS:
        for step in scenario["steps"]:
            steps.append((scenario, step))
    return steps


def random_word():
    return random.choice(WORDS)


def total_step_count():
    return sum(len(sc["steps"]) for sc in SCENARIOS)
