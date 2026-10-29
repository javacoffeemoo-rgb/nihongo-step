// 커리큘럼: 6단계 24과
import { levels, levelById, isDone, levelStats, positionOf, unitsOf } from "../store.js";
import { esc, percent } from "../ui.js";
import { nav } from "./nav.js";

export function render(root, params) {
  if (params && params.levelId) return renderLevel(root, params.levelId);
  renderAll(root);
}

function header() {
  return (
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/settings" aria-label="설정">⚙️</a>' +
    "</div></header>"
  );
}

function renderAll(root) {
  const all = levels();
  const done = all.reduce(function (sum, level) {
    return sum + levelStats(level).done;
  }, 0);
  const total = all.reduce(function (sum, level) {
    return sum + level.lessons.length;
  }, 0);

  const cards = all
    .map(function (level) {
      const stats = levelStats(level);
      const chips = level.lessons
        .map(function (lesson) {
          return (
            '<li><a class="lesson-item ' + (isDone(lesson.id) ? "done" : "") +
            '" href="#/lesson/' + esc(lesson.id) + '">' +
            '<div class="top">' +
            '<span class="num">' + esc(lesson.id.split("-")[1]) + "</span>" +
            '<span class="title">' + esc(lesson.title) + "</span>" +
            '<span class="status">' + (isDone(lesson.id) ? "완료" : "시작") + "</span>" +
            "</div>" +
            '<div class="can-do">' + esc(lesson.can_do) + "</div>" +
            "</a></li>"
          );
        })
        .join("");

      return (
        '<section class="card" style="margin-bottom:14px">' +
        '<div class="row-between">' +
        "<h2>" + esc(level.emoji + " " + level.title) + "</h2>" +
        '<span class="muted">' + stats.done + "/" + stats.total + "</span>" +
        "</div>" +
        '<p class="muted" style="margin-top:6px">' + esc(level.goal) + "</p>" +
        '<div class="progress thin" style="margin-top:12px"><i style="width:' +
        percent(stats.done, stats.total) + '%"></i></div>' +
        '<ul class="lesson-list">' + chips + "</ul>" +
        "</section>"
      );
    })
    .join("");

  root.innerHTML =
    header() +
    '<main class="shell">' +
    '<section class="hello"><h1>커리큘럼</h1>' +
    '<p class="teacher-line">EBS 참고 6단계 · 24과 · ' + done + "/" + total + "과 완료</p></section>" +
    '<div style="margin-top:18px">' + cards + "</div>" +
    "</main>" +
    nav("learn");
}

function renderLevel(root, levelId) {
  const level = levelById(levelId);
  if (!level) {
    location.hash = "#/learn";
    return;
  }
  const stats = levelStats(level);

  const items = level.lessons
    .map(function (lesson, index) {
      const done = isDone(lesson.id);
      const position = positionOf(lesson.id);
      const units = unitsOf(lesson);
      let status = "시작";
      if (done) status = "완료";
      else if (position > 0) status = position + " / " + units;

      return (
        '<li><a class="lesson-item ' + (done ? "done" : "") + '" href="#/lesson/' + esc(lesson.id) + '">' +
        '<div class="top">' +
        '<span class="num">' + (index + 1) + "</span>" +
        '<span class="title">' + esc(lesson.title) + "</span>" +
        '<span class="status">' + esc(status) + "</span>" +
        "</div>" +
        '<div class="can-do">' + esc(lesson.can_do) + "</div>" +
        "</a></li>"
      );
    })
    .join("");

  root.innerHTML =
    header() +
    '<main class="shell">' +
    '<a class="muted small" href="#/learn">← 커리큘럼 전체</a>' +
    '<section class="level-hero">' +
    '<div class="emoji">' + esc(level.emoji) + "</div>" +
    "<h1>" + esc(level.title) + "</h1>" +
    "<p>" + esc(level.goal) + "</p>" +
    '<span class="ebs">참고: ' + esc(level.ebs) + "</span>" +
    "</section>" +
    '<div class="section-title"><h2>4과</h2><span class="muted">' +
    stats.done + "/" + stats.total + " 완료</span></div>" +
    '<ul class="lesson-list" style="margin-top:0">' + items + "</ul>" +
    "</main>" +
    nav("learn");
}
