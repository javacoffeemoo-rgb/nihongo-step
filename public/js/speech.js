// 음성: TTS(듣기) + 3초 녹음(A/B 비교)
const RATE_KEY = "nihongo.rate";

let voices = [];
let currentAudio = null;

function refreshVoices() {
  if (!("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices() || [];
}

if ("speechSynthesis" in window) {
  refreshVoices();
  if (typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  } else {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

export function ttsSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function japaneseVoice() {
  if (!voices.length) refreshVoices();
  return (
    voices.find(function (voice) {
      return /^ja[-_]?/i.test(voice.lang || "");
    }) || null
  );
}

export function hasJapaneseVoice() {
  return !!japaneseVoice();
}

export function speak(text, rate) {
  if (!ttsSupported() || !text) return false;
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = rate || savedRate();
  const voice = japaneseVoice();
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export function savedRate() {
  try {
    const value = parseFloat(localStorage.getItem(RATE_KEY) || "");
    return isNaN(value) ? 0.8 : value;
  } catch (e) {
    return 0.8;
  }
}

export function saveRate(value) {
  try {
    localStorage.setItem(RATE_KEY, String(value));
  } catch (e) {
    /* ignore */
  }
}

// ------------------------------------------------------------- 녹음

export function recordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

export async function record(ms, onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  let recorder;

  try {
    recorder = new MediaRecorder(stream);
  } catch (e) {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
    throw new Error("이 브라우저에서는 녹음을 지원하지 않아요.");
  }

  recorder.ondataavailable = function (event) {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  const finished = new Promise(function (resolve) {
    recorder.onstop = function () {
      resolve(new Blob(chunks, { type: (chunks[0] && chunks[0].type) || "audio/webm" }));
    };
  });

  recorder.start();
  const started = Date.now();

  await new Promise(function (resolve) {
    const tick = setInterval(function () {
      const left = Math.max(0, Math.ceil((ms - (Date.now() - started)) / 1000));
      if (onTick) onTick(left);
    }, 150);

    setTimeout(function () {
      clearInterval(tick);
      resolve();
    }, ms);
  });

  recorder.stop();
  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  return finished;
}

export function playBlob(blob) {
  stopBlob();
  const url = URL.createObjectURL(blob);
  currentAudio = new Audio(url);
  currentAudio.onended = function () {
    URL.revokeObjectURL(url);
    currentAudio = null;
  };
  currentAudio.play();
}

export function stopBlob() {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch (e) {
      /* ignore */
    }
    currentAudio = null;
  }
}
