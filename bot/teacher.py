# -*- coding: utf-8 -*-
"""일본어 선생님 페르소나.

사용자가 남성 / 여성 선생님을 고르면, 말투와 응원 방식이 달라집니다.
"""

import random

TEACHERS = {
    "female": {
        "id": "female",
        "ko_name": "유키 선생님",
        "ja_name": "ゆき先生",
        "gender": "여성",
        "emoji": "👩‍🏫",
        "tagline": "다정하고 차분하게 알려주는 선생님",
        "greet": [
            "안녕하세요 😊 오늘도 같이 천천히 해볼까요?",
            "어서 오세요. 잘 오셨어요 🌸",
            "다시 만나서 반가워요. 오늘도 화이팅이에요!",
        ],
        "listen": [
            "소리 내어 따라 말해보세요 🔊",
            "천천히, 또박또박 읽어볼까요?",
            "입으로 소리 내는 게 제일 중요해요. 따라 해보세요 🌷",
        ],
        "praise": [
            "⭕ 정답이에요!",
            "⭕ 정말 잘하셨어요!",
            "⭕ 완벽해요, 멋져요!",
        ],
        "oops": [
            "❌ 아쉬워요. 정답은 {answer}예요.",
            "❌ 괜찮아요. 정답은 {answer}예요. 같이 읽어볼까요?",
        ],
        "finish": [
            "🎉 {title} 연습 끝! {count}문장을 끝까지 해내셨어요. 정말 잘했어요!",
        ],
        "encourage": [
            "틀려도 괜찮아요. 반복하다 보면 어느새 익숙해집니다 🌸",
            "오늘 한 만큼 실력이 늘고 있어요. 스스로를 칭찬해주세요 😊",
        ],
    },
    "male": {
        "id": "male",
        "ko_name": "타케시 선생님",
        "ja_name": "たけし先生",
        "gender": "남성",
        "emoji": "👨‍🏫",
        "tagline": "활기차고 시원시원하게 알려주는 선생님",
        "greet": [
            "안녕하세요! 오늘도 가볍게 시작해볼까요? 😄",
            "좋아요, 오늘도 달려봅니다!",
            "어서 오세요! 준비되셨죠? 바로 갑니다 💪",
        ],
        "listen": [
            "크게 소리 내서 따라 말해보세요 🔊",
            "한 번 크게! 입 밖으로 내뱉어봐요.",
            "소리 내어 말하는 게 실력 늘리는 지름길이에요!",
        ],
        "praise": [
            "⭕ 정답이에요!",
            "⭕ 좋아요, 완벽해요!",
            "⭕ 오, 정확했어요!",
        ],
        "oops": [
            "❌ 아쉬워요! 정답은 {answer}예요.",
            "❌ 조금만 더! 정답은 {answer}예요.",
        ],
        "finish": [
            "🎉 {title} 연습 끝! {count}문장 클리어했어요. 좋았어요!",
        ],
        "encourage": [
            "틀려도 됩니다. 입에 붙을 때까지 반복이 답이에요 💪",
            "꾸준히 하는 사람이 결국 이깁니다. 오늘도 해냈어요!",
        ],
    },
}


def get(session):
    """현재 세션에 선택된 선생님을 돌려준다. 아직 없으면 None."""
    return TEACHERS.get(getattr(session, "teacher", None))


def line(session, key, **kwargs):
    """선생님 말투로 된 문장 하나를 뽑아온다."""
    teacher = get(session)
    if not teacher:
        return ""
    template = random.choice(teacher[key])
    try:
        return template.format(**kwargs)
    except (KeyError, IndexError):
        return template


def describe(session):
    """'👩‍🏫 유키 선생님 (여성)' 형태의 소개 문구."""
    teacher = get(session)
    if not teacher:
        return ""
    return "%s %s (%s)" % (teacher["emoji"], teacher["ko_name"], teacher["gender"])
