// 온보딩: 닉네임 -> 선생님 -> 하루 목표
import { signIn, state, persistNow, normalizeName } from "../store.js";
import { esc, toast, dots } from "../ui.js";

let step = 0;
let draft = { name: "", teacher: "female", dailyGoal: 5 };
let busy = false;

const GOALS = [
  { value: 5, label: "가볍게 5분", sub: "1과" },
  { value: 10, label: "제대로 10분", sub: "2과" },
  { value: 20, label: "빡세게 20분", sub: "4과" },
];

export function render(root) {
  step = 0;
  draft = { name: state.user || "", teacher: "female", dailyGoal: 5 };
  busy = false;
  paint(root);
}

function paint(root) {
  if (step === 0) return paintName(root);
  if (step === 1) return paintTeacher(root);
  return paintGoal(root);
}

function shell(inner, actions) {
  return (
    '<div class="onboarding">' +
    dots(step, 3) +
    '<div class="body">' + inner + "</div>" +
    '<div class="actions">' + actions + "</div>" +
    "</div>"
  );
}

function paintName(root) {
  root.innerHTML = shell(
    "<h1>닉네임을<br />알려주세요</h1>" +
      '<p class="lead">닉네임이 학습 진도를 저장하는 열쇠예요.<br />다른 기기에서도 같은 닉네임을 쓰면 이어서 할 수 있어요.</p>' +
      '<div class="field"><label for="nickname">닉네임</label>' +
      '<input id="nickname" class="input" maxlength="20" autocomplete="nickname" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="예: 준" value="' +
      esc(draft.name) +
      '" /></div>' +
      '<p class="notice">🔒 비밀번호는 없어요. 이름·전화번호 같은 개인정보 대신 <b>애칭</b>을 써주세요.</p>',
    '<button id="next" class="btn primary block">다음</button>'
  );

  const input = root.querySelector("#nickname");
  const next = root.querySelector("#next");
  input.focus();

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") next.click();
  });

  next.addEventListener("click", async function () {
    if (busy) return;
    const name = normalizeName(input.value);
    if (!name) {
      toast("닉네임을 입력해주세요.");
      input.focus();
      return;
    }
    busy = true;
    next.textContent = "확인 중…";
    try {
      const result = await signIn(name);
      draft.name = name;
      draft.teacher = (result.progress.profile && result.progress.profile.teacher) || "female";
      if (result.found) {
        toast(name + "님의 진도를 불러왔어요.");
        location.hash = "#/";
        return;
      }
      step = 1;
      busy = false;
      paint(root);
    } catch (error) {
      busy = false;
      next.textContent = "다음";
      toast(error.message || "닉네임을 확인하지 못했어요.");
    }
  });
}

function paintTeacher(root) {
  const list = (state.content && state.content.teachers) || [];
  const cards = list
    .map(function (t) {
      return (
        '<button class="choice wide ' +
        (draft.teacher === t.id ? "on" : "") +
        '" data-teacher="' + esc(t.id) + '">' +
        '<span class="em">' + esc(t.emoji) + "</span>" +
        "<span>" + esc(t.ko_name) + " · " + esc(t.gender) +
        '<span class="sub">' + esc(t.tagline) + "</span></span></button>"
      );
    })
    .join("");

  root.innerHTML = shell(
    "<h1>선생님을<br />골라주세요</h1>" +
      '<p class="lead">실력은 같고 <b>말투만</b> 달라요. 나중에 언제든 바꿀 수 있어요.</p>' +
      '<div class="choices" style="margin-top:24px;flex-direction:column">' + cards + "</div>",
    '<button id="next" class="btn primary block">다음</button>'
  );

  root.querySelectorAll("[data-teacher]").forEach(function (button) {
    button.addEventListener("click", function () {
      draft.teacher = button.getAttribute("data-teacher");
      paintTeacher(root);
    });
  });

  root.querySelector("#next").addEventListener("click", function () {
    step = 2;
    paint(root);
  });
}

function paintGoal(root) {
  const cards = GOALS.map(function (goal) {
    return (
      '<button class="choice wide ' +
      (draft.dailyGoal === goal.value ? "on" : "") +
      '" data-goal="' + goal.value + '">' +
      "<span>" + goal.label + '<span class="sub">' + goal.sub + "</span></span></button>"
    );
  }).join("");

  const list = (state.content && state.content.teachers) || [];
  const t =
    list.find(function (item) {
      return item.id === draft.teacher;
    }) || list[0];
  root.innerHTML = shell(
    "<h1>하루에<br />얼마나 할까요?</h1>" +
      '<p class="lead">' + esc(t ? t.emoji + " " + t.ko_name + "이 함께할게요." : "") +
      "<br />부담 없이 시작하고 나중에 바꿔도 괜찮아요.</p>" +
      '<div class="choices" style="margin-top:24px;flex-direction:column">' + cards + "</div>",
    '<button id="start" class="btn primary block">학습 시작하기</button>'
  );

  root.querySelectorAll("[data-goal]").forEach(function (button) {
    button.addEventListener("click", function () {
      draft.dailyGoal = parseInt(button.getAttribute("data-goal"), 10);
      paintGoal(root);
    });
  });

  root.querySelector("#start").addEventListener("click", async function () {
    if (busy) return;
    busy = true;
    const button = root.querySelector("#start");
    button.textContent = "준비 중…";
    try {
      state.progress.profile.teacher = draft.teacher;
      state.progress.profile.dailyGoal = draft.dailyGoal;
      await persistNow();
      location.hash = "#/";
    } catch (error) {
      busy = false;
      button.textContent = "학습 시작하기";
      toast("설정을 저장하지 못했어요. 다시 시도해주세요.");
    }
  });
}
