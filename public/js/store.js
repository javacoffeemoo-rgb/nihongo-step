// 학습 상태 + 진도 관리
import * as api from "./api.js";

export const state = {
  content: null,
  progress: null,
  user: "",
  saveState: "idle", // idle | saving | saved | error
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return function () {
    listeners.delete(fn);
  };
}

function notify() {
  listeners.forEach(function (fn) {
    try {
      fn(state);
    } catch (e) {
      /* 화면 하나가 실패해도 나머지는 유지 */
    }
  });
}

export function normalizeName(name) {
  return (name || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
}

export function emptyProgress(user) {
  return {
    version: 1,
    user: user || "",
    profile: { teacher: "female", dailyGoal: 5 },
    lessons: {},
    positions: {},
    mistakes: [],
    streak: { lastDate: null, days: 0 },
    stats: { answers: 0, correct: 0, minutes: 0 },
    savedAt: null,
  };
}

function normalizeProgress(data) {
  const base = emptyProgress(data.user || state.user);
  return {
    version: 1,
    user: data.user || base.user,
    profile: Object.assign({}, base.profile, data.profile || {}),
    lessons: data.lessons || {},
    positions: data.positions || {},
    mistakes: Array.isArray(data.mistakes) ? data.mistakes : [],
    streak: Object.assign({}, base.streak, data.streak || {}),
    stats: Object.assign({}, base.stats, data.stats || {}),
    savedAt: data.savedAt || null,
  };
}

// ------------------------------------------------------------- 부팅 / 로그인

export async function boot() {
  state.content = await api.getContent();
  const name = api.savedUser();
  if (!name) return;
  const data = await api.getProgress(name);
  state.user = name;
  state.progress = data.found ? normalizeProgress(data) : emptyProgress(name);
  if (!data.found) await persistNow();
}

export async function signIn(name) {
  const clean = normalizeName(name);
  if (!clean) throw new Error("닉네임을 입력해주세요.");

  const data = await api.getProgress(clean);
  state.user = clean;
  state.progress = data.found ? normalizeProgress(data) : emptyProgress(clean);
  api.rememberUser(clean);
  notify();
  if (!data.found) await persistNow();
  return { found: !!data.found, progress: state.progress };
}

export function signOut() {
  state.user = "";
  state.progress = null;
  api.rememberUser("");
  notify();
}

// ------------------------------------------------------------- 콘텐츠 조회

export function levels() {
  return (state.content && state.content.curriculum.levels) || [];
}

export function levelById(id) {
  return levels().find(function (lv) {
    return lv.id === id;
  });
}

export function levelOfLesson(lessonId) {
  return (
    levels().find(function (lv) {
      return lv.lessons.some(function (lesson) {
        return lesson.id === lessonId;
      });
    }) || null
  );
}

export function flatLessons() {
  const out = [];
  levels().forEach(function (lv) {
    lv.lessons.forEach(function (lesson) {
      out.push(lesson);
    });
  });
  return out;
}

export function lessonById(id) {
  return flatLessons().find(function (lesson) {
    return lesson.id === id;
  });
}

export function scenarioById(id) {
  const list = (state.content && state.content.scenarios) || [];
  return list.find(function (sc) {
    return sc.id === id;
  });
}

export function kanaLessonByContentId(id) {
  return (state.content && state.content.kana.lessons[id]) || null;
}

export function readings() {
  return (state.content && state.content.kana.readings) || {};
}

export function teacher() {
  const list = (state.content && state.content.teachers) || [];
  const id = (state.progress && state.progress.profile.teacher) || "female";
  return list.find(function (t) {
    return t.id === id;
  }) || list[0] || null;
}

export function teacherLine(key, vars) {
  const t = teacher();
  const pool = (t && t[key]) || [];
  if (!pool.length) return "";
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/\{(\w+)\}/g, function (match, name) {
    return vars && vars[name] !== undefined ? String(vars[name]) : match;
  });
}

// ------------------------------------------------------------- 진도 계산

export const QUIZ_COUNT = 6;

export function isDone(lessonId) {
  const entry = state.progress && state.progress.lessons[lessonId];
  return !!(entry && entry.done);
}

export function lessonScore(lessonId) {
  return (state.progress && state.progress.lessons[lessonId]) || null;
}

export function positionOf(lessonId) {
  const value = (state.progress && state.progress.positions[lessonId]) || 0;
  return Math.max(0, value);
}

export function unitsOf(lesson) {
  if (!lesson) return 0;
  if (lesson.type === "kana") {
    const kana = kanaLessonByContentId(lesson.content);
    return (kana ? kana.groups.length : 0) + QUIZ_COUNT;
  }
  const sc = scenarioById(lesson.scenario);
  return (sc ? sc.steps.length : 0) + QUIZ_COUNT;
}

// 학습 화면 안에서 "문장 3 / 6" 처럼 지금 어느 단계인지 알려준다.
export function stageLabel(lesson) {
  const units = unitsOf(lesson);
  if (!units) return { text: "", ratio: 0 };
  const pos = Math.min(positionOf(lesson.id), units - 1);

  if (lesson.type === "kana") {
    const kana = kanaLessonByContentId(lesson.content);
    const groups = kana ? kana.groups.length : 0;
    const inQuiz = pos >= groups;
    return {
      text: inQuiz
        ? "퀴즈 " + (pos - groups + 1) + " / " + QUIZ_COUNT
        : "가나 " + (pos + 1) + " / " + groups,
      ratio: (pos + 1) / units,
    };
  }

  const sc = scenarioById(lesson.scenario);
  const steps = sc ? sc.steps.length : 0;
  const inQuiz = pos >= steps;
  return {
    text: inQuiz
      ? "퀴즈 " + (pos - steps + 1) + " / " + QUIZ_COUNT
      : "문장 " + (pos + 1) + " / " + steps,
    ratio: (pos + 1) / units,
  };
}

// 같은 과의 문장들 + 다른 상황 문장들 (퀴즈 오답 보기용)
export function allSteps() {
  const out = [];
  const scenarios = (state.content && state.content.scenarios) || [];
  scenarios.forEach(function (sc) {
    sc.steps.forEach(function (step) {
      out.push(step);
    });
  });
  return out;
}

export function findStepByJa(ja) {
  return (
    allSteps().find(function (step) {
      return step.ja === ja;
    }) || null
  );
}

export function levelStats(level) {
  const total = level.lessons.length;
  const done = level.lessons.filter(function (lesson) {
    return isDone(lesson.id);
  }).length;
  return { done: done, total: total };
}

export function completedCount() {
  return flatLessons().filter(function (lesson) {
    return isDone(lesson.id);
  }).length;
}

export function totalLessons() {
  return flatLessons().length;
}

export function nextLesson() {
  const all = flatLessons();
  for (let i = 0; i < all.length; i += 1) {
    if (!isDone(all[i].id) && positionOf(all[i].id) > 0) return all[i];
  }
  for (let i = 0; i < all.length; i += 1) {
    if (!isDone(all[i].id)) return all[i];
  }
  return null;
}

export function lessonAfter(lessonId) {
  const all = flatLessons();
  const index = all.findIndex(function (lesson) {
    return lesson.id === lessonId;
  });
  if (index < 0 || index + 1 >= all.length) return null;
  return all[index + 1];
}

// ------------------------------------------------------------- 날짜 / 연속일

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

function dateKey(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

export function todayStr() {
  return dateKey(new Date());
}

function yesterdayStr() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}

export function bumpStreak() {
  const p = state.progress;
  if (!p) return;
  const today = todayStr();
  const streak = p.streak || (p.streak = { lastDate: null, days: 0 });
  if (streak.lastDate === today) return;
  streak.days = streak.lastDate === yesterdayStr() ? (streak.days || 0) + 1 : 1;
  streak.lastDate = today;
}

// ------------------------------------------------------------- 진도 쓰기

export function setPosition(lessonId, index) {
  if (!state.progress) return;
  state.progress.positions[lessonId] = Math.max(0, index);
  persist();
}

export function clearPosition(lessonId) {
  if (!state.progress) return;
  delete state.progress.positions[lessonId];
}

export function markDone(lessonId, extra) {
  const p = state.progress;
  if (!p) return;
  const previous = p.lessons[lessonId] || {};
  p.lessons[lessonId] = Object.assign(
    { done: true, doneAt: new Date().toISOString() },
    previous,
    extra || {}
  );
  delete p.positions[lessonId];
  bumpStreak();
  persist();
}

export function recordAnswer(correct, mistake) {
  const p = state.progress;
  if (!p) return;
  p.stats.answers += 1;
  if (correct) p.stats.correct += 1;

  if (!correct && mistake) {
    const found = p.mistakes.find(function (item) {
      return item.lessonId === mistake.lessonId && item.unit === mistake.unit;
    });
    if (found) {
      found.count = (found.count || 1) + 1;
      found.lastAt = todayStr();
    } else {
      p.mistakes.push(
        Object.assign({ count: 1, lastAt: todayStr() }, mistake)
      );
    }
    if (p.mistakes.length > 300) p.mistakes = p.mistakes.slice(-300);
  }
  persist();
}

export function addMinutes(minutes) {
  if (!state.progress) return;
  if (minutes > 0) {
    state.progress.stats.minutes = (state.progress.stats.minutes || 0) + minutes;
  }
}

// ------------------------------------------------------------- 오답 노트

export function mistakes() {
  const list = (state.progress && state.progress.mistakes) || [];
  return list.slice().sort(function (a, b) {
    return (b.count || 0) - (a.count || 0);
  });
}

export function mistakeCount() {
  return ((state.progress && state.progress.mistakes) || []).length;
}

// 복습에서 맞히면 1씩 줄이고, 0이 되면 목록에서 사라진다.
export function reviewAnswer(item, correct) {
  const p = state.progress;
  if (!p) return;
  const index = p.mistakes.findIndex(function (entry) {
    return entry.lessonId === item.lessonId && entry.unit === item.unit;
  });

  p.stats.answers += 1;
  if (correct) p.stats.correct += 1;

  if (index >= 0) {
    const found = p.mistakes[index];
    if (correct) {
      found.count = (found.count || 1) - 1;
      if (found.count <= 0) p.mistakes.splice(index, 1);
    } else {
      found.count = (found.count || 1) + 1;
      found.lastAt = todayStr();
    }
  }
  persist();
}

// ------------------------------------------------------------- 단어장 · 통계

export function words() {
  return (state.content && state.content.words) || [];
}

export function wordCats() {
  const counts = {};
  words().forEach(function (word) {
    const key = word.cat || "기타";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map(function (key) {
    return { name: key, count: counts[key] };
  });
}

export function statsSummary() {
  const p = state.progress || {};
  const stats = p.stats || { answers: 0, correct: 0, minutes: 0 };
  const answers = stats.answers || 0;
  const correct = stats.correct || 0;
  return {
    streak: (p.streak && p.streak.days) || 0,
    done: completedCount(),
    total: totalLessons(),
    answers: answers,
    correct: correct,
    rate: answers ? Math.round((correct / answers) * 100) : null,
    minutes: stats.minutes || 0,
    mistakes: mistakeCount(),
  };
}

// 최근 7일 동안 완료한 과 수 (막대 그래프용)
export function weekActivity() {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  const counts = {};
  const lessons = (state.progress && state.progress.lessons) || {};

  Object.keys(lessons).forEach(function (id) {
    const entry = lessons[id];
    if (!entry || !entry.doneAt) return;
    const date = new Date(entry.doneAt);
    if (isNaN(date.getTime())) return;
    const key = dateKey(date);
    counts[key] = (counts[key] || 0) + 1;
  });

  const today = new Date();
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dateKey(date);
    out.push({
      key: key,
      label: labels[date.getDay()],
      count: counts[key] || 0,
      today: i === 0,
    });
  }
  return out;
}

// ------------------------------------------------------------- 저장 (디바운스)

let timer = null;

export function persist() {
  if (!state.user || !state.progress) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(function () {
    timer = null;
    persistNow();
  }, 1200);
}

export async function persistNow() {
  if (!state.user || !state.progress) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  state.saveState = "saving";
  notify();
  try {
    await api.saveProgress(state.user, state.progress);
    state.saveState = "saved";
  } catch (e) {
    state.saveState = "error";
  }
  notify();
}

export async function resetProgress() {
  if (!state.user) return;
  await api.resetProgress(state.user);
  state.progress = emptyProgress(state.user);
  state.saveState = "saved";
  notify();
  await persistNow();
}
