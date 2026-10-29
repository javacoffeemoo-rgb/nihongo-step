// 단어장: 124개 검색 · 카테고리 · 발음 듣기 · 단어 퀴즈
import { words, wordCats, recordAnswer, teacherLine } from "../store.js";
import { speak } from "../speech.js";
import { esc, toast } from "../ui.js";
import { nav } from "./nav.js";

const QUIZ_SIZE = 10;

let mode = "list"; // list | quiz | done
let query = "";
let cat = "전체";
let questions = [];
let qi = 0;
let picked = null;
let score = 0;

export function render(root) {
  mode = "list";
  query = "";
  cat = "전체";
  questions = [];
  qi = 0;
  picked = null;
  score = 0;
  paint(root);
}

function paint(root) {
  if (mode === "quiz") return paintQuiz(root);
  if (mode === "done") return paintDone(root);
  return paintList(root);
}

function chip(name, count) {
  return (
    '<button class="chip' + (name === cat ? " on" : "") + '" data-cat="' + esc(name) + '">' +
    esc(name) + ' <em>' + count + "</em></button>"
  );
}

function paintList(root) {
  const cats = wordCats();

  root.innerHTML =
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/" aria-label="홈">✕</a>' +
    "</div></header>" +
    '<main class="shell">' +
    '<section class="hello"><h1>단어장</h1>' +
    '<p class="teacher-line">' + words().length + "개 단어 · 검색하거나 골라서 들어보세요</p></section>" +
    '<input id="q" class="input" type="search" inputmode="search" autocomplete="off" ' +
    'autocapitalize="off" autocorrect="off" spellcheck="false" ' +
    'placeholder="일본어 · 발음 · 뜻 검색" value="' + esc(query) + '" />' +
    '<div class="chips" id="cats">' + chip("전체", words().length) +
    cats.map(function (item) {
      return chip(item.name, item.count);
    }).join("") + "</div>" +
    '<div class="row-between" style="margin:14px 2px 10px">' +
    '<span class="muted small" id="wcount"></span>' +
    '<button class="btn ghost tiny" id="wquiz">단어 퀴즈 →</button>' +
    "</div>" +
    '<ul class="word-list" id="word-list"></ul>' +
    "</main>" +
    nav("");

  const list = root.querySelector("#word-list");
  list.addEventListener("click", function (event) {
    const button = event.target.closest("[data-say]");
    if (!button) return;
    speak(button.getAttribute("data-say"));
  });

  const input = root.querySelector("#q");
  input.addEventListener("input", function () {
    query = input.value;
    fillList(root);
  });

  root.querySelectorAll("[data-cat]").forEach(function (button) {
    button.addEventListener("click", function () {
      cat = button.getAttribute("data-cat");
      root.querySelectorAll("[data-cat]").forEach(function (other) {
        other.classList.toggle("on", other.getAttribute("data-cat") === cat);
      });
      fillList(root);
    });
  });

  root.querySelector("#wquiz").addEventListener("click", function () {
    startQuiz(root);
  });

  fillList(root);
}

function filtered() {
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  return words().filter(function (word) {
    if (cat !== "전체" && word.cat !== cat) return false;
    if (!needle) return true;
    const haystack = [word.ja, word.kana, word.pron, word.ko]
      .join("")
      .toLowerCase()
      .replace(/\s+/g, "");
    return haystack.indexOf(needle) >= 0;
  });
}

function fillList(root) {
  const items = filtered();
  const list = root.querySelector("#word-list");
  const count = root.querySelector("#wcount");
  count.textContent = items.length + "개";

  if (!items.length) {
    list.innerHTML =
      '<li class="empty" style="list-style:none">찾는 단어가 없어요.<br />다른 말로 검색해보세요.</li>';
    return;
  }

  list.innerHTML = items.map(function (word) {
    return (
      '<li class="word-item">' +
      '<div class="word-text">' +
      '<div class="word-top">' +
      '<span class="word-ja" lang="ja">' + esc(word.ja) + "</span>" +
      (cat === "전체" ? '<span class="word-cat">' + esc(word.cat) + "</span>" : "") +
      "</div>" +
      '<div class="word-sub">' + esc(word.pron) + " · " + esc(word.ko) + "</div>" +
      "</div>" +
      '<button class="icon-btn" data-say="' + esc(word.ja) + '" aria-label="발음 듣기">🔊</button>' +
      "</li>"
    );
  }).join("");
}

// ------------------------------------------------------------ 단어 퀴즈

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function makeQuestion(word) {
  const pool = words().filter(function (item) {
    return item.ja !== word.ja && item.ko !== word.ko;
  });
  const options = [];
  while (options.length < 3 && pool.length) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (options.indexOf(candidate.ja) < 0) options.push(candidate.ja);
  }
  const all = shuffle(options.concat([word.ja]));
  return { word: word, options: all, answer: all.indexOf(word.ja) };
}

function startQuiz(root) {
  const pool = filtered();
  if (pool.length < 4) {
    toast("단어가 4개 이상 있어야 퀴즈를 낼 수 있어요.");
    return;
  }
  questions = shuffle(pool)
    .slice(0, Math.min(QUIZ_SIZE, pool.length))
    .map(makeQuestion);
  qi = 0;
  picked = null;
  score = 0;
  mode = "quiz";
  paint(root);
}

function paintQuiz(root) {
  const question = questions[qi];
  if (!question) {
    mode = "done";
    paint(root);
    return;
  }

  const showFeedback = picked !== null;
  const isCorrect = showFeedback && picked === question.answer;
  const word = question.word;

  const options = question.options.map(function (ja, i) {
    let cls = "opt sentence";
    if (showFeedback) {
      if (i === question.answer) cls += " correct";
      else if (i === picked) cls += " wrong";
    }
    return (
      '<button class="' + cls + '" data-option="' + i + '">' +
      '<span class="num">' + (i + 1) + "</span>" +
      '<span lang="ja">' + esc(ja) + "</span></button>"
    );
  }).join("");

  let feedbackText = "이 뜻에 맞는 일본어를 골라주세요.";
  if (showFeedback) {
    const line = isCorrect
      ? teacherLine("praise")
      : teacherLine("oops", { answer: word.ja });
    feedbackText =
      line + "\n「" + word.ja + "」 " + word.pron + "\n" + word.ko;
  }

  root.innerHTML =
    '<div class="player">' +
    '<div class="player-head">' +
    '<button class="back" id="quit" aria-label="나가기">←</button>' +
    '<div class="head-mid">' +
    '<div class="count">단어 퀴즈 ' + (qi + 1) + " / " + questions.length + "</div>" +
    '<div class="progress thin"><i style="width:' +
    Math.round(((qi + 1) / questions.length) * 100) + '%"></i></div>' +
    "</div></div>" +
    '<div class="player-body quiz-body">' +
    '<div class="quiz">' +
    '<p class="q-label">이 뜻에 맞는 일본어는?</p>' +
    '<div class="q-ko">' + esc(word.ko) + "</div>" +
    '<div class="options stack">' + options + "</div>" +
    '<div class="feedback">' + esc(feedbackText) + "</div>" +
    "</div></div>" +
    '<div class="player-nav">' +
    '<button class="btn ghost" id="quit2">그만하기</button>' +
    '<button class="btn primary" id="next"' + (showFeedback ? "" : " disabled") + ">" +
    (qi >= questions.length - 1 ? "결과 보기" : "다음 문제 →") +
    "</button></div>" +
    "</div>";

  root.querySelectorAll("[data-option]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (picked !== null) return;
      picked = parseInt(button.getAttribute("data-option"), 10);
      const correct = picked === question.answer;
      if (correct) score += 1;
      recordAnswer(correct);
      paint(root);
      speak(word.ja);
    });
  });

  function quit() {
    mode = "list";
    paint(root);
  }
  root.querySelector("#quit").addEventListener("click", quit);
  root.querySelector("#quit2").addEventListener("click", quit);

  root.querySelector("#next").addEventListener("click", function () {
    if (picked === null) return;
    if (qi >= questions.length - 1) {
      mode = "done";
      paint(root);
      return;
    }
    qi += 1;
    picked = null;
    paint(root);
  });
}

function paintDone(root) {
  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  root.innerHTML =
    '<div class="result">' +
    '<div class="burst">' + (percent >= 70 ? "🎉" : "🌱") + "</div>" +
    "<h1>단어 퀴즈 완료!</h1>" +
    '<p class="can-do">' + total + "문제 중 " + score + "문제를 맞혔어요.</p>" +
    '<div class="score-row">' +
    "<div><b>" + score + "/" + total + "</b><span>정답</span></div>" +
    "<div><b>" + percent + "%</b><span>정답률</span></div>" +
    "<div><b>" + words().length + "</b><span>전체 단어</span></div>" +
    "</div>" +
    '<p class="teacher-line">' + esc(teacherLine("encourage")) + "</p>" +
    '<div class="btn-row" style="flex-direction:column">' +
    '<button class="btn primary block" id="again">한 번 더</button>' +
    '<button class="btn ghost block" id="back">단어장으로</button>' +
    "</div>" +
    nav("") +
    "</div>";

  root.querySelector("#again").addEventListener("click", function () {
    mode = "list";
    paint(root);
    startQuiz(root);
  });

  root.querySelector("#back").addEventListener("click", function () {
    mode = "list";
    paint(root);
  });
}
