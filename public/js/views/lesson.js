// 학습 플레이어: 회화(문장 + 확인 퀴즈) / 가나(표 + 읽기 퀴즈)
import {
  state,
  lessonById,
  levelOfLesson,
  scenarioById,
  kanaLessonByContentId,
  readings,
  allSteps,
  QUIZ_COUNT,
  isDone,
  positionOf,
  setPosition,
  markDone,
  recordAnswer,
  addMinutes,
  persistNow,
  subscribe,
  teacherLine,
} from "../store.js";
import {
  speak,
  stopSpeaking,
  stopBlob,
  recordingSupported,
  record,
  playBlob,
  hasJapaneseVoice,
  ttsSupported,
  savedRate,
  saveRate,
} from "../speech.js";
import { esc, toast } from "../ui.js";

export function render(root, params) {
  const lesson = lessonById(params.lessonId);
  if (!lesson) {
    root.innerHTML = notFound("과를 찾지 못했어요.");
    return null;
  }
  return lesson.type === "kana" ? playKana(root, lesson) : playScenario(root, lesson);
}

function notFound(message) {
  return (
    '<main class="shell"><div class="card empty">' +
    esc(message || "찾을 수 없어요.") +
    '<div class="btn-row"><a class="btn block" href="#/learn">커리큘럼으로</a></div>' +
    "</div></main>"
  );
}

function startIndexFor(lesson, total) {
  if (isDone(lesson.id)) return 0;
  const saved = positionOf(lesson.id);
  return Math.max(0, Math.min(saved, total - 1));
}

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

function head(index, total, exitHref, label) {
  return (
    '<div class="player-head">' +
    '<a class="back" href="' + esc(exitHref) + '" aria-label="나가기">←</a>' +
    '<div class="head-mid">' +
    '<div class="count">' + esc(label) + "</div>" +
    '<div class="progress thin"><i style="width:' +
    Math.round(((index + 1) / total) * 100) + '%"></i></div>' +
    "</div></div>"
  );
}

function speedSelect(rate) {
  function opt(value, label) {
    return '<option value="' + value + '"' + (String(rate) === String(value) ? " selected" : "") +
      ">" + label + "</option>";
  }
  return (
    '<label class="speed">속도 ' +
    '<select id="rate">' + opt("0.6", "느리게") + opt("0.8", "보통") + opt("1", "빠르게") + "</select>" +
    "</label>"
  );
}

function saveDot() {
  return '<span id="save-dot" class="save-dot">' +
    (state.saveState === "error" ? "저장 안 됨" : "저장됨") + "</span>";
}

function watchSaveState(root) {
  return subscribe(function (s) {
    const el = root.querySelector("#save-dot");
    if (!el) return;
    el.className = "save-dot" + (s.saveState === "error" ? " err" : "");
    el.textContent =
      s.saveState === "error" ? "저장 안 됨" : s.saveState === "saving" ? "저장 중…" : "저장됨";
  });
}

// ============================================================ 회화 과

function playScenario(root, lesson) {
  const scenario = scenarioById(lesson.scenario);
  if (!scenario) {
    root.innerHTML = notFound("상황을 찾지 못했어요.");
    return null;
  }

  const level = levelOfLesson(lesson.id);
  const steps = scenario.steps;
  const stepTotal = steps.length;
  const quizTotal = Math.min(QUIZ_COUNT, stepTotal);
  const total = stepTotal + quizTotal;
  const exitHref = level ? "#/learn/" + level.id : "#/learn";

  let index = startIndexFor(lesson, total);
  let rate = savedRate();
  let recording = false;
  let clip = null;
  let openedAt = Date.now();
  let keyHandler = null;
  let score = 0;
  let picked = null;
  const cache = {};

  if (index > 0) {
    setTimeout(function () {
      toast(index < stepTotal ? index + 1 + "번째 문장부터 이어서 할게요." : "확인 퀴즈부터 이어서 할게요.");
    }, 300);
  }

  const voiceMissing = ttsSupported() && !hasJapaneseVoice();
  const canRecord = recordingSupported();

  function questionAt(k) {
    if (!cache[k]) cache[k] = makeQuestion(k);
    return cache[k];
  }

  function makeQuestion(k) {
    const target = steps[k];
    const pool = allSteps().filter(function (item) {
      return item.ja !== target.ja && item.ko !== target.ko;
    });
    const options = [];
    while (options.length < 3 && pool.length) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (options.indexOf(candidate.ja) < 0) options.push(candidate.ja);
    }
    const all = shuffle(options.concat([target.ja]));
    return {
      prompt: target.ko,
      target: target.ja,
      options: all,
      answer: all.indexOf(target.ja),
      step: target,
    };
  }

  function paint() {
    if (index < stepTotal) paintStep();
    else paintQuiz();
  }

  // ---------------------------------------------------------- 문장 화면

  function paintStep() {
    const step = steps[index];

    root.innerHTML =
      '<div class="player">' +
      head(index, total, exitHref, "문장 " + (index + 1) + " / " + stepTotal) +
      '<div class="player-body">' +
      '<div class="jp" lang="ja">' + esc(step.ja) + "</div>" +
      '<div class="pron">' + esc(step.pron) + "</div>" +
      '<div class="ko">' + esc(step.ko) + "</div>" +
      (step.tip ? '<div class="tip">💡 ' + esc(step.tip) + "</div>" : "") +
      (voiceMissing
        ? '<div class="warn">이 브라우저에 일본어 음성이 없어요. 한글 발음을 보고 따라 해보세요.</div>'
        : "") +
      "</div>" +
      '<div class="player-actions">' +
      '<button class="btn ghost" id="speak">🔊 듣기</button>' +
      (canRecord ? '<button class="btn ghost" id="record">🎤 3초 녹음</button>' : "") +
      '<button class="btn ghost" id="mine"' + (clip ? "" : " hidden") + ">▶ 내 목소리</button>" +
      "</div>" +
      '<div class="player-nav">' +
      '<button class="btn ghost" id="prev"' + (index === 0 ? " disabled" : "") + ">← 이전</button>" +
      '<button class="btn primary" id="next">' + (index === stepTotal - 1 ? "확인 퀴즈 →" : "다음 →") + "</button>" +
      "</div>" +
      '<div class="player-foot">' + speedSelect(rate) + saveDot() + "</div>" +
      "</div>";

    const speakButton = root.querySelector("#speak");
    speakButton.addEventListener("click", function () {
      if (!ttsSupported()) {
        toast("이 브라우저는 음성 재생을 지원하지 않아요.");
        return;
      }
      speak(steps[index].ja, rate);
    });

    const recordButton = root.querySelector("#record");
    if (recordButton) {
      recordButton.addEventListener("click", async function () {
        if (recording) return;
        recording = true;
        recordButton.classList.add("rec-on");
        recordButton.textContent = "● 3";
        try {
          clip = await record(3000, function (left) {
            recordButton.textContent = "● " + left;
          });
          recordButton.classList.remove("rec-on");
          recordButton.textContent = "🎤 다시 녹음";
          const mine = root.querySelector("#mine");
          if (mine) mine.hidden = false;
          toast("녹음 완료! 내 목소리와 원어를 번갈아 들어보세요.");
        } catch (error) {
          recordButton.classList.remove("rec-on");
          recordButton.textContent = "🎤 3초 녹음";
          toast(error.message || "녹음 권한을 허용해주세요.");
        }
        recording = false;
      });
    }

    const mineButton = root.querySelector("#mine");
    if (mineButton) {
      mineButton.addEventListener("click", function () {
        if (clip) playBlob(clip);
      });
    }

    root.querySelector("#prev").addEventListener("click", function () {
      if (index === 0) return;
      moveTo(index - 1);
    });

    root.querySelector("#next").addEventListener("click", function () {
      if (index >= total - 1) {
        finish();
        return;
      }
      moveTo(index + 1);
    });

    root.querySelector("#rate").addEventListener("change", function (event) {
      rate = parseFloat(event.target.value);
      saveRate(rate);
    });
  }

  // ---------------------------------------------------------- 확인 퀴즈

  function paintQuiz() {
    const number = index - stepTotal;
    const question = questionAt(number);
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
          "<span class=\"num\">" + (i + 1) + "</span>" +
          '<span lang="ja">' + esc(ja) + "</span></button>"
        );
      })
      .join("");

    let feedbackText = "이 뜻에 맞는 일본어를 골라주세요.";
    if (showFeedback) {
      const line = isCorrect
        ? teacherLine("praise")
        : teacherLine("oops", { answer: question.target });
      feedbackText =
        line + "\n「" + question.target + "」 " + question.step.pron +
        "\n" + question.step.ko;
    }

    root.innerHTML =
      '<div class="player">' +
      head(index, total, exitHref, "퀴즈 " + (number + 1) + " / " + quizTotal) +
      '<div class="player-body quiz-body">' +
      '<div class="quiz">' +
      '<p class="q-label">이 뜻에 맞는 일본어는?</p>' +
      '<div class="q-ko">' + esc(question.prompt) + "</div>" +
      '<div class="options stack">' + options + "</div>" +
      '<div class="feedback">' + esc(feedbackText) + "</div>" +
      "</div></div>" +
      '<div class="player-nav">' +
      '<button class="btn ghost" id="prev">← 이전</button>' +
      '<button class="btn primary" id="next"' + (showFeedback ? "" : " disabled") + ">" +
      (number >= quizTotal - 1 ? "결과 보기" : "다음 문제 →") +
      "</button></div>" +
      '<div class="player-foot">' + speedSelect(rate) + saveDot() + "</div>" +
      "</div>";

    root.querySelectorAll("[data-option]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (picked !== null) return;
        picked = parseInt(button.getAttribute("data-option"), 10);
        const correct = picked === question.answer;
        if (correct) score += 1;
        recordAnswer(correct, {
          lessonId: lesson.id,
          unit: index,
          ja: question.step.ja,
          ko: question.step.ko,
        });
        paint();
      });
    });

    root.querySelector("#prev").addEventListener("click", function () {
      if (index === 0) return;
      moveTo(index - 1);
    });

    root.querySelector("#next").addEventListener("click", function () {
      if (picked === null) return;
      if (number >= quizTotal - 1) {
        finish();
        return;
      }
      moveTo(index + 1);
    });

    root.querySelector("#rate").addEventListener("change", function (event) {
      rate = parseFloat(event.target.value);
      saveRate(rate);
    });
  }

  function moveTo(next) {
    const wasQuiz = index >= stepTotal;
    index = next;
    picked = null;
    clip = null;
    stopSpeaking();
    stopBlob();
    setPosition(lesson.id, index);
    if (!wasQuiz && index >= stepTotal) {
      toast("문장은 다 봤어요. 확인 퀴즈로 갈게요!");
    }
    paint();
  }

  async function finish() {
    const minutes = Math.max(1, Math.round((Date.now() - openedAt) / 60000));
    addMinutes(minutes);
    markDone(lesson.id, { correct: score, total: quizTotal });
    await persistNow();
    location.hash = "#/lesson/" + lesson.id + "/result";
  }

  const unsubscribe = watchSaveState(root);

  keyHandler = function (event) {
    const tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (event.key >= "1" && event.key <= "4" && index >= stepTotal && picked === null) {
      const optionButton = root.querySelector('[data-option="' + (parseInt(event.key, 10) - 1) + '"]');
      if (optionButton) optionButton.click();
      return;
    }
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      const nextButton = root.querySelector("#next");
      if (nextButton && !nextButton.disabled) nextButton.click();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (index > 0) moveTo(index - 1);
    } else if (event.key.toLowerCase() === "r") {
      if (index < stepTotal) speak(steps[index].ja, rate);
    }
  };
  window.addEventListener("keydown", keyHandler);

  paint();

  return function cleanup() {
    unsubscribe();
    window.removeEventListener("keydown", keyHandler);
    stopSpeaking();
    stopBlob();
  };
}

// ============================================================ 가나 과

function playKana(root, lesson) {
  const kana = kanaLessonByContentId(lesson.content);
  if (!kana) {
    root.innerHTML = notFound("가나 데이터를 찾지 못했어요.");
    return null;
  }

  const level = levelOfLesson(lesson.id);
  const exitHref = level ? "#/learn/" + level.id : "#/learn";
  const read = readings();
  const groups = kana.groups;
  const total = groups.length + QUIZ_COUNT;

  const chars = [];
  groups.forEach(function (group) {
    group.rows.forEach(function (row) {
      row.forEach(function (char) {
        chars.push(char);
      });
    });
  });

  let index = startIndexFor(lesson, total);
  let rate = savedRate();
  let score = 0;
  let picked = null;
  let openedAt = Date.now();
  let keyHandler = null;
  const cache = {};

  if (index > 0) {
    setTimeout(function () {
      toast(index < groups.length ? "이어서 할게요." : "읽기 퀴즈부터 이어서 할게요.");
    }, 300);
  }

  function questionAt(i) {
    if (!cache[i]) cache[i] = makeQuestion();
    return cache[i];
  }

  function makeQuestion() {
    const target = chars[Math.floor(Math.random() * chars.length)];
    const targetKo = read[target].ko;
    const pool = chars.filter(function (char) {
      return read[char].ko !== targetKo;
    });
    const options = [];
    while (options.length < 3 && pool.length) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (options.indexOf(candidate) < 0) options.push(candidate);
    }
    const all = shuffle(options.concat([target]));
    return { target: target, options: all, answer: all.indexOf(target) };
  }

  function paint() {
    if (index < groups.length) paintGuide(groups[index]);
    else paintQuiz(index - groups.length);
  }

  function paintGuide(group) {
    const rows = group.rows
      .map(function (row) {
        const cells = row
          .map(function (char) {
            const info = read[char] || { ko: "" };
            return (
              '<button class="kana" data-kana="' + esc(char) + '">' +
              '<span class="k">' + esc(char) + "</span>" +
              '<span class="r">' + esc(info.ko) + "</span></button>"
            );
          })
          .join("");
        return '<div class="kana-row' + (row.length < 5 ? " short" : "") + '">' + cells + "</div>";
      })
      .join("");

    const isLastGroup = index === groups.length - 1;

    root.innerHTML =
      '<div class="player">' +
      head(index, total, exitHref, "가나 " + (index + 1) + " / " + groups.length) +
      '<div class="player-body">' +
      '<div class="kana-card">' +
      "<h3>" + esc(group.label) + "</h3>" +
      '<div class="kana-grid">' + rows + "</div>" +
      "</div>" +
      (index === 0 ? '<div class="tip">💡 ' + esc(kana.tip) + "</div>" : "") +
      "</div>" +
      '<div class="player-nav">' +
      '<button class="btn ghost" id="prev"' + (index === 0 ? " disabled" : "") + ">← 이전</button>" +
      '<button class="btn primary" id="next">' + (isLastGroup ? "읽기 퀴즈 시작" : "다음 →") + "</button>" +
      "</div>" +
      '<div class="player-foot">' + speedSelect(rate) + saveDot() + "</div>" +
      "</div>";

    root.querySelectorAll("[data-kana]").forEach(function (button) {
      button.addEventListener("click", function () {
        speak(button.getAttribute("data-kana"), rate);
      });
    });

    root.querySelector("#prev").addEventListener("click", function () {
      if (index === 0) return;
      moveTo(index - 1);
    });

    root.querySelector("#next").addEventListener("click", function () {
      moveTo(index + 1);
    });

    root.querySelector("#rate").addEventListener("change", function (event) {
      rate = parseFloat(event.target.value);
      saveRate(rate);
    });
  }

  function paintQuiz(number) {
    const question = questionAt(index);
    const showFeedback = picked !== null;
    const isCorrect = showFeedback && picked === question.answer;

    const options = question.options
      .map(function (char, i) {
        let cls = "opt";
        if (showFeedback) {
          if (i === question.answer) cls += " correct";
          else if (i === picked) cls += " wrong";
        }
        return (
          '<button class="' + cls + '" data-option="' + i + '">' +
          (i + 1) + ". " + esc(read[char].ko) + "</button>"
        );
      })
      .join("");

    const feedback = showFeedback
      ? (isCorrect ? "⭕ 정답이에요! " : "❌ 정답은 " + (question.answer + 1) + "번이에요. ") +
        "「" + question.target + "」는 「" + read[question.target].ko +
        "」(" + read[question.target].romaji + ")로 읽어요."
      : "발음을 골라주세요.";

    root.innerHTML =
      '<div class="player">' +
      head(index, total, exitHref, "퀴즈 " + (number + 1) + " / " + QUIZ_COUNT) +
      '<div class="player-body">' +
      '<div class="quiz">' +
      '<p class="q-label">이 글자의 발음은?</p>' +
      '<div class="q-char" lang="ja">' + esc(question.target) + "</div>" +
      '<div class="options">' + options + "</div>" +
      '<div class="feedback">' + esc(feedback) + "</div>" +
      "</div></div>" +
      '<div class="player-nav">' +
      '<button class="btn ghost" id="prev">← 이전</button>' +
      '<button class="btn primary" id="next"' + (showFeedback ? "" : " disabled") + ">" +
      (number >= QUIZ_COUNT - 1 ? "결과 보기" : "다음 문제 →") +
      "</button></div>" +
      '<div class="player-foot">' + speedSelect(rate) + saveDot() + "</div>" +
      "</div>";

    root.querySelectorAll("[data-option]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (picked !== null) return;
        picked = parseInt(button.getAttribute("data-option"), 10);
        const correct = picked === question.answer;
        if (correct) score += 1;
        recordAnswer(correct, {
          lessonId: lesson.id,
          unit: index,
          ja: question.target,
        });
        paint();
      });
    });

    root.querySelector("#prev").addEventListener("click", function () {
      if (index === 0) return;
      moveTo(index - 1);
    });

    root.querySelector("#next").addEventListener("click", function () {
      if (picked === null) return;
      if (number >= QUIZ_COUNT - 1) {
        finish();
        return;
      }
      moveTo(index + 1);
    });

    root.querySelector("#rate").addEventListener("change", function (event) {
      rate = parseFloat(event.target.value);
      saveRate(rate);
    });
  }

  function moveTo(next) {
    index = next;
    picked = null;
    stopSpeaking();
    setPosition(lesson.id, index);
    paint();
  }

  async function finish() {
    const minutes = Math.max(1, Math.round((Date.now() - openedAt) / 60000));
    addMinutes(minutes);
    markDone(lesson.id, { correct: score, total: QUIZ_COUNT });
    await persistNow();
    location.hash = "#/lesson/" + lesson.id + "/result";
  }

  const unsubscribe = watchSaveState(root);

  keyHandler = function (event) {
    const tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (event.key >= "1" && event.key <= "4" && index >= groups.length && picked === null) {
      const optionButton = root.querySelector('[data-option="' + (parseInt(event.key, 10) - 1) + '"]');
      if (optionButton) optionButton.click();
    } else if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      const nextButton = root.querySelector("#next");
      if (nextButton && !nextButton.disabled) nextButton.click();
    } else if (event.key === "ArrowLeft") {
      if (index > 0) moveTo(index - 1);
    }
  };
  window.addEventListener("keydown", keyHandler);

  paint();

  return function cleanup() {
    unsubscribe();
    window.removeEventListener("keydown", keyHandler);
    stopSpeaking();
    stopBlob();
  };
}
