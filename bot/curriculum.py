# -*- coding: utf-8 -*-
"""EBS 참고 커리큘럼: 6단계 24과 탐색과 진도 관리.

진도는 저장하지 않고 세션 상태에서 계산합니다.
 · 회화 과  -> 실제로 끝까지 연습했는지(session.mastered)
 · 가나 과  -> 읽기 퀴즈를 완료했는지(session.completed)
"""

from . import content, kana, speaking
from .kakao import simple_text, basic_card, quick_reply, build
from .menus import menu_replies


def is_done(session, lesson):
    if lesson.get("type") == "scenario":
        return lesson.get("scenario") in session.mastered
    return lesson["id"] in session.completed


def level_progress(session, level):
    lessons = level["lessons"]
    done = sum(1 for lesson in lessons if is_done(session, lesson))
    return done, len(lessons)


def completed_count(session):
    return sum(1 for lesson in content.LESSON_BY_ID.values() if is_done(session, lesson))


def level_menu(session):
    session.reset_flow()
    session.mode = "curriculum"

    lines = []
    replies = []
    for index, level in enumerate(content.LEVELS):
        done, total = level_progress(session, level)
        mark = "✅" if done == total else "%d/%d" % (done, total)
        lines.append(
            "%d. %s %s · %s (%s)"
            % (index + 1, level["emoji"], level["title"], level["subtitle"], mark)
        )
        replies.append(
            quick_reply("%s %s" % (level["emoji"], level["title"]), "레벨:%s" % level["id"])
        )

    replies.append(quick_reply("이어서 학습", "이어서 학습"))
    replies.append(quick_reply("메인 메뉴", "시작"))

    outputs = [
        simple_text(
            "📘 EBS 참고 커리큘럼\n"
            "6단계 · %d과 · %d과 완료\n"
            "순서대로 하면 가장 효과적이에요."
            % (content.total_lessons(), completed_count(session))
        ),
        basic_card(title="단계를 골라주세요", description="\n".join(lines)),
    ]
    return build(outputs, replies)


def lesson_menu(session, level_id):
    level = content.level_by_id(level_id)
    if level is None:
        return level_menu(session)

    session.reset_flow()
    session.mode = "lesson_menu"
    session.level = level_id

    lines = []
    replies = []
    for index, lesson in enumerate(level["lessons"]):
        mark = "✅" if is_done(session, lesson) else "○"
        lines.append("%d. %s %s" % (index + 1, mark, lesson["title"]))
        replies.append(
            quick_reply("%d. %s" % (index + 1, lesson["title"]), "과:%s" % lesson["id"])
        )

    replies.append(quick_reply("이어서 학습", "이어서 학습"))
    replies.append(quick_reply("다른 단계", "커리큘럼"))

    done, total = level_progress(session, level)
    outputs = [
        simple_text(
            "%s %s · %s\n%s\n\n진도 %d/%d"
            % (level["emoji"], level["title"], level["subtitle"], level["goal"], done, total)
        ),
        basic_card(title="과를 골라주세요", description="\n".join(lines)),
    ]
    return build(outputs, replies)


def start_lesson(session, lesson_id):
    lesson = content.lesson_by_id(lesson_id)
    if lesson is None:
        return level_menu(session)
    if lesson["type"] == "kana":
        return kana.start(session, lesson["content"])
    return speaking.start(session, lesson["scenario"])


def continue_learning(session):
    """아직 끝내지 않은 첫 과를 이어서 시작한다."""
    for level in content.LEVELS:
        for lesson in level["lessons"]:
            if not is_done(session, lesson):
                return start_lesson(session, lesson["id"])
    return build(
        [
            simple_text(
                "🎉 축하합니다! %d과를 모두 끝냈어요.\n"
                "이제 회화 연습과 퀴즈로 복습해보세요." % content.total_lessons()
            )
        ],
        menu_replies(),
    )
