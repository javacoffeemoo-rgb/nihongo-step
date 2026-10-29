// 서버 API 호출 모음
const JSON_HEADERS = { "Content-Type": "application/json" };
const USER_KEY = "nihongo.user";

export function savedUser() {
  try {
    return localStorage.getItem(USER_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function rememberUser(name) {
  try {
    if (name) localStorage.setItem(USER_KEY, name);
    else localStorage.removeItem(USER_KEY);
  } catch (e) {
    /* 저장소를 못 쓰는 브라우저는 무시 */
  }
}

async function request(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.error) || "요청을 처리하지 못했어요.";
    const error = new Error(message);
    error.code = data && data.code;
    throw error;
  }
  return data;
}

export function getContent() {
  return request("/api/content");
}

export function getProgress(user) {
  return request("/api/progress?user=" + encodeURIComponent(user));
}

export function saveProgress(user, progress) {
  return request("/api/progress", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ user: user, progress: progress }),
  });
}

export function resetProgress(user) {
  return request("/api/reset", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ user: user }),
  });
}
