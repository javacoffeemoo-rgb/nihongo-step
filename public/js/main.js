// 앱 부트스트랩 + 해시 라우터
import { boot, state, persistNow } from "./store.js";
import { errorScreen } from "./ui.js";
import * as onboarding from "./views/onboarding.js";
import * as dashboard from "./views/dashboard.js";
import * as learn from "./views/learn.js";
import * as lesson from "./views/lesson.js";
import * as result from "./views/result.js";
import * as review from "./views/review.js";
import * as settings from "./views/settings.js";
import * as words from "./views/words.js";
import * as stats from "./views/stats.js";

const root = document.getElementById("app");

const routes = [
  { pattern: /^\/onboarding$/, view: onboarding, keys: [] },
  { pattern: /^\/$/, view: dashboard, keys: [] },
  { pattern: /^\/learn$/, view: learn, keys: [] },
  { pattern: /^\/learn\/([\w-]+)$/, view: learn, keys: ["levelId"] },
  { pattern: /^\/lesson\/([\w-]+)\/result$/, view: result, keys: ["lessonId"] },
  { pattern: /^\/lesson\/([\w-]+)$/, view: lesson, keys: ["lessonId"] },
  { pattern: /^\/review$/, view: review, keys: [] },
  { pattern: /^\/words$/, view: words, keys: [] },
  { pattern: /^\/stats$/, view: stats, keys: [] },
  { pattern: /^\/settings$/, view: settings, keys: [] },
];

let cleanup = null;

function currentPath() {
  const hash = location.hash || "#/";
  return hash.slice(1) || "/";
}

function render() {
  if (cleanup) {
    try {
      cleanup();
    } catch (error) {
      /* 이전 화면 정리 실패는 무시 */
    }
    cleanup = null;
  }

  const path = currentPath();
  let matched = null;
  for (let i = 0; i < routes.length; i += 1) {
    const result = path.match(routes[i].pattern);
    if (result) {
      matched = { route: routes[i], result: result };
      break;
    }
  }

  if (!matched) {
    location.replace("#/");
    return;
  }

  if (!state.user && matched.route.view !== onboarding) {
    location.replace("#/onboarding");
    return;
  }

  const params = {};
  matched.route.keys.forEach(function (key, index) {
    params[key] = matched.result[index + 1];
  });

  root.innerHTML = "";
  try {
    cleanup = matched.route.view.render(root, params) || null;
  } catch (error) {
    root.innerHTML = errorScreen(error);
    cleanup = null;
  }
  window.scrollTo(0, 0);
}

async function start() {
  root.innerHTML = '<div class="boot">불러오는 중…</div>';
  try {
    await boot();
  } catch (error) {
    root.innerHTML = errorScreen(error);
    return;
  }

  window.addEventListener("hashchange", render);

  if (!state.user) {
    if (currentPath() !== "/onboarding") {
      location.replace("#/onboarding");
      return;
    }
    render();
    return;
  }
  render();
}

// 화면을 떠나기 직전 마지막 저장 (디바운스 유실 방지)
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") persistNow();
});

window.addEventListener("pagehide", function () {
  if (!state.user || !state.progress) return;
  try {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: state.user, progress: state.progress }),
      keepalive: true,
    });
  } catch (error) {
    /* 무시 */
  }
});

start();

// 홈 화면에 추가(안드로이드 PWA) + 오프라인에서도 앱 껍데기 로드
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {
      /* http(비보안) 환경이나 미지원 브라우저는 그냥 넘어감 */
    });
  });
}
