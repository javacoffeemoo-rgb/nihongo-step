// 로컬 테스트 화면 - 서버(/api/chat)에 메시지를 보내고 카카오 응답을 그려준다.
(function () {
  "use strict";

  var chatEl = document.getElementById("chat");
  var quickEl = document.getElementById("quickreplies");
  var inputEl = document.getElementById("input");
  var sendEl = document.getElementById("send");
  var USER = "local-test-user";
  var busy = false;

  function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function addUserBubble(text) {
    var row = document.createElement("div");
    row.className = "row user";
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    chatEl.appendChild(row);
    scrollToBottom();
  }

  function addBotNode(node) {
    var row = document.createElement("div");
    row.className = "row bot";
    var avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "日";
    row.appendChild(avatar);
    row.appendChild(node);
    chatEl.appendChild(row);
    scrollToBottom();
  }

  function addBotText(text) {
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    addBotNode(bubble);
  }

  function makeCardButton(label, messageText) {
    var button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", function () {
      send(messageText);
    });
    return button;
  }

  function addBotCard(card) {
    var wrap = document.createElement("div");
    wrap.className = "bubble card";

    if (card.title) {
      var title = document.createElement("div");
      title.className = "card-title";
      title.textContent = card.title;
      wrap.appendChild(title);
    }
    if (card.description) {
      var desc = document.createElement("div");
      desc.className = "card-desc";
      desc.textContent = card.description;
      wrap.appendChild(desc);
    }
    if (card.buttons && card.buttons.length) {
      var box = document.createElement("div");
      box.className = "card-buttons";
      card.buttons.forEach(function (b) {
        var label = b.label || "확인";
        var text = b.messageText || label;
        box.appendChild(makeCardButton(label, text));
      });
      wrap.appendChild(box);
    }
    addBotNode(wrap);
  }

  function renderOutput(output) {
    if (output.simpleText) {
      addBotText(output.simpleText.text || "");
      return;
    }
    if (output.basicCard) {
      addBotCard(output.basicCard);
      return;
    }
    if (output.textCard) {
      addBotCard(output.textCard);
      return;
    }
    if (output.listCard) {
      addBotCard({
        title: (output.listCard.header || {}).title,
        description: (output.listCard.items || [])
          .map(function (i) { return "· " + (i.title || ""); })
          .join("\n"),
        buttons: output.listCard.buttons
      });
      return;
    }
    // 알 수 없는 형식은 원본을 보여준다
    addBotText(JSON.stringify(output));
  }

  function renderQuickReplies(replies) {
    quickEl.innerHTML = "";
    (replies || []).forEach(function (r) {
      var label = r.label || r.messageText;
      var text = r.messageText || label;
      var button = document.createElement("button");
      button.textContent = label;
      button.addEventListener("click", function () { send(text); });
      quickEl.appendChild(button);
    });
  }

  function renderTemplate(template) {
    var outputs = (template && template.outputs) || [];
    var delay = 0;
    outputs.forEach(function (output) {
      setTimeout(function () { renderOutput(output); }, delay);
      delay += 160; // 말풍선이 차례로 뜨는 느낌
    });
    setTimeout(function () {
      renderQuickReplies(template && template.quickReplies);
      scrollToBottom();
    }, delay);
  }

  function send(text, silent) {
    if (busy) return;
    var message = (text || "").trim();
    if (!silent && !message) return;
    busy = true;

    if (!silent) addUserBubble(message);
    inputEl.value = "";

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: USER, utterance: message })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderTemplate(data.template);
      })
      .catch(function (err) {
        addBotText("⚠️ 서버에 연결하지 못했어요. python server.py 가 실행 중인지 확인해주세요.\n" + err);
      })
      .then(function () {
        busy = false;
        inputEl.focus();
      });
  }

  sendEl.addEventListener("click", function () { send(inputEl.value); });
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send(inputEl.value);
  });

  // 화면을 열면 인사 + 메인 메뉴부터
  send("", true);
})();
