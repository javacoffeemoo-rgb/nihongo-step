# -*- coding: utf-8 -*-
"""글자와 발음(가나) 학습.

EBS 「착!붙는 일본어」처럼 히라가나·가타카나를 먼저 익히고,
바로 읽기 퀴즈로 확인하는 구조입니다.
"""

import random

from . import content
from . import teacher as teacher_mod
from .kakao import simple_text, basic_card, quick_reply, build

QUESTIONS_PER_LESSON = 6


def _lesson(lesson_id):
    return content.KANA_LESSONS.get(lesson_id)


def _chars(lesson):
    chars = []
    for group in lesson["groups"]:
        for row in group["rows"]:
            chars.extend(row)
    return chars


def _format_group(group):
    lines = []
    for row in group["rows"]:
        parts = []
        for char in row:
            reading = content.KANA_READINGS.get(char, {})
            parts.append("%s(%s)" % (char, reading.get("ko", "")))
        lines.append("  ".join(parts))
    return "\n".join(lines)


def start(session, lesson_id):
    """가나 학습 시작: 글자표를 보여주고 읽기 퀴즈로 안내한다."""
    lesson = _lesson(lesson_id)
    if lesson is None:
        return None

    session.reset_flow()
    session.mode = "kana_guide"
    session.lesson = lesson_id

    outputs = [simple_text("🔤 %s\n먼저 글자와 소리를 눈으로 익혀볼까요?" % lesson["title"])]
    for group in lesson["groups"]:
        outputs.append(basic_card(title=group["label"], description=_format_group(group)))
    outputs.append(simple_text("💡 " + lesson["tip"]))

    replies = [
        quick_reply("읽기 연습", "읽기 연습"),
        quick_reply("그만하기", "그만하기"),
    ]
    return build(outputs, replies)


def begin_quiz(session):
    if session.mode != "kana_guide":
        return None
    lesson = _lesson(session.lesson)
    if lesson is None:
        return None
    session.mode = "kana_quiz"
    session.kana = {"index": 0, "correct": 0}
    _new_question(session)
    outputs, replies = _question_parts(session)
    return build(
        [simple_text("이제 읽기 퀴즈! %d문제예요." % QUESTIONS_PER_LESSON)] + outputs,
        replies,
    )


def _new_question(session):
    lesson = _lesson(session.lesson)
    chars = _chars(lesson)
    target = random.choice(chars)
    target_ko = content.KANA_READINGS[target]["ko"]

    pool = [c for c in chars if content.KANA_READINGS[c]["ko"] != target_ko]
    if len(pool) < 3:
        pool = [c for c in content.KANA_READINGS
                if content.KANA_READINGS[c]["ko"] != target_ko]
    options = random.sample(pool, 3) + [target]
    random.shuffle(options)

    session.question = {
        "target": target,
        "options": options,
        "answer": options.index(target),
    }


def _question_parts(session):
    question = session.question
    index = session.kana["index"]
    lines = [
        "%d) %s" % (i + 1, content.KANA_READINGS[o]["ko"])
        for i, o in enumerate(question["options"])
    ]
    outputs = [
        simple_text(
            "(%d/%d) 이 글자의 발음은?\n\n「%s」"
            % (index + 1, QUESTIONS_PER_LESSON, question["target"])
        ),
        basic_card(title="발음을 골라주세요", description="\n".join(lines)),
    ]
    replies = [quick_reply("%d번" % (i + 1), str(i + 1)) for i in range(len(question["options"]))]
    replies.append(quick_reply("그만하기", "그만하기"))
    return outputs, replies


def answer(session, index):
    question = session.question
    if not question:
        return None

    is_correct = index == question["answer"]
    session.record(is_correct)

    target = question["target"]
    reading = content.KANA_READINGS[target]

    if is_correct:
        session.kana["correct"] += 1
        head = teacher_mod.line(session, "praise")
    else:
        head = teacher_mod.line(
            session, "oops",
            answer="%d번 「%s」" % (question["answer"] + 1, reading["ko"]),
        )

    feedback = simple_text(
        "%s\n\n「%s」는 「%s」(%s)로 읽어요."
        % (head, target, reading["ko"], reading["romaji"])
    )

    session.kana["index"] += 1
    if session.kana["index"] >= QUESTIONS_PER_LESSON:
        return _finish(session, feedback)

    _new_question(session)
    outputs, replies = _question_parts(session)
    return build([feedback] + outputs, replies)


def _finish(session, feedback):
    lesson = _lesson(session.lesson)
    score = session.kana["correct"]
    session.completed[content.KANA_TO_LESSON.get(session.lesson, session.lesson)] = True
    session.reset_flow()

    outputs = [
        feedback,
        simple_text(
            "🎉 「%s」 완료!\n%d문제 중 %d문제를 맞혔어요."
            % (lesson["title"], QUESTIONS_PER_LESSON, score)
        ),
        simple_text("다음 과로 이어서 갈까요?"),
    ]
    replies = [
        quick_reply("이어서 학습", "이어서 학습"),
        quick_reply("커리큘럼", "커리큘럼"),
        quick_reply("메인 메뉴", "시작"),
    ]
    return build(outputs, replies)
