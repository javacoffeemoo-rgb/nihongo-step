// 설정: 닉네임 · 선생님 · 하루 목표 · 데이터
import {
  state,
  signIn,
  persistNow,
  resetProgress,
  teacher,
  normalizeName,
} from "../store.js";
import { speak, ttsSupported, hasJapaneseVoice, japaneseVoice } from "../speech.js";
import { esc, toast } from "../ui.js";
import { nav } from "./nav.js";

const GOALS = [
  { value: 5, label: "가볍게 5분" },
  { value: 10, label: "제대로 10분" },
  { value: 20, label: "빡세게 20분" },
];

export function render(root) {
  paint(root);
}

function paint(root) {
  const p = state.progress;
  const t = teacher();
  const list = (state.content && state.content.teachers) || [];
  const goal = (p.profile && p.profile.dailyGoal) || 5;
  const voice = japaneseVoice();

  const teacherCards = list
    .map(function (item) {
      return (
        '<button class="choice wide ' + (t && t.id === item.id ? "on" : "") +
        '" data-teacher="' + esc(item.id) + '">' +
        '<span class="em">' + esc(item.emoji) + "</span>" +
        "<span>" + esc(item.ko_name) + " · " + esc(item.gender) +
        '<span class="sub">' + esc(item.tagline) + "</span></span></button>"
      );
    })
    .join("");

  const goalChips = GOALS.map(function (item) {
    return (
      '<button class="choice ' + (goal === item.value ? "on" : "") +
      '" data-goal="' + item.value + '">' + item.label + "</button>"
    );
  }).join("");

  const voiceNote = !ttsSupported()
    ? "이 브라우저는 음성 재생을 지원하지 않아요."
    : hasJapaneseVoice()
      ? "일본어 음성: " + voice.name
      : "일본어 음성이 설치되어 있지 않아요. 한글 발음으로 학습할 수 있어요.";

  root.innerHTML =
    '<header class="topbar"><div class="topbar-in">' +
    '<div class="brand">にほんご<span>STEP</span></div>' +
    '<a class="icon-btn" href="#/" aria-label="홈">✕</a>' +
    "</div></header>" +
    '<main class="shell">' +
    '<section class="hello"><h1>설정</h1>' +
    '<p class="teacher-line">학습 환경을 바꿀 수 있어요.</p></section>' +

    '<section class="card" style="margin-top:20px">' +
    "<h2>닉네임</h2>" +
    '<p class="muted" style="margin-top:6px">지금 <b>' + esc(p.user) + "</b>님의 진도를 보고 있어요.</p>" +
    '<div class="field"><label for="nickname">닉네임 바꾸기</label>' +
    '<input id="nickname" class="input" maxlength="20" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" value="' + esc(p.user) + '" />' +
    '<p class="notice">다른 닉네임을 입력하면 <b>그 닉네임의 진도</b>를 불러옵니다.</p></div>' +
    '<div class="btn-row"><button id="save-name" class="btn block">닉네임 적용</button></div>' +
    "</section>" +

    '<section class="card"><h2>선생님</h2>' +
    '<div class="choices" style="margin-top:12px;flex-direction:column">' + teacherCards + "</div>" +
    "</section>" +

    '<section class="card"><h2>하루 목표</h2>' +
    '<div class="choices" style="margin-top:12px">' + goalChips + "</div>" +
    "</section>" +

    '<section class="card"><h2>음성</h2>' +
    '<p class="muted" style="margin-top:6px">' + esc(voiceNote) + "</p>" +
    '<div class="btn-row"><button id="test-voice" class="btn block">🔊 발음 들어보기</button></div>' +
    "</section>" +

    '<section class="card"><h2>데이터</h2>' +
    '<p class="muted" style="margin-top:6px">진도는 서버의 <code>data/progress/</code> 폴더에 저장됩니다.</p>' +
    '<div class="btn-row"><button id="reset" class="btn danger block">진도 초기화</button></div>' +
    '<div class="btn-row"><a class="btn ghost block" href="/legacy">카톡 테스트 화면 열기</a></div>' +
    "</section>" +

    '<p class="muted center" style="margin-top:24px">' +
    "にほんご STEP · EBS 참고 6단계 24과 · 말하기 중심</p>" +
    "</main>" +
    nav("settings");

  root.querySelectorAll("[data-teacher]").forEach(function (button) {
    button.addEventListener("click", async function () {
      state.progress.profile.teacher = button.getAttribute("data-teacher");
      await persistNow();
      toast("선생님을 바꿨어요.");
      paint(root);
    });
  });

  root.querySelectorAll("[data-goal]").forEach(function (button) {
    button.addEventListener("click", async function () {
      state.progress.profile.dailyGoal = parseInt(button.getAttribute("data-goal"), 10);
      await persistNow();
      paint(root);
    });
  });

  const nameInput = root.querySelector("#nickname");
  root.querySelector("#save-name").addEventListener("click", async function () {
    const name = normalizeName(nameInput.value);
    if (!name) {
      toast("닉네임을 입력해주세요.");
      return;
    }
    if (name === state.user) {
      toast("지금과 같은 닉네임이에요.");
      return;
    }
    const ok = window.confirm(
      "'" + name + "' 닉네임의 진도를 불러옵니다.\n지금 진도는 '" + state.user + "' 이름으로 그대로 남아 있어요.\n계속할까요?"
    );
    if (!ok) return;
    try {
      const result = await signIn(name);
      toast(result.found ? "진도를 불러왔어요." : "새 닉네임으로 시작해요.");
      location.hash = "#/";
    } catch (error) {
      toast(error.message || "닉네임을 바꾸지 못했어요.");
    }
  });

  root.querySelector("#test-voice").addEventListener("click", function () {
    if (!ttsSupported()) {
      toast("이 브라우저는 음성 재생을 지원하지 않아요.");
      return;
    }
    speak("こんにちは。よろしく おねがいします。", 0.8);
  });

  root.querySelector("#reset").addEventListener("click", async function () {
    const ok = window.confirm(
      state.user + "님의 학습 진도를 모두 지웁니다.\n이 작업은 되돌릴 수 없어요. 계속할까요?"
    );
    if (!ok) return;
    try {
      await resetProgress();
      toast("진도를 초기화했어요.");
      paint(root);
    } catch (error) {
      toast(error.message || "초기화하지 못했어요.");
    }
  });
}
