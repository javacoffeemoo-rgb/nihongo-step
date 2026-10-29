// 공통 UI 헬퍼
export function esc(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let toastTimer = null;

export function toast(message, duration) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    node.remove();
  }, duration || 2200);
}

export function percent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export function dots(step, total) {
  let html = "";
  for (let i = 0; i < total; i += 1) {
    html += '<i class="' + (i <= step ? "on" : "") + '"></i>';
  }
  return '<div class="dots">' + html + "</div>";
}

export function errorScreen(error) {
  return (
    '<div class="shell"><div class="card empty">' +
    "<h2>문제가 생겼어요</h2>" +
    '<p class="muted" style="margin-top:8px">' +
    esc(error && error.message ? error.message : "알 수 없는 오류") +
    "</p>" +
    '<p class="muted" style="margin-top:12px">서버가 실행 중인지 확인한 뒤 새로고침해주세요.</p>' +
    "</div></div>"
  );
}
