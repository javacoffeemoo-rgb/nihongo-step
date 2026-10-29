# -*- coding: utf-8 -*-
"""보조 학습: 일본어 단어의 뜻 맞히기 퀴즈."""

import random

from . import content
from . import teacher as teacher_mod
from .kakao import simple_text, basic_card, quick_reply, build


def _new_question(session):
    word = content.random_word()
    pool = [w for w in content.WORDS if w["ja"] != word["ja"] and w["ko"] != word["ko"]]
    options = [word] + random.sample(pool, 3)
    random.shuffle(options)
    answer = next(i for i, o in enumerate(options) if o["ja"] == word["ja"])
    session.question = {"prompt": word, "options": options, "answer": answer}
    session.mode = "word_quiz"


def _question_parts(session):
    question = session.question
    word = question["prompt"]
    lines = ["%d) %s" % (i + 1, o["ko"]) for i, o in enumerate(question["options"])]
    outputs = [
        simple_text(
            "📚 이 일본어 단어의 뜻은?\n\n「%s」\n읽기: %s  /  발음: %s"
            % (word["ja"], word["kana"], word["pron"])
        ),
        basic_card(title="뜻을 골라주세요", description="\n".join(lines)),
    ]
    replies = [quick_reply("%d번" % (i + 1), str(i + 1)) for i in range(len(question["options"]))]
    replies.append(quick_reply("그만하기", "그만하기"))
    return outputs, replies


def start(session):
    session.reset_flow()
    _new_question(session)
    outputs, replies = _question_parts(session)
    return build(
        [simple_text("📚 단어 퀴즈! 뜻을 골라보세요. (초보용)")] + outputs,
        replies,
    )


def answer(session, index):
    question = session.question
    if not question:
        return start(session)

    is_correct = index == question["answer"]
    session.record(is_correct)
    word = question["prompt"]

    if is_correct:
        head = teacher_mod.line(session, "praise")
    else:
        head = teacher_mod.line(session, "oops", answer="%d번 「%s」" % (question["answer"] + 1, word["ko"]))

    feedback = simple_text(
        "%s\n\n%s (%s)\n발음: %s\n뜻: %s"
        % (head, word["ja"], word["kana"], word["pron"], word["ko"])
    )

    _new_question(session)
    outputs, replies = _question_parts(session)
    return build([feedback, simple_text("➡️ 다음 단어!")] + outputs, replies)
