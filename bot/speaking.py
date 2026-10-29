# -*- coding: utf-8 -*-
"""말하기 중심 흐름: 주제 → 상황 선택 → 따라 말하기 + 말하기 퀴즈."""

import random

from . import content
from . import teacher as teacher_mod
from .kakao import simple_text, basic_card, quick_reply, build
from .menus import done_replies

CARD_DESC_LIMIT = 230  # 카카오 basicCard description 최대 길이(대략)


# --------------------------------------------------------------- 주제 선택

def category_menu(session):
    session.reset_flow()
    session.mode = "category"
    lines = []
    replies = []
    for i, cat in enumerate(content.CATEGORIES):
        count = len(content.scenarios_in(cat["id"]))
        lines.append("%d. %s %s (%d개 상황)" % (i + 1, cat["emoji"], cat["title"], count))
        replies.append(quick_reply("%s %s" % (cat["emoji"], cat["title"]), "주제:%s" % cat["id"]))
    replies.append(quick_reply("메인 메뉴", "시작"))
    outputs = [
        simple_text(
            "🗣️ 회화 연습\n어떤 주제를 연습해볼까요? (상황 %d개)"
            % len(content.SCENARIOS)
        ),
        basic_card(title="주제를 골라주세요", description="\n".join(lines)),
    ]
    return build(outputs, replies)


def scenario_menu(session, category_id):
    category = content.CATEGORY_BY_ID.get(category_id)
    items = content.scenarios_in(category_id)
    if category is None or not items:
        return category_menu(session)

    session.reset_flow()
    session.mode = "scenario_menu"
    session.category = category_id

    full_lines = []
    short_lines = []
    replies = []
    for i, sc in enumerate(items):
        full_lines.append(
            "%d. %s %s\n   %s (문장 %d개)"
            % (i + 1, sc["emoji"], sc["title"], sc["desc"], len(sc["steps"]))
        )
        short_lines.append("%d. %s %s" % (i + 1, sc["emoji"], sc["title"]))
        replies.append(quick_reply("%s %s" % (sc["emoji"], sc["title"]), "회화:%s" % sc["id"]))

    full = "\n".join(full_lines)
    description = full if len(full) <= CARD_DESC_LIMIT else "\n".join(short_lines)

    replies.append(quick_reply("다른 주제", "회화 연습"))
    replies.append(quick_reply("메인 메뉴", "시작"))

    outputs = [
        simple_text("%s %s\n%s" % (category["emoji"], category["title"], category["desc"])),
        basic_card(title="상황을 골라주세요", description=description),
    ]
    return build(outputs, replies)


# ------------------------------------------------------------ 따라 말하기 연습

def _current_scenario(session):
    return content.scenario_by_id(session.scenario)


def _step_outputs(session):
    scenario = _current_scenario(session)
    index = session.step
    step = scenario["steps"][index]
    total = len(scenario["steps"])

    description = "%s\n%s" % (step["pron"], step["ko"])
    if step.get("tip"):
        description += "\n\n💡 " + step["tip"]

    outputs = [
        simple_text(
            "(%d/%d) %s" % (index + 1, total, teacher_mod.line(session, "listen"))
        ),
        basic_card(title=step["ja"], description=description),
    ]
    return outputs


def _step_replies(session):
    scenario = _current_scenario(session)
    is_last = session.step >= len(scenario["steps"]) - 1
    replies = [
        quick_reply("연습 끝내기" if is_last else "다음 문장", "다음"),
        quick_reply("다시 보기", "다시 보기"),
        quick_reply("그만하기", "그만하기"),
    ]
    return replies


def start(session, scenario_id):
    scenario = content.scenario_by_id(scenario_id)
    if scenario is None:
        return category_menu(session)

    session.reset_flow()
    session.mode = "speaking"
    session.scenario = scenario["id"]
    session.step = 0

    intro = simple_text(
        "%s %s 연습을 시작할게요.\n문장 %d개를 하나씩 따라 말해봐요.\n%s"
        % (scenario["emoji"], scenario["title"], len(scenario["steps"]), scenario["desc"])
    )
    return build([intro] + _step_outputs(session), _step_replies(session))


def next_step(session):
    scenario = _current_scenario(session)
    if scenario is None:
        return category_menu(session)
    if session.step + 1 >= len(scenario["steps"]):
        return finish(session)
    session.step += 1
    session.touch()
    return build(_step_outputs(session), _step_replies(session))


def repeat(session):
    scenario = _current_scenario(session)
    if scenario is None:
        return category_menu(session)
    step = scenario["steps"][session.step]
    return build(
        [
            simple_text("🔁 다시 한 번, 천천히!"),
            basic_card(title=step["ja"], description="%s\n%s" % (step["pron"], step["ko"])),
        ],
        _step_replies(session),
    )


def finish(session):
    scenario = _current_scenario(session)
    if scenario is None:
        return category_menu(session)
    session.mastered[scenario["id"]] = len(scenario["steps"])
    outputs = [
        simple_text(
            teacher_mod.line(session, "finish", title=scenario["title"], count=len(scenario["steps"]))
        ),
        simple_text(teacher_mod.line(session, "encourage")),
        simple_text("다른 상황도 연습해보면 훨씬 좋아요 👇"),
    ]
    session.reset_flow()
    return build(outputs, done_replies())


# ------------------------------------------------------------- 말하기 퀴즈

def _new_question(session):
    scenario, step = content.random_step()
    pool = [st for _, st in content.all_steps()
            if st["ja"] != step["ja"] and st["ko"] != step["ko"]]
    options = [step] + random.sample(pool, 3)
    random.shuffle(options)
    answer = next(i for i, o in enumerate(options) if o["ja"] == step["ja"])
    session.question = {
        "scenario": scenario,
        "prompt": step,
        "options": options,
        "answer": answer,
    }
    session.mode = "speaking_quiz"


def _question_parts(session):
    question = session.question
    step = question["prompt"]
    # 초보자도 읽을 수 있도록 선택지에 발음을 함께 보여준다
    lines = [
        "%d) %s  (%s)" % (i + 1, o["ja"], o["pron"])
        for i, o in enumerate(question["options"])
    ]
    outputs = [
        simple_text(
            "🎤 이 상황에서 뭐라고 말할까요?\n\n「%s」\n(%s %s)"
            % (step["ko"], question["scenario"]["emoji"], question["scenario"]["title"])
        ),
        basic_card(title="알맞은 일본어를 골라주세요", description="\n".join(lines)),
    ]
    replies = [quick_reply("%d번" % (i + 1), str(i + 1)) for i in range(len(question["options"]))]
    replies.append(quick_reply("그만하기", "그만하기"))
    return outputs, replies


def start_quiz(session):
    session.reset_flow()
    _new_question(session)
    outputs, replies = _question_parts(session)
    return build(
        [simple_text("🎤 말하기 퀴즈!\n한국어 문장을 보고 알맞은 일본어를 골라보세요.")] + outputs,
        replies,
    )


def answer(session, index):
    question = session.question
    if not question:
        return start_quiz(session)

    is_correct = index == question["answer"]
    session.record(is_correct)
    step = question["prompt"]

    if is_correct:
        head = teacher_mod.line(session, "praise")
    else:
        head = teacher_mod.line(session, "oops", answer="%d번" % (question["answer"] + 1))

    feedback = simple_text(
        "%s\n\n%s\n발음: %s\n뜻: %s" % (head, step["ja"], step["pron"], step["ko"])
    )
    extra = []
    if step.get("tip"):
        extra.append(simple_text("💡 " + step["tip"]))

    _new_question(session)
    outputs, replies = _question_parts(session)
    return build([feedback] + extra + [simple_text("➡️ 다음 문제!")] + outputs, replies)
