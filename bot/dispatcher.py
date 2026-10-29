# -*- coding: utf-8 -*-
"""사용자가 보낸 문장(발화)을 해석해서 알맞은 응답을 만든다."""

import re

from . import content, curriculum, speaking, teacher as teacher_mod, word_quiz
from . import kana as kana_flow
from .kakao import simple_text, basic_card, quick_reply, build
from .menus import main_menu, help_menu, teacher_select, menu_replies

# 입력에서 무시할 문자들 (공백/문장부호)
_IGNORE = re.compile(r"[\s\.!,?~、。！？·'\"()\[\]]")

# 선생님 선택
FEMALE_WORDS = ("여성", "여자", "female", "유키")
MALE_WORDS = ("남성", "남자", "male", "타케시")

# 메인 메뉴로 돌아가는 말
_GO_HOME = (
    "그만하기", "그만", "종료", "끝", "취소", "나가기",
    "메뉴", "메인메뉴", "홈", "처음", "시작", "리스타트", "reset",
    # 인사말도 메인 메뉴를 보여준다
    "안녕", "안녕하세요", "하이", "반가워", "반갑습니다", "hi", "hello",
)

# 선생님을 다시 고르는 말
_CHANGE_TEACHER = ("선생님바꾸기", "선생님변경", "선생님고르기", "선생님선택", "선생님바꿔")

_STATS_WORDS = ("학습기록", "기록", "점수", "성적", "내점수", "학습현황")


def _norm(text):
    return _IGNORE.sub("", (text or "").strip()).lower()


def _has(norm, *keywords):
    return any(k in norm for k in keywords)


def _stats(session):
    teacher = teacher_mod.describe(session)
    if session.total == 0:
        body = "아직 푼 문제가 없어요. 말하기 퀴즈부터 시작해볼까요?"
    else:
        rate = int(round(session.correct * 100.0 / session.total))
        body = (
            "푼 문제: %d개\n맞힌 문제: %d개\n정답률: %d%%"
            % (session.total, session.correct, rate)
        )

    done = []
    for scenario in content.SCENARIOS:
        if session.mastered.get(scenario["id"]):
            done.append("%s %s" % (scenario["emoji"], scenario["title"]))
    mastered = "\n".join(done) if done else "아직 없어요. 회화 연습으로 채워보세요!"
    if len(mastered) > 230:
        mastered = " · ".join(done[:8]) + " 외 %d개" % max(0, len(done) - 8)

    return build(
        [
            simple_text(
                "📊 학습 기록\n담당 선생님: %s\n커리큘럼: %d/%d과 완료"
                % (teacher, curriculum.completed_count(session), content.total_lessons())
            ),
            basic_card(title="퀴즈 성적", description=body),
            basic_card(title="끝까지 연습한 상황", description=mastered),
        ],
        menu_replies(),
    )


def _today_phrase(session):
    scenario, step = content.random_step()
    session.reset_flow()
    session.mode = "menu"
    description = "%s\n%s" % (step["pron"], step["ko"])
    if step.get("tip"):
        description += "\n\n💡 " + step["tip"]
    return build(
        [
            simple_text("✨ 오늘의 한마디\n(%s %s)" % (scenario["emoji"], scenario["title"])),
            basic_card(title=step["ja"], description=description),
            simple_text(teacher_mod.line(session, "listen") + " 🗣️"),
        ],
        [
            quick_reply("한마디 더", "오늘의 한마디"),
            quick_reply("회화 연습", "회화 연습"),
            quick_reply("메인 메뉴", "시작"),
        ],
    )


def _fallback(session):
    return build(
        [
            simple_text("음, 잘 못 알아들었어요 😅\n아래 버튼에서 골라주세요."),
            simple_text(
                "「커리큘럼」 → EBS 참고 6단계 24과 순서대로\n"
                "「회화 연습」 → 주제별 상황 따라 말하기\n"
                "「말하기 퀴즈」 → 한국어를 일본어로\n"
                "「단어 퀴즈」 → 쉬운 단어 뜻 맞히기"
            ),
        ],
        menu_replies(),
    )


def route(session, utterance):
    raw = (utterance or "").strip()
    norm = _norm(raw)

    # ── 선생님을 아직 고르지 않았거나, 지금 고르는 중이라면 ────────
    if session.teacher is None or session.mode == "teacher_select":
        if _has(norm, *FEMALE_WORDS):
            session.teacher = "female"
            return main_menu(session)
        if _has(norm, *MALE_WORDS):
            session.teacher = "male"
            return main_menu(session)
        # 이미 선생님이 있는데 다른 말을 하면 원래 화면으로 돌려보낸다
        if session.teacher is not None and (norm in _GO_HOME or norm in ("도움말", "사용법")):
            return main_menu(session)
        return teacher_select(session)

    if not norm:
        return main_menu(session)

    if norm in ("도움말", "사용법", "명령어", "help"):
        return help_menu(session)

    if norm in _STATS_WORDS:
        return _stats(session)

    if _has(norm, *_CHANGE_TEACHER):
        return teacher_select(session)

    # 메뉴 복귀는 언제나 최우선
    if norm in _GO_HOME:
        return main_menu(session)

    # ── 커리큘럼 ─────────────────────────────────────────────────
    if _has(norm, "커리큘럼", "교육과정", "단계별", "교재"):
        return curriculum.level_menu(session)

    if _has(norm, "이어서학습", "이어서", "계속하기", "다음과"):
        return curriculum.continue_learning(session)

    # "레벨:l1" 처럼 단계를 직접 지정한 경우
    matched = re.fullmatch(r"레벨[:：]?([a-z0-9]+)", norm)
    if matched:
        return curriculum.lesson_menu(session, matched.group(1))

    # "과:l1-2" 처럼 과를 직접 지정한 경우
    matched = re.fullmatch(r"과[:：]?([a-z0-9\-]+)", norm)
    if matched:
        return curriculum.start_lesson(session, matched.group(1))

    # ── 가나 학습 ────────────────────────────────────────────────
    if session.mode == "kana_guide" and _has(norm, "읽기연습", "연습시작", "퀴즈", "시작하기"):
        return kana_flow.begin_quiz(session)

    if session.mode == "kana_quiz" and re.fullmatch(r"[1-4]", norm):
        return kana_flow.answer(session, int(norm) - 1)

    # "주제:food" 처럼 주제를 직접 지정한 경우
    matched = re.fullmatch(r"주제[:：]?([a-z]+)", norm)
    if matched:
        return speaking.scenario_menu(session, matched.group(1))

    # "회화:hotel" (상황 id) 또는 "회화:3" (전체 번호)
    matched = re.fullmatch(r"회화[:：]?([a-z0-9]+)", norm)
    if matched:
        token = matched.group(1)
        if token.isdigit():
            scenario = content.scenario_at(int(token) - 1)
            if scenario:
                return speaking.start(session, scenario["id"])
            return speaking.category_menu(session)
        return speaking.start(session, token)

    # 퀴즈 진행 중 번호 응답
    if session.mode in ("speaking_quiz", "word_quiz") and re.fullmatch(r"[1-4]", norm):
        index = int(norm) - 1
        if session.mode == "speaking_quiz":
            return speaking.answer(session, index)
        return word_quiz.answer(session, index)

    # 따라 말하기 진행 중
    if session.mode == "speaking":
        if norm in ("다음", "다음문장", "다음으로", "next"):
            return speaking.next_step(session)
        if norm in ("다시보기", "다시", "반복"):
            return speaking.repeat(session)

    # 주제 / 상황 목록에서 번호만 보낸 경우
    if re.fullmatch(r"\d{1,2}", norm):
        index = int(norm) - 1
        if session.mode == "curriculum" and 0 <= index < len(content.LEVELS):
            return curriculum.lesson_menu(session, content.LEVELS[index]["id"])
        if session.mode == "lesson_menu":
            level = content.level_by_id(session.level)
            if level and 0 <= index < len(level["lessons"]):
                return curriculum.start_lesson(session, level["lessons"][index]["id"])
        if session.mode == "category" and 0 <= index < len(content.CATEGORIES):
            return speaking.scenario_menu(session, content.CATEGORIES[index]["id"])
        if session.mode == "scenario_menu":
            items = content.scenarios_in(session.category)
            if 0 <= index < len(items):
                return speaking.start(session, items[index]["id"])

    # 새 학습 시작 (말하기 퀴즈를 회화보다 먼저 검사)
    if _has(norm, "말하기퀴즈", "회화퀴즈", "말하기문제", "퀴즈말하기"):
        return speaking.start_quiz(session)

    if _has(norm, "주제", "회화", "말하기", "대화", "연습", "상황"):
        return speaking.category_menu(session)

    if _has(norm, "단어", "퀴즈", "문제"):
        return word_quiz.start(session)

    if _has(norm, "표현", "오늘의표현", "한마디"):
        return _today_phrase(session)

    return _fallback(session)


def handle_skill_request(payload, sessions):
    """오픈빌더가 보내는 요청 JSON 을 처리해 응답 JSON 을 돌려준다."""
    user_request = payload.get("userRequest") or {}
    user = user_request.get("user") or {}
    user_id = user.get("id") or "anonymous"
    utterance = user_request.get("utterance") or ""
    session = sessions.get(user_id)
    return route(session, utterance)
