// 하단 내비게이션 (홈 / 커리큘럼 / 복습 / 설정)
import { mistakeCount } from "../store.js";

export function nav(active) {
  const count = mistakeCount();
  const badge = count ? '<i class="nav-badge">' + (count > 99 ? "99+" : count) + "</i>" : "";
  return (
    '<nav class="bottom-nav">' +
    '<a href="#/" class="' + (active === "home" ? "on" : "") + '"><span>🏠</span>홈</a>' +
    '<a href="#/learn" class="' + (active === "learn" ? "on" : "") + '"><span>📘</span>커리큘럼</a>' +
    '<a href="#/review" class="' + (active === "review" ? "on" : "") + '"><span>🔁</span>복습' + badge + "</a>" +
    '<a href="#/settings" class="' + (active === "settings" ? "on" : "") + '"><span>⚙️</span>설정</a>' +
    "</nav>"
  );
}

export function saveBadge(state) {
  if (state.saveState === "error") {
    return '<span class="save-dot err">저장 안 됨</span>';
  }
  if (state.saveState === "saving") {
    return '<span class="save-dot">저장 중…</span>';
  }
  return '<span class="save-dot">서버에 저장됨</span>';
}
