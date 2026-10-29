# -*- coding: utf-8 -*-
"""카카오 i 오픈빌더 응답(template) 생성 헬퍼.

오픈빌더 스킬 서버는 아래 형태의 JSON 을 돌려주면 됩니다.
{
  "version": "2.0",
  "template": {
    "outputs": [ ...말풍선들... ],
    "quickReplies": [ ...하단 버튼들... ]
  }
}
"""


def simple_text(text):
    """일반 텍스트 말풍선."""
    return {"simpleText": {"text": text}}


def basic_card(title=None, description=None, thumbnail=None, buttons=None):
    """제목 + 설명 + 버튼 형태의 카드 말풍선."""
    card = {}
    if title:
        card["title"] = title
    if description:
        card["description"] = description
    if thumbnail:
        card["thumbnail"] = {"imageUrl": thumbnail}
    if buttons:
        card["buttons"] = buttons
    return {"basicCard": card}


def message_button(label, message_text=None):
    """누르면 지정한 문장을 사용자가 보낸 것처럼 전송하는 버튼."""
    return {
        "action": "message",
        "label": label,
        "messageText": label if message_text is None else message_text,
    }


def link_button(label, url):
    """웹페이지를 여는 버튼."""
    return {"action": "webLink", "label": label, "webLinkUrl": url}


def quick_reply(label, message_text=None):
    """입력창 위에 뜨는 퀵 답장 버튼."""
    return {
        "action": "message",
        "label": label,
        "messageText": label if message_text is None else message_text,
    }


def build(outputs, quick_replies=None):
    """최종 응답 JSON 생성. 빈 output 은 걸러내고 퀵답장은 10개까지만 사용."""
    clean = [o for o in outputs if o]
    template = {"outputs": clean}
    if quick_replies:
        template["quickReplies"] = quick_replies[:10]
    return {"version": "2.0", "template": template}
