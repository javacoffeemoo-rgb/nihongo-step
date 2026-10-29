// 복습: 틀린 문장 모아보기 + 다시 풀기
import {
  state,
  mistakes,
  findStepByJa,
  readings,
  allSteps,
  reviewAnswer,
  lessonById,
  teacherLine,
} from "../store.js";
import { esc, toast } from "../ui.js";
import { nav } from "./nav.js";

let mode = "list"; // list | quiz | done
let queue = [];
let questions = [];
let qIndex = 0;
let picked = null;
let score = 0;

export function render(root) {
  mode = "list";
  queue = [];
  questions = [];
  qIndex = 0;
  picked = null;
  score = 0;
  paint(root);
}

function paint(root) {
  if (mode === "quiz") return paintQuiz(root);
  if (mode === "done") return paintDone(root);
  paintList(root);
}

function readOf(char) {
  return readings()[char] || null;
}

function enrich(item) {
  const step = item.ja ? findStepByJa(item.ja) : null;
  const kana = !step && item.ja && item.ja.length <= 2 ? readOf(item.ja) : null;
  return {
    raw: item,
    step: step,
    kana: kana,
    ko: (step && step.ko) || item.ko || "",
    pron: (step && step.pron) || (kana && kana.ko) || "",
    lesson: lessonById(item.lessonId),
  };
}

function sentenceItems() {
  return mistakes()
    .map(enrich)
    .filter(function (item) {
      return !!item.step;
    });
}

function kanaItems() {
  return mistakes()
    .map(enrich)
    .filter(function (item) {
      return !item.step && !!item.kana;
    });
}

function header(title, sub) {
  return (
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/" aria-label="홈">✕</a>' +
    "</div></header>" +
    '<main class="shell">' +
    '<section class="hello"><h1>' + esc(title) + "</h1>" +
    '<p class="teacher-line">' + esc(sub) + "</p></section>"
  );
}

function paintList(root) {
  const sentences = sentenceItems();
  const kanas = kanaItems();
  const total = sentences.length + kanas.length;

  let body = "";
  if (!total) {
    body =
      '<div class="card empty" style="margin-top:20px">' +
      "아직 틀린 문장이 없어요 🌸<br />학습하다 틀린 문장이 여기에 모여요." +
      '<div class="btn-row"><a class="btn block" href="#/learn">커리큘럼 보기</a></div>' +
      "</div>";
  } else {
    body =
      (sentences.length
        ? '<button class="btn primary block" id="start" style="margin-top:18px">' +
          "틀린 문장 다시 풀기 (" + sentences.length + ")</button>"
        : "") +
      '<div class="section-title"><h2>문장 ' + sentences.length + "</h2>" +
      '<span class="muted">맞히면 목록에서 사라져요</span></div>' +
      (sentences.length
        ? '<ul class="lesson-list" style="margin-top:0">' + sentences.map(cardSentence).join("") + "</ul>"
        : '<div class="card empty">문장 오답은 없어요.</div>') +
      (kanas.length
        ? '<div class="section-title"><h2>가나 ' + kanas.length + "</h2></div>" +
          '<ul class="lesson-list" style="margin-top:0">' + kanas.map(cardKana).join("") + "</ul>"
        : "");
  }

  root.innerHTML = header("복습", "틀린 문장 " + total + "개 · 다시 풀어보세요") + body + "</main>" + nav("review");

  const startButton = root.querySelector("#start");
  if (startButton) {
    startButton.addEventListener("click", function () {
      startReview(root, sentences);
    });
  }
}

function cardSentence(item) {
  return (
    '<li class="lesson-item review">' +
    '<div class="top">' +
    '<span class="title" lang="ja">' + esc(item.raw.ja) + "</span>" +
    '<span class="status">' + (item.raw.count || 1) + "회</span>" +
    "</div>" +
    '<div class="can-do">' + esc(item.pron) + " · " + esc(item.ko) + "</div>" +
    '<div class="can-do">' +
    (item.lesson
      ? '<a class="muted small" href="#/lesson/' + esc(item.lesson.id) + '">' +
        esc(item.lesson.title) + " 다시 학습 →</a>"
      : "") +
    "</div></li>"
  );
}

function cardKana(item) {
  return (
    '<li class="lesson-item review">' +
    '<div class="top">' +
    '<span class="title" lang="ja">' + esc(item.raw.ja) + "</span>" +
    '<span class="status">' + (item.raw.count || 1) + "회</span>" +
    "</div>" +
    '<div class="can-do">' + esc(item.pron) + (item.kana ? " (" + esc(item.kana.romaji) + ")" : "") + "</div>" +
    "</li>"
  );
}

// ------------------------------------------------------------ 다시 풀기

function buildQuestion(item) {
  const target = item.step;
  const pool = allSteps().filter(function (step) {
    return step.ja !== target.ja && step.ko !== target.ko;
  });
  const options = [];
  while (options.length < 3 && pool.length) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (options.indexOf(candidate.ja) < 0) options.push(candidate.ja);
  }
  const all = options.concat([target.ja]);
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = all[i];
    all[i] = all[j];
    all[j] = temp;
  }
  return {
    item: item,
    prompt: target.ko,
    target: target.ja,
    options: all,
    answer: all.indexOf(target.ja),
    step: target,
  };
}

function startReview(root, sentences) {
  if (!sentences.length) {
    toast("다시 풀 문장이 없어요.");
    return;
  }
  queue = sentences.slice(0, 10);
  questions = queue.map(buildQuestion);
  qIndex = 0;
  picked = null;
  score = 0;
  mode = "quiz";
  paint(root);
}

function paintQuiz(root) {
  const question = questions[qIndex];
  if (!question) {
    mode = "done";
    paint(root);
    return;
  }
  const showFeedback = picked !== null;
  const isCorrect = showFeedback && picked === question.answer;

  const options = question.options
    .map(function (ja, i) {
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
    })
    .join("");

  let feedbackText = "이 뜻에 맞는 일본어를 골라주세요.";
  if (showFeedback) {
    const line = isCorrect ? teacherLine("praise") : teacherLine("oops", { answer: question.target });
    feedbackText =
      line + "\n「" + question.target + "」 " + question.step.pron + "\n" + question.step.ko;
  }

  root.innerHTML =
    '<div class="player">' +
    '<div class="player-head">' +
    '<a class="back" href="#/review" aria-label="나가기">←</a>' +
    '<div class="head-mid">' +
    '<div class="count">복습 ' + (qIndex + 1) + " / " + questions.length + "</div>" +
    '<div class="progress thin"><i style="width:' +
    Math.round(((qIndex + 1) / questions.length) * 100) + '%"></i></div>' +
    "</div></div>" +
    '<div class="player-body quiz-body">' +
    '<div class="quiz">' +
    '<p class="q-label">틀린 문장 복습 · 이 뜻에 맞는 일본어는?</p>' +
    '<div class="q-ko">' + esc(question.prompt) + "</div>" +
    '<div class="options stack">' + options + "</div>" +
    '<div class="feedback">' + esc(feedbackText) + "</div>" +
    "</div></div>" +
    '<div class="player-nav">' +
    '<button class="btn ghost" id="quit">그만하기</button>' +
    '<button class="btn primary" id="next"' + (showFeedback ? "" : " disabled") + ">" +
    (qIndex >= questions.length - 1 ? "복습 마치기" : "다음 문제 →") +
    "</button></div>" +
    "</div>";

  root.querySelectorAll("[data-option]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (picked !== null) return;
      picked = parseInt(button.getAttribute("data-option"), 10);
      const correct = picked === question.answer;
      if (correct) score += 1;
      reviewAnswer(question.item.raw, correct);
      paint(root);
    });
  });

  const quit = root.querySelector("#quit");
  quit.addEventListener("click", function () {
    mode = "list";
    paint(root);
  });

  root.querySelector("#next").addEventListener("click", function () {
    if (picked === null) return;
    if (qIndex >= questions.length - 1) {
      mode = "done";
      paint(root);
      return;
    }
    qIndex += 1;
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
    "<h1>복습 완료!</h1>" +
    '<p class="can-do">' + total + "문제 중 " + score + "문제를 맞혔어요.</p>" +
    '<div class="score-row">' +
    "<div><b>" + score + "/" + total + "</b><span>정답</span></div>" +
    "<div><b>" + percent + "%</b><span>정답률</span></div>" +
    "<div><b>" + mistakes().length + "</b><span>남은 오답</span></div>" +
    "</div>" +
    '<p class="teacher-line">' + esc(teacherLine("encourage")) + "</p>" +
    '<div class="btn-row" style="flex-direction:column">' +
    '<button class="btn primary block" id="again">한 번 더 복습</button>' +
    '<a class="btn ghost block" href="#/">홈으로</a>' +
    "</div>" +
    nav("review") +
    "</div>";

  root.querySelector("#again").addEventListener("click", function () {
    const sentences = sentenceItems();
    if (!sentences.length) {
      toast("복습할 문장이 없어요. 잘했어요! 🎉");
      mode = "list";
      paint(root);
      return;
    }
    startReview(root, sentences);
  });
}
