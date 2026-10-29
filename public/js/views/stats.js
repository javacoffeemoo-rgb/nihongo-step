// 학습 통계: 연속일 · 완료 과 · 정답률 · 최근 7일 · 단계별 진도
import {
  state,
  statsSummary,
  weekActivity,
  levels,
  levelStats,
  mistakes,
  teacherLine,
} from "../store.js";
import { esc, percent } from "../ui.js";
import { nav } from "./nav.js";

function minutesText(minutes) {
  if (!minutes) return "0분";
  if (minutes < 60) return minutes + "분";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + "시간 " + rest + "분" : hours + "시간";
}

export function render(root) {
  const summary = statsSummary();
  const week = weekActivity();
  const max = Math.max(1, week.reduce(function (acc, day) {
    return Math.max(acc, day.count);
  }, 0));
  const weekTotal = week.reduce(function (acc, day) {
    return acc + day.count;
  }, 0);

  const bars = week.map(function (day) {
    const height = day.count ? Math.max(10, Math.round((day.count / max) * 100)) : 0;
    return (
      '<div class="bar-col' + (day.today ? " today" : "") + '">' +
      '<span class="bar-value">' + (day.count || "") + "</span>" +
      '<div class="bar-track"><i style="height:' + height + '%"></i></div>' +
      '<span class="bar-day">' + day.label + "</span>" +
      "</div>"
    );
  }).join("");

  const levelRows = levels().map(function (level) {
    const stats = levelStats(level);
    return (
      '<li class="stat-level">' +
      '<span class="lv-emoji">' + esc(level.emoji) + "</span>" +
      '<div class="stat-level-mid">' +
      '<div class="row-between"><span class="stat-level-name">' + esc(level.title) + "</span>" +
      '<span class="muted small">' + stats.done + " / " + stats.total + "</span></div>" +
      '<div class="progress thin"><i style="width:' + percent(stats.done, stats.total) + '%"></i></div>' +
      "</div></li>"
    );
  }).join("");

  const reviewCount = mistakes().length;

  const emptyWeek = weekTotal === 0
    ? '<p class="muted small" style="margin-top:10px">최근 7일 동안 완료한 과가 없어요. 1과를 끝내면 여기에 막대가 쌓여요.</p>'
    : '<p class="muted small" style="margin-top:10px">최근 7일 동안 ' + weekTotal + "과를 완료했어요.</p>";

  root.innerHTML =
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/" aria-label="홈">✕</a>' +
    "</div></header>" +
    '<main class="shell">' +
    '<section class="hello"><h1>학습 통계</h1>' +
    '<p class="teacher-line">' + esc(state.user) + "님의 기록이에요</p></section>" +

    '<div class="stat-grid">' +
    '<div class="stat-card"><b>🔥 ' + summary.streak + '</b><span>연속 학습일</span></div>' +
    '<div class="stat-card"><b>' + summary.done + " / " + summary.total + '</b><span>완료한 과</span></div>' +
    '<div class="stat-card"><b>' + (summary.rate === null ? "—" : summary.rate + "%") +
    '</b><span>퀴즈 정답률</span></div>' +
    '<div class="stat-card"><b>' + minutesText(summary.minutes) + '</b><span>학습 시간</span></div>' +
    "</div>" +

    '<div class="section-title"><h2>최근 7일</h2><span class="muted">완료한 과</span></div>' +
    '<section class="card">' +
    '<div class="bars">' + bars + "</div>" +
    emptyWeek +
    "</section>" +

    '<div class="section-title"><h2>단계별 진도</h2><span class="muted">' +
    summary.done + " / " + summary.total + "과</span></div>" +
    '<section class="card"><ul class="stat-levels">' + levelRows + "</ul></section>" +

    '<div class="section-title"><h2>복습</h2></div>' +
    '<section class="card">' +
    '<div class="row-between">' +
    '<div><b style="font-size:15px">복습할 문장 ' + reviewCount + "개</b>" +
    '<p class="muted small" style="margin-top:4px">맞히면 목록에서 하나씩 사라져요.</p></div>' +
    '<a class="btn ghost tiny" href="#/review">복습하기</a>' +
    "</div></section>" +

    '<p class="muted center" style="margin-top:20px">' +
    esc(teacherLine("encourage")) + "</p>" +
    "</main>" +
    nav("");
}
