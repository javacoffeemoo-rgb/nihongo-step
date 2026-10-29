// 대시보드: 오늘의 학습 + 전체 진도 + 복습 알림
import {
  state,
  levels,
  levelStats,
  nextLesson,
  isDone,
  levelOfLesson,
  stageLabel,
  positionOf,
  completedCount,
  totalLessons,
  teacher,
  teacherLine,
  mistakeCount,
  words,
} from "../store.js";
import { esc, percent } from "../ui.js";
import { nav, saveBadge } from "./nav.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "늦은 밤이네요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "안녕하세요";
  return "좋은 저녁이에요";
}

export function render(root) {
  const p = state.progress;
  const t = teacher();
  const next = nextLesson();
  const done = completedCount();
  const total = totalLessons();
  const streak = (p.streak && p.streak.days) || 0;

  let todayHtml = "";
  if (next) {
    const level = levelOfLesson(next.id);
    const stage = stageLabel(next);
    const started = positionOf(next.id) > 0;
    const label = started ? "이어서 학습" : "시작하기";

    todayHtml =
      '<section class="card today">' +
      '<div class="row-between"><span class="kicker">오늘의 학습</span>' +
      '<span class="pill">🔥 ' + streak + "일 연속</span></div>" +
      "<h2>" + esc(level ? level.emoji + " " + next.title : next.title) + "</h2>" +
      '<p class="muted meta">' + esc(level ? level.title : "") + " · " + esc(stage.text) + "</p>" +
      '<div class="progress"><i style="width:' + Math.round(stage.ratio * 100) + '%"></i></div>' +
      '<a class="btn primary block" href="#/lesson/' + esc(next.id) + '">' + label + " →</a>" +
      "</section>";
  } else {
    todayHtml =
      '<section class="card today">' +
      '<div class="row-between"><span class="kicker">오늘의 학습</span>' +
      '<span class="pill">🔥 ' + streak + "일 연속</span></div>" +
      "<h2>24과를 모두 끝냈어요! 🎉</h2>" +
      '<p class="muted meta">복습하고 싶은 과를 골라 다시 들어보세요.</p>' +
      '<a class="btn primary block" href="#/learn">커리큘럼 보기</a>' +
      "</section>";
  }

  const reviewCount = mistakeCount();
  const reviewHtml = reviewCount
    ? '<a class="card review-card" href="#/review">' +
      '<span class="rv-emoji">🔁</span>' +
      '<span class="rv-text"><b>복습할 문장 ' + reviewCount + "개</b>" +
      "<em>틀린 문장만 다시 풀어보세요</em></span>" +
      '<span class="rv-arrow">→</span></a>'
    : "";

  const quickHtml =
    '<div class="quick-grid">' +
    '<a class="card quick-tile" href="#/words">' +
    '<span class="qt-emoji">📖</span><b>단어장</b>' +
    "<em>" + words().length + "개 단어 · 검색</em></a>" +
    '<a class="card quick-tile" href="#/stats">' +
    '<span class="qt-emoji">📊</span><b>통계</b>' +
    "<em>연속일 · 정답률</em></a>" +
    "</div>";

  const levelRows = levels()
    .map(function (level) {
      const stats = levelStats(level);
      const marks = level.lessons
        .map(function (lesson) {
          return '<span class="' + (isDone(lesson.id) ? "done" : "") + '">' +
            (isDone(lesson.id) ? "●" : "○") + "</span>";
        })
        .join("");
      return (
        '<li><a class="level-link" href="#/learn/' + esc(level.id) + '">' +
        '<span class="lv-emoji">' + esc(level.emoji) + "</span>" +
        '<span class="lv-name">' + esc(level.title) +
        "<em>" + esc(level.subtitle) + " · " + stats.done + "/" + stats.total + "</em></span>" +
        '<span class="lv-dots">' + marks + "</span>" +
        "</a></li>"
      );
    })
    .join("");

  root.innerHTML =
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/settings" aria-label="설정">⚙️</a>' +
    "</div></header>" +
    '<main class="shell">' +
    '<section class="hello">' +
    "<h1>" + greeting() + ', <span class="wave">' + esc(p.user) + "님 👋</span></h1>" +
    '<p class="teacher-line">' +
    (t ? esc(t.emoji + " " + t.ko_name + " · " + t.tagline) : "") +
    "</p>" +
    "</section>" +
    todayHtml +
    reviewHtml +
    quickHtml +
    '<div class="section-title"><h2>전체 진도</h2><span class="muted">' +
    done + " / " + total + "과</span></div>" +
    '<section class="card">' +
    '<div class="progress"><i style="width:' + percent(done, total) + '%"></i></div>' +
    '<ul class="levels">' + levelRows + "</ul>" +
    "</section>" +
    '<p class="muted center" style="margin-top:20px">' +
    esc(teacherLine("encourage")) +
    "</p>" +
    "</main>" +
    nav("home");

  // 저장 상태 배지 (실패했을 때만 조용히 표시)
  if (state.saveState === "error") {
    root.insertAdjacentHTML(
      "beforeend",
      '<p class="muted center" style="margin:-12px 0 24px">' + saveBadge(state) + "</p>"
    );
  }
}
