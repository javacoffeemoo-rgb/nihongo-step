# -*- coding: utf-8 -*-
"""선생님 선택 / 메인 메뉴 / 도움말 화면."""

from . import content
from . import teacher as teacher_mod
from .kakao import simple_text, basic_card, quick_reply, build

START_TEXT = "시작"


def teacher_select(session):
    """처음 진입했거나 선생님을 바꿀 때 보여주는 화면."""
    session.reset_flow()
    session.mode = "teacher_select"
    outputs = [
        simple_text(
            "안녕하세요! 🇯🇵 일본어 회화 선생님을 소개할게요.\n"
            "누구에게 배우고 싶으세요?"
        ),
        basic_card(
            title="선생님을 골라주세요",
            description=(
                "두 분 모두 실력은 똑같아요. 말투만 달라요!\n\n"
                "👩‍🏫 유키 선생님 (여성)\n"
                "   다정하고 차분하게 알려줘요\n\n"
                "👨‍🏫 타케시 선생님 (남성)\n"
                "   활기차고 시원시원하게 알려줘요"
            ),
        ),
    ]
    replies = [
        quick_reply("여성 유키 선생님", "여성"),
        quick_reply("남성 타케시 선생님", "남성"),
    ]
    return build(outputs, replies)


def menu_replies():
    """메인 메뉴 하단 버튼."""
    return [
        quick_reply("커리큘럼", "커리큘럼"),
        quick_reply("회화 연습", "회화 연습"),
        quick_reply("말하기 퀴즈", "말하기 퀴즈"),
        quick_reply("단어 퀴즈", "단어 퀴즈"),
        quick_reply("오늘의 한마디", "오늘의 한마디"),
        quick_reply("학습 기록", "학습 기록"),
        quick_reply("선생님 바꾸기", "선생님 바꾸기"),
    ]


def done_replies():
    """연습을 끝냈을 때 하단 버튼."""
    return [
        quick_reply("커리큘럼", "커리큘럼"),
        quick_reply("회화 연습", "회화 연습"),
        quick_reply("말하기 퀴즈", "말하기 퀴즈"),
        quick_reply("단어 퀴즈", "단어 퀴즈"),
        quick_reply("메인 메뉴", START_TEXT),
    ]


def main_menu(session):
    teacher = teacher_mod.get(session)
    if teacher is None:
        return teacher_select(session)

    session.reset_flow()
    session.mode = "menu"
    outputs = [
        simple_text(
            "%s %s이에요.\n%s"
            % (teacher["emoji"], teacher["ko_name"], teacher_mod.line(session, "greet"))
        ),
        basic_card(
            title="무엇을 연습할까요?",
            description=(
                "1. 커리큘럼  EBS 참고 6단계 24과\n"
                "2. 회화 연습  주제별로 골라서\n"
                "3. 말하기 퀴즈  한국어 → 일본어\n"
                "4. 단어 퀴즈  뜻 맞히기\n"
                "5. 오늘의 한마디  문장 하나 배우기\n\n"
                "상황 %d개 · 문장 %d개 · 단어 %d개"
                % (len(content.SCENARIOS), content.total_step_count(), len(content.WORDS))
            ),
        ),
    ]
    return build(outputs, menu_replies())


def help_menu(session):
    outputs = [
        simple_text(
            "📖 사용법\n\n"
            "· 커리큘럼  EBS 참고 6단계 24과를 순서대로\n"
            "· 회화 연습  주제별 상황 %d개를 골라 따라 말해요\n"
            "· 말하기 퀴즈  한국어를 보고 알맞은 일본어를 골라요\n"
            "· 단어 퀴즈  일본어 단어의 뜻(%d개)을 골라요\n"
            "· 번호를 보내면 바로 골라져요 (예: 1)\n"
            "· 그만하기  언제든 메인 메뉴로 돌아와요\n"
            "· 선생님 바꾸기  말투를 바꿀 수 있어요"
            % (len(content.SCENARIOS), len(content.WORDS))
        ),
        simple_text(
            "🗣️ 초보자 팁\n\n"
            "1. 한 문장을 3번 큰 소리로 읽어요\n"
            "2. 발음을 보며 천천히, 또박또박\n"
            "3. 모르면 바로 다음으로 넘어가도 괜찮아요"
        ),
    ]
    return build(outputs, menu_replies())
