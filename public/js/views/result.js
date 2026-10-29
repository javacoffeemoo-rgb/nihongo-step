// 과 결과
import {
  state,
  lessonById,
  levelOfLesson,
  lessonScore,
  lessonAfter,
  scenarioById,
  teacherLine,
  completedCount,
  totalLessons,
  mistakes,
} from "../store.js";
import { esc } from "../ui.js";
import { nav } from "./nav.js";

export function render(root, params) {
  const lesson = lessonById(params.lessonId);
  if (!lesson) {
    root.innerHTML = empty("과를 찾지 못했어요.");
    return;
  }

  const entry = lessonScore(lesson.id);
  if (!entry || !entry.done) {
    location.replace("#/lesson/" + lesson.id);
    return;
  }

  const level = levelOfLesson(lesson.id);
  const next = lessonAfter(lesson.id);
  const isKana = lesson.type === "kana";
  const quizTotal = entry.total || 0;
  const correct = entry.correct || 0;
  const streak = (state.progress.streak && state.progress.streak.days) || 0;
  const scenario = isKana ? null : scenarioById(lesson.scenario);
  const stepTotal = scenario ? scenario.steps.length : 0;
  const wrongHere = mistakes().filter(function (item) {
    return item.lessonId === lesson.id;
  }).length;

  const stats = isKana
    ? "<div><b>" + correct + "/" + quizTotal + "</b><span>읽기 퀴즈</span></div>" +
      "<div><b>" + quizTotal + "</b><span>문제</span></div>" +
      "<div><b>" + streak + "</b><span>연속일</span></div>"
    : "<div><b>" + stepTotal + "</b><span>문장</span></div>" +
      "<div><b>" + correct + "/" + quizTotal + "</b><span>확인 퀴즈</span></div>" +
      "<div><b>" + streak + "</b><span>연속일</span></div>";

  const finishLine = teacherLine("finish", { title: lesson.title, count: stepTotal || quizTotal });
  const shownLine = isKana ? finishLine.replace("문장", "문제") : finishLine;

  const nextButton = next
    ? '<a class="btn primary block" href="#/lesson/' + esc(next.id) + '">다음 과: ' + esc(next.title) + " →</a>"
    : '<a class="btn primary block" href="#/learn">커리큘럼으로</a>';

  const wrongRow = wrongHere
    ? '<a class="btn soft block" href="#/review">틀린 문장 ' + wrongHere + "개 복습하기</a>"
    : "";

  root.innerHTML =
    '<div class="result">' +
    '<div class="burst">🎉</div>' +
    "<h1>" + esc(lesson.title) + " 완료!</h1>" +
    '<p class="can-do">' + esc(lesson.can_do || "") + "</p>" +
    (level
      ? '<p class="muted small" style="margin-top:6px">' +
        esc(level.emoji + " " + level.title) + " · " + esc(level.subtitle) + "</p>"
      : "") +
    '<div class="score-row">' + stats + "</div>" +
    '<p class="teacher-line">' + esc(shownLine) + "</p>" +
    '<div class="btn-row" style="flex-direction:column">' +
    nextButton +
    wrongRow +
    '<div style="display:flex;gap:8px;width:100%">' +
    '<a class="btn ghost block" href="#/lesson/' + esc(lesson.id) + '">다시 학습</a>' +
    '<a class="btn ghost block" href="#/">홈으로</a>' +
    "</div></div>" +
    '<p class="muted small" style="margin-top:20px">' +
    completedCount() + " / " + totalLessons() + "과 완료" +
    "</p>" +
    nav("home") +
    "</div>";
}

function empty(message) {
  return (
    '<main class="shell"><div class="card empty">' + esc(message) +
    '<div class="btn-row"><a class="btn block" href="#/learn">커리큘럼으로</a></div>' +
    "</div></main>"
  );
}
